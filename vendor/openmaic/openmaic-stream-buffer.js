/**
 * OpenMAIC StreamBuffer — pure-JS port of lib/buffer/stream-buffer.ts
 *
 * 统一的多 agent 流式缓冲/呈现层。
 * 位于数据源（SSE / PlaybackEngine）与 UI 之间的固定 tick 节奏层。
 *
 * 关键不变量：
 *   - 单一节奏源（tick loop），不会出现双 typewriter 效果
 *   - pause() 是 O(1) 立即生效
 *   - action 仅在 tick 指针抵达时触发（位于其前置文本之后）
 *   - Roundtable 只见当前 speech 段（action / agent 切换时重置）
 *
 * 替代了 lib/buffer/stream-buffer.ts 的全部功能，但去除了 TypeScript 类型
 * 和 React 依赖，改造为纯 JS 模块单例风格。
 */

(function (global) {
  'use strict';

  // ─── Item 类型（JSDoc，仅作文档参考）────────────────────────────────
  //
  // 8 种 item 类型：
  //   - agent_start   标识当前发言的 agent 切换（清空 speech、清除 thinking）
  //   - agent_end     标识当前 agent 发言结束
  //   - text          文本增量；SSE 流式按字符追加；sealed=true 后 tick 可越过
  //   - action        行为（如 wb_draw_text / spotlight 等）
  //   - thinking      director / agent_loading 等加载状态
  //   - cue_user      邀请用户参与；触发 loop 退出
  //   - done          整个流结束；触发 drain promise
  //   - error         错误

  // ─── 默认配置 ──────────────────────────────────────────────────────
  const DEFAULT_TICK_MS = 30;
  const DEFAULT_CHARS_PER_TICK = 1;

  // ─── StreamBuffer 类 ──────────────────────────────────────────────
  class StreamBuffer {
    // 队列
    constructor() {
      this.items = [];
      this.readIndex = 0;
      this.charCursor = 0;

      // Roundtable 段跟踪
      this.currentSegmentText = '';
      this.currentAgentId = null;

      // 控制
      this._paused = false;
      this._disposed = false;
      this.timer = null;

      // dwell / delay 计数（以 tick 为单位）
      this._dwellTicksRemaining = 0;
      this._holdingForTTS = false;
      this._holdSegmentSnapshot = -1;

      // 配置
      this.tickMs = DEFAULT_TICK_MS;
      this.charsPerTick = DEFAULT_CHARS_PER_TICK;
      this.postTextDelayTicks = 0;
      this.actionDelayTicks = 0;
      this.cb = null;
      this.partCounter = 0;
      this._drainResolve = null;
      this._drainReject = null;
    }

    /**
     * 初始化回调与配置。必须在使用 buffer 前调用。
     * @param {object} callbacks
     * @param {object} [options]
     */
    init(callbacks, options) {
      this.cb = callbacks || {};
      this.tickMs = (options && options.tickMs) || DEFAULT_TICK_MS;
      this.charsPerTick = (options && options.charsPerTick) || DEFAULT_CHARS_PER_TICK;
      const postMs = (options && options.postTextDelayMs) || 0;
      const actMs = (options && options.actionDelayMs) || 0;
      this.postTextDelayTicks = Math.ceil(postMs / this.tickMs);
      this.actionDelayTicks = Math.ceil(actMs / this.tickMs);
    }

    // ─── Push 方法 ───────────────────────────────────────────────

    pushAgentStart(data) {
      if (this._disposed) return;
      this._sealLastText();
      this.items.push(Object.assign({ kind: 'agent_start' }, data));
    }

    pushAgentEnd(data) {
      if (this._disposed) return;
      this._sealLastText();
      this.items.push(Object.assign({ kind: 'agent_end' }, data));
    }

    /**
     * 追加 message 的文本 delta。
     * 若队列最后一项是同 messageId 的未 sealed text item，则就地追加；
     * 否则新建一个 text item。
     */
    pushText(messageId, delta, agentId) {
      if (this._disposed) return;
      const last = this.items[this.items.length - 1];
      if (last && last.kind === 'text' && last.messageId === messageId && !last.sealed) {
        last.text += delta;
      } else {
        this.items.push({
          kind: 'text',
          messageId,
          agentId: agentId || this.currentAgentId || '',
          partId: 'p' + (this.partCounter++),
          text: delta,
          sealed: false,
        });
      }
    }

    /** 标记当前（最后）的 text item 为 sealed，不再追加 */
    sealText(messageId) {
      if (this._disposed) return;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (it.kind === 'text' && it.messageId === messageId && !it.sealed) {
          it.sealed = true;
          break;
        }
      }
    }

    pushAction(data) {
      if (this._disposed) return;
      this._sealLastText();
      this.items.push(Object.assign({ kind: 'action' }, data));
    }

    pushThinking(data) {
      if (this._disposed) return;
      this.items.push(Object.assign({ kind: 'thinking' }, data));
    }

    pushCueUser(data) {
      if (this._disposed) return;
      this.items.push(Object.assign({ kind: 'cue_user' }, data));
    }

    pushDone(data) {
      if (this._disposed) return;
      this._sealLastText();
      this.items.push(Object.assign({ kind: 'done' }, data));
    }

    pushError(message) {
      if (this._disposed) return;
      this.items.push({ kind: 'error', message });
    }

    // ─── 控制 ─────────────────────────────────────────────────────

    /** 启动 tick 循环。幂等。 */
    start() {
      if (this._disposed || this.timer) return;
      this.timer = setInterval(() => this._tick(), this.tickMs);
    }

    /** 立即暂停 — tick 变成 no-op */
    pause() {
      this._paused = true;
    }

    /** 从中断点恢复 */
    resume() {
      this._paused = false;
    }

    /**
     * 返回 Promise：当 buffer 处理完所有 item（含最终 done）后 resolve。
     * 若已 disposed，立即 reject。
     * 暂停期间该 Promise 不会 resolve（设计如此）。
     */
    waitUntilDrained() {
      if (this._disposed) return Promise.reject(new Error('Buffer already disposed'));
      return new Promise((resolve, reject) => {
        this._drainResolve = resolve;
        this._drainReject = reject;
      });
    }

    get paused() { return this._paused; }
    get disposed() { return this._disposed; }
    get length() { return this.items.length; }
    get progress() { return { readIndex: this.readIndex, total: this.items.length }; }

    /**
     * Flush：立即 reveal 全部剩余内容。
     * 用于恢复持久化 session 或强制完成。
     */
    flush() {
      if (this._disposed) return;
      while (this.readIndex < this.items.length) {
        const item = this.items[this.readIndex];
        switch (item.kind) {
          case 'text':
            this.cb.onTextReveal(item.messageId, item.partId, item.text, true);
            this.currentSegmentText = item.text;
            this.cb.onLiveSpeech(this.currentSegmentText, this.currentAgentId);
            this.cb.onSpeechProgress(1);
            break;
          case 'action':
            this.currentSegmentText = '';
            this.cb.onActionReady(item.messageId, item);
            this.cb.onLiveSpeech(null, this.currentAgentId);
            break;
          case 'agent_start':
            this.currentAgentId = item.agentId;
            this.currentSegmentText = '';
            this.cb.onThinking(null);
            this.cb.onAgentStart(item);
            this.cb.onLiveSpeech(null, item.agentId);
            break;
          case 'agent_end':
            this.cb.onAgentEnd(item);
            break;
          case 'thinking':
            this.cb.onThinking(item);
            break;
          case 'cue_user':
            this.cb.onCueUser(item.fromAgentId, item.prompt);
            break;
          case 'done':
            this.cb.onLiveSpeech(null, null);
            this.cb.onSpeechProgress(null);
            this.cb.onThinking(null);
            this.cb.onDone(item);
            if (this._drainResolve) {
              this._drainResolve();
              this._drainResolve = null;
              this._drainReject = null;
            }
            break;
          case 'error':
            this.cb.onError(item.message);
            break;
        }
        this.readIndex++;
        this.charCursor = 0;
      }
    }

    /** 停止 tick 循环、释放资源。之后的 callback 不会再触发。 */
    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      if (this._drainReject) {
        this._drainReject(new Error('Buffer disposed'));
        this._drainResolve = null;
        this._drainReject = null;
      }
      this.cb.onLiveSpeech && this.cb.onLiveSpeech(null, null);
      this.cb.onSpeechProgress && this.cb.onSpeechProgress(null);
    }

    /**
     * 停止 tick 循环并标记 disposed，但不触发 onLiveSpeech 清空。
     * 用于替换 buffer 时避免 dispose callback 通过过时的微任务清除 roundtable。
     */
    shutdown() {
      if (this._disposed) return;
      this._disposed = true;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      if (this._drainReject) {
        this._drainReject(new Error('Buffer shutdown'));
        this._drainResolve = null;
        this._drainReject = null;
      }
    }

    // ─── 内部 ─────────────────────────────────────────────────────

    /** 密封队列中最后的 text item（若有） */
    _sealLastText() {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (it.kind === 'text' && !it.sealed) {
          it.sealed = true;
          // sealLastText() 在 pushAgentEnd/pushAgentStart 之前调用，
          // 所以 this.currentAgentId 仍指向被密封 text 的 agent
          if (this.cb && this.cb.onSegmentSealed) {
            this.cb.onSegmentSealed(it.messageId, it.partId, it.text, this.currentAgentId);
          }
          break;
        }
        // 遇到非 text item 即停止
        if (it.kind !== 'text') break;
      }
    }

    _tick() {
      if (this._paused || this._disposed) return;

      // honour dwell / action-delay 倒计时
      if (this._dwellTicksRemaining > 0) {
        this._dwellTicksRemaining--;
        if (this._dwellTicksRemaining === 0 && this._holdingForTTS) {
          // post-text delay 刚结束 — fall through 到 TTS hold 检查
        } else {
          return;
        }
      }

      // TTS hold：post-text delay 结束后保持 bubble 等待 TTS 播放
      if (this._holdingForTTS) {
        const result = this.cb.shouldHoldAfterReveal ? this.cb.shouldHoldAfterReveal() : false;
        if (result) {
          if (typeof result === 'object') {
            if (!result.holding) {
              this._holdingForTTS = false;
              this._holdSegmentSnapshot = -1;
              this._advanceNonText();
              return;
            }
            if (result.segmentDone !== this._holdSegmentSnapshot) {
              this._holdingForTTS = false;
              this._holdSegmentSnapshot = -1;
              this._advanceNonText();
              return;
            }
            return; // 同一段仍在播放 — 保持当前 item
          }
          return; // boolean 形式
        }
        this._holdingForTTS = false;
        this._holdSegmentSnapshot = -1;
        this._advanceNonText();
        return;
      }

      const item = this.items[this.readIndex];
      if (!item) return;

      switch (item.kind) {
        case 'text': {
          this.charCursor = Math.min(this.charCursor + this.charsPerTick, item.text.length);
          const revealed = item.text.slice(0, this.charCursor);
          const fullyRevealed = this.charCursor >= item.text.length;
          const isComplete = fullyRevealed && item.sealed;

          // 更新 chat 区域
          this.cb.onTextReveal(item.messageId, item.partId, revealed, isComplete);

          // 更新 roundtable（仅当前段）
          this.currentSegmentText = revealed;
          this.cb.onLiveSpeech(this.currentSegmentText, this.currentAgentId);
          this.cb.onSpeechProgress(item.text.length > 0 ? this.charCursor / item.text.length : 1);

          if (isComplete) {
            this.readIndex++;
            this.charCursor = 0;

            // post-text 固定 pause
            if (this.postTextDelayTicks > 0) {
              this._dwellTicksRemaining = this.postTextDelayTicks;
              if (this.cb.shouldHoldAfterReveal) {
                this._holdingForTTS = true;
                const snap = this.cb.shouldHoldAfterReveal();
                this._holdSegmentSnapshot = (snap && typeof snap === 'object') ? snap.segmentDone : -1;
              }
              return;
            }

            // 无 post-text delay — 立即检查 TTS hold
            const result = this.cb.shouldHoldAfterReveal ? this.cb.shouldHoldAfterReveal() : false;
            if (result) {
              this._holdingForTTS = true;
              this._holdSegmentSnapshot = (result && typeof result === 'object') ? result.segmentDone : -1;
              return;
            }

            // 在同一 tick 内继续推进（处理紧随其后的 action badge）
            this._advanceNonText();
          }
          // fullyRevealed 但未 sealed — 等待更多 SSE delta
          break;
        }

        case 'agent_start':
          this.currentAgentId = item.agentId;
          this.currentSegmentText = '';
          this.cb.onThinking(null);
          this.cb.onAgentStart(item);
          this.cb.onLiveSpeech(null, item.agentId);
          this.readIndex++;
          this.charCursor = 0;
          this._advanceNonText();
          break;

        case 'agent_end':
          this.cb.onAgentEnd(item);
          this.readIndex++;
          this.charCursor = 0;
          this._advanceNonText();
          break;

        case 'action':
          this.currentSegmentText = '';
          this.cb.onActionReady(item.messageId, item);
          this.cb.onLiveSpeech(null, this.currentAgentId);
          this.readIndex++;
          this.charCursor = 0;
          if (this.actionDelayTicks > 0) {
            this._dwellTicksRemaining = this.actionDelayTicks;
            return;
          }
          this._advanceNonText();
          break;

        case 'thinking':
          this.cb.onThinking(item);
          this.readIndex++;
          this.charCursor = 0;
          this._advanceNonText();
          break;

        case 'cue_user':
          this.cb.onCueUser(item.fromAgentId, item.prompt);
          this.readIndex++;
          this.charCursor = 0;
          this._advanceNonText();
          break;

        case 'done':
          this.cb.onLiveSpeech(null, null);
          this.cb.onSpeechProgress(null);
          this.cb.onThinking(null);
          this.cb.onDone(item);
          this.readIndex++;
          this.charCursor = 0;
          if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
          }
          if (this._drainResolve) {
            this._drainResolve();
            this._drainResolve = null;
            this._drainReject = null;
          }
          break;

        case 'error':
          this.cb.onError(item.message);
          this.readIndex++;
          this.charCursor = 0;
          this._advanceNonText();
          break;
      }
    }

    /**
     * 处理非 text item 后，在同一 tick 内继续推进连续的 非 text item。
     * 遇 text item 时停止（让下一 tick 处理字符级揭示）。
     * 遇 action 且配置了 actionDelay 时也会停止（让动画播放）。
     */
    _advanceNonText() {
      while (this.readIndex < this.items.length) {
        const next = this.items[this.readIndex];
        if (next.kind === 'text') break;

        switch (next.kind) {
          case 'agent_start':
            this.currentAgentId = next.agentId;
            this.currentSegmentText = '';
            this.cb.onThinking(null);
            this.cb.onAgentStart(next);
            this.cb.onLiveSpeech(null, next.agentId);
            break;
          case 'agent_end':
            this.cb.onAgentEnd(next);
            break;
          case 'action':
            this.currentSegmentText = '';
            this.cb.onActionReady(next.messageId, next);
            this.cb.onLiveSpeech(null, this.currentAgentId);
            this.readIndex++;
            this.charCursor = 0;
            if (this.actionDelayTicks > 0) {
              this._dwellTicksRemaining = this.actionDelayTicks;
              return;
            }
            continue;
          case 'thinking':
            this.cb.onThinking(next);
            break;
          case 'cue_user':
            this.cb.onCueUser(next.fromAgentId, next.prompt);
            break;
          case 'done':
            this.cb.onLiveSpeech(null, null);
            this.cb.onSpeechProgress(null);
            this.cb.onThinking(null);
            this.cb.onDone(next);
            this.readIndex++;
            this.charCursor = 0;
            if (this.timer) {
              clearInterval(this.timer);
              this.timer = null;
            }
            if (this._drainResolve) {
              this._drainResolve();
              this._drainResolve = null;
              this._drainReject = null;
            }
            return;
          case 'error':
            this.cb.onError(next.message);
            break;
        }
        this.readIndex++;
        this.charCursor = 0;
      }
    }
  }

  // ─── 工厂函数 ──────────────────────────────────────────────────────
  function createStreamBuffer(callbacks, options) {
    const buf = new StreamBuffer();
    buf.init(callbacks, options);
    return buf;
  }

  // ─── 导出 ──────────────────────────────────────────────────────────
  const OpenMAICStreamBuffer = {
    StreamBuffer,
    createStreamBuffer,
    DEFAULT_TICK_MS,
    DEFAULT_CHARS_PER_TICK,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMAICStreamBuffer;
  } else {
    global.OpenMAICStreamBuffer = OpenMAICStreamBuffer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
