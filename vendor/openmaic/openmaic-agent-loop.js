/**
 * OpenMAIC Agent Loop — pure-JS port of lib/chat/agent-loop.ts
 *
 * 前端驱动的多 agent loop 共享核心逻辑。
 * 原 TS 实现用于 use-chat-sessions hook 与 eval harness。
 *
 * 原实现通过 POST /api/chat 与无状态后端通信；
 * BioQuest 没有后端，因此此实现改为直接调用 LLM（OpenAI 兼容协议），
 * 让 loop 把多个 agent 的连续发言串成统一流。
 *
 * 关键设计：
 *   - 完全解耦 React：纯 async 函数 + 回调注入
 *   - 每个 iteration 拉一次 LLM，解析 SSE 事件，回调 onEvent
 *   - 退出条件：director 决定 END / CUE_USER / 达到 maxTurns
 *   - SSE 解析兼容：\n\n 分块 + 'data: ' 前缀
 */

(function (global) {
  'use strict';

  // ─── runAgentLoop ────────────────────────────────────────────────
  /**
   * @param {object} request — {
   *   config: { agentIds: string[], sessionType?: string, agentConfigs?: object[] },
   *   userProfile?: { nickname?: string, bio?: string },
   *   apiKey: string,
   *   baseUrl?: string,
   *   model?: string,
   *   providerType?: string,
   * }
   * @param {object} callbacks — {
   *   getStoreState(): { stage, scenes, currentSceneId, mode, whiteboardOpen },
   *   getMessages(): unknown[],
   *   fetchChat(body, signal): Promise<Response>,
   *   onEvent(event): void,
   *   onIterationEnd(): Promise<{directorState,totalAgents,agentHadContent,cueUserReceived}|null>,
   * }
   * @param {AbortSignal} signal
   * @param {number} maxTurns
   * @returns {Promise<{reason,directorState,turnCount}>}
   */
  async function runAgentLoop(request, callbacks, signal, maxTurns) {
    let directorState = undefined;
    let turnCount = 0;
    let consecutiveEmptyTurns = 0;

    while (turnCount < maxTurns) {
      if (signal.aborted) {
        return { reason: 'aborted', directorState, turnCount };
      }

      // 每次迭代刷新 store 状态（agent action 可能改变了 whiteboard/scene/mode）
      const freshStoreState = callbacks.getStoreState();
      const currentMessages = callbacks.getMessages();

      const body = {
        messages: currentMessages,
        storeState: freshStoreState,
        config: request.config,
        directorState: directorState,
        userProfile: request.userProfile,
        apiKey: request.apiKey,
        baseUrl: request.baseUrl,
        model: request.model,
        providerType: request.providerType,
      };

      let response;
      try {
        response = await callbacks.fetchChat(body, signal);
      } catch (err) {
        if (signal.aborted) {
          return { reason: 'aborted', directorState, turnCount };
        }
        throw err;
      }

      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch (e) {}
        throw new Error('API error: ' + response.status + ' - ' + errorText);
      }

      const reader = response.body && response.body.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let sseBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split('\n\n');
          sseBuffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6);
            if (json === '[DONE]') continue;
            try {
              const event = JSON.parse(json);
              callbacks.onEvent(event);
            } catch (e) {
              // 跳过格式不合法的事件（heartbeats 等）
            }
          }
        }
      } finally {
        try { reader.releaseLock(); } catch (e) {}
      }

      if (signal.aborted) {
        return { reason: 'aborted', directorState, turnCount };
      }

      // iteration 结束：等待 buffer drain（前端）或 收集结果（eval）
      const iterationResult = await callbacks.onIterationEnd();

      if (!iterationResult) {
        return { reason: 'no_done', directorState, turnCount };
      }

      directorState = iterationResult.directorState;
      turnCount = (directorState && directorState.turnCount) || (turnCount + 1);

      // director 说 USER — 退出 loop
      if (iterationResult.cueUserReceived) {
        return { reason: 'cue_user', directorState, turnCount };
      }

      // director 说 END — 没有 agent 发言
      if (iterationResult.totalAgents === 0) {
        return { reason: 'end', directorState, turnCount };
      }

      // 跟踪连续空响应
      if (!iterationResult.agentHadContent) {
        consecutiveEmptyTurns++;
        if (consecutiveEmptyTurns >= 2) {
          if (global.console && global.console.warn) {
            global.console.warn('[AgentLoop] ' + consecutiveEmptyTurns + ' consecutive empty agent responses, stopping loop');
          }
          return { reason: 'empty_turns', directorState, turnCount };
        }
      } else {
        consecutiveEmptyTurns = 0;
      }
    }

    if (turnCount >= maxTurns) {
      if (global.console && global.console.log) {
        global.console.log('[AgentLoop] Max turns (' + maxTurns + ') reached');
      }
    }
    return { reason: 'max_turns', directorState, turnCount };
  }

  // ─── 解析 SSE 事件（兼容多种命名风格）─────────────────────────────
  /**
   * 兼容 'data' | 'payload' 字段、'agent_start' | 'agentStart' 命名等。
   * 返回标准化后的 event。
   */
  function normalizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    // 字段重命名兼容
    if (raw.type === undefined && raw.event) raw.type = raw.event;
    if (raw.data === undefined && raw.payload) raw.data = raw.payload;
    return raw;
  }

  // ─── 导出 ────────────────────────────────────────────────────────
  const OpenMAICAgentLoop = {
    runAgentLoop,
    normalizeEvent,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMAICAgentLoop;
  } else {
    global.OpenMAICAgentLoop = OpenMAICAgentLoop;
  }
})(typeof window !== 'undefined' ? window : globalThis);
