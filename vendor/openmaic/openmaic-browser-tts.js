/**
 * OpenMAIC Browser TTS Preview — pure-JS port of lib/audio/browser-tts-preview.ts
 *
 * 浏览器原生 speechSynthesis API 的小工具集：
 *   - ensureVoicesLoaded(): 等待 voiceschanged 事件（2s 超时回退）
 *   - resolveBrowserVoice(): 按 voiceURI / name / lang 匹配 voice
 *   - playBrowserTTSPreview(): 播放一段短预览，返回 { promise, cancel }
 *   - isBrowserTTSAbortError(): 判断 AbortError
 *
 * 行为与原 TS 实现完全一致，零依赖、纯前端。
 */

(function (global) {
  'use strict';

  const VOICES_LOAD_TIMEOUT_MS = 2000;
  const PREVIEW_TIMEOUT_MS = 30000;
  const CJK_LANG_THRESHOLD = 0.3;

  function createAbortError() {
    const err = new Error('Browser TTS preview canceled');
    err.name = 'AbortError';
    return err;
  }

  function inferPreviewLang(text) {
    if (!text) return 'en-US';
    const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const ratio = text.length > 0 ? cjkCount / text.length : 0;
    return ratio > CJK_LANG_THRESHOLD ? 'zh-CN' : 'en-US';
  }

  function isBrowserTTSAbortError(error) {
    return error instanceof Error && error.name === 'AbortError';
  }

  /**
   * 等待浏览器 voices 加载完成；2s 超时回退。
   * @returns {Promise<SpeechSynthesisVoice[]>}
   */
  async function ensureVoicesLoaded() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return [];
    }
    const initial = window.speechSynthesis.getVoices();
    if (initial.length > 0) return initial;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;

      const cleanup = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleChanged);
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      };
      const finish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(window.speechSynthesis.getVoices());
      };
      const handleChanged = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) finish();
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleChanged);
      timeoutId = window.setTimeout(finish, VOICES_LOAD_TIMEOUT_MS);
    });
  }

  /**
   * 按 voiceURI / name / lang 匹配 voice；未匹配则按 text 推断 lang。
   * @param {SpeechSynthesisVoice[]} voices
   * @param {string} voiceNameOrLang
   * @param {string} text
   * @returns {{ voice: SpeechSynthesisVoice|null, lang: string }}
   */
  function resolveBrowserVoice(voices, voiceNameOrLang, text) {
    const target = (voiceNameOrLang || '').trim();
    let matched = null;
    if (target && target !== 'default' && voices && voices.length) {
      matched = voices.find(
        (v) => v.voiceURI === target || v.name === target || v.lang === target,
      ) || null;
    }
    return {
      voice: matched,
      lang: (matched && matched.lang) || inferPreviewLang(text),
    };
  }

  /**
   * 播放一段浏览器 TTS 预览。
   * @param {{text:string,voice?:string,rate?:number,voices?:SpeechSynthesisVoice[]}} options
   * @returns {{ promise: Promise<void>, cancel: () => void }}
   */
  function playBrowserTTSPreview(options) {
    const opts = options || {};
    const synth = (typeof window !== 'undefined') ? window.speechSynthesis : undefined;

    if (!synth) {
      return {
        promise: Promise.reject(new Error('Browser does not support Speech Synthesis API')),
        cancel: () => {},
      };
    }

    let settled = false;
    let started = false;
    let canceled = false;
    let timeoutId = null;
    let rejectPromise = null;

    const settleResolve = (resolve) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) { window.clearTimeout(timeoutId); timeoutId = null; }
      resolve();
    };
    const settleReject = (reject, reason) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) { window.clearTimeout(timeoutId); timeoutId = null; }
      reject(reason);
    };

    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;

      const startPlayback = async () => {
        try {
          const voices = opts.voices || (await ensureVoicesLoaded());
          if (canceled) { settleReject(reject, createAbortError()); return; }
          if (!voices || voices.length === 0) {
            settleReject(reject, new Error('No browser TTS voices available'));
            return;
          }

          const u = new SpeechSynthesisUtterance(opts.text);
          u.rate = (typeof opts.rate === 'number') ? opts.rate : 1;
          const { voice, lang } = resolveBrowserVoice(voices, opts.voice || '', opts.text);
          if (voice) u.voice = voice;
          u.lang = lang;

          u.onstart = () => { started = true; };
          u.onend = () => {
            if (!started) {
              settleReject(reject, new Error('Browser TTS preview ended before playback started'));
              return;
            }
            settleResolve(resolve);
          };
          u.onerror = (ev) => {
            if (canceled || ev.error === 'canceled' || ev.error === 'interrupted') {
              settleReject(reject, createAbortError());
              return;
            }
            settleReject(reject, new Error(ev.error || 'TTS error'));
          };

          timeoutId = window.setTimeout(() => {
            synth.cancel();
            settleReject(reject, new Error('Browser TTS preview timed out'));
          }, PREVIEW_TIMEOUT_MS);

          synth.cancel();
          if (canceled) { settleReject(reject, createAbortError()); return; }
          synth.speak(u);
        } catch (err) {
          settleReject(reject, err);
        }
      };

      startPlayback();
    });

    const cancel = () => {
      if (settled || canceled) return;
      canceled = true;
      synth.cancel();
      if (rejectPromise) settleReject(rejectPromise, createAbortError());
    };

    return { promise, cancel };
  }

  const OpenMAICBrowserTTS = {
    ensureVoicesLoaded,
    resolveBrowserVoice,
    playBrowserTTSPreview,
    isBrowserTTSAbortError,
    inferPreviewLang,
    CJK_LANG_THRESHOLD,
    PREVIEW_TIMEOUT_MS,
    VOICES_LOAD_TIMEOUT_MS,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMAICBrowserTTS;
  } else {
    global.OpenMAICBrowserTTS = OpenMAICBrowserTTS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
