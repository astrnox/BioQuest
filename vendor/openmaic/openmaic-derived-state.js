/**
 * ============================================================
 * OpenMAIC Derived State — 派生播放视图（移植自 lib/playback/derived-state.ts）
 * ------------------------------------------------------------
 * 纯函数：把 ~15 个原始状态变量归约为一个 PlaybackView。
 * 让 Stage、Roundtable 等组件用同一份逻辑判断「现在在干什么」。
 *
 * 用法：
 *   var view = OpenMAICDerivedState.computeView({
 *     engineMode: 'playing',
 *     lectureSpeech: '今天讲光合作用',
 *     ...
 *   });
 *   // view = { phase, sourceText, bubbleRole, activeRole, buttonState, ... }
 * ============================================================
 */
(function (global) {
  'use strict';

  // 7 个播放阶段
  var PHASES = ['idle', 'lecturePlaying', 'lecturePaused', 'waitingProactive', 'discussionActive', 'discussionPaused', 'cueUser', 'completed'];

  /**
   * @param {Object} raw - 原始状态
   * @param {string} raw.engineMode       - 'idle'|'playing'|'paused'|'live'
   * @param {string|null} raw.lectureSpeech
   * @param {string|null} raw.liveSpeech
   * @param {string|null} raw.speakingAgentId
   * @param {Object|null} raw.thinkingState
   * @param {boolean} raw.isCueUser
   * @param {boolean} raw.isTopicPending
   * @param {boolean} raw.chatIsStreaming
   * @param {Object|null} raw.discussionTrigger
   * @param {boolean} raw.playbackCompleted
   * @param {string|null} raw.idleText
   * @param {boolean} raw.speakingStudent
   * @param {string|null} raw.sessionType
   * @returns {Object} PlaybackView
   */
  function computeView(raw) {
    raw = raw || {};
    var engineMode = raw.engineMode || 'idle';
    var lectureSpeech = raw.lectureSpeech || null;
    var liveSpeech = raw.liveSpeech || null;
    var speakingAgentId = raw.speakingAgentId || null;
    var thinkingState = raw.thinkingState || null;
    var isCueUser = !!raw.isCueUser;
    var isTopicPending = !!raw.isTopicPending;
    var chatIsStreaming = !!raw.chatIsStreaming;
    var discussionTrigger = raw.discussionTrigger || null;
    var playbackCompleted = !!raw.playbackCompleted;
    var idleText = raw.idleText || null;
    var speakingStudent = !!raw.speakingStudent;
    var sessionType = raw.sessionType || null;

    // isInLiveFlow：含 sessionType 防止两轮间闪烁
    var isInLiveFlow = !!(speakingAgentId || thinkingState || chatIsStreaming || sessionType);

    // 阶段
    var phase;
    if (isCueUser) phase = 'cueUser';
    else if (isTopicPending) phase = 'discussionPaused';
    else if (speakingAgentId || thinkingState || chatIsStreaming || sessionType) phase = 'discussionActive';
    else if (discussionTrigger) phase = 'waitingProactive';
    else if (playbackCompleted) phase = 'completed';
    else if (engineMode === 'playing') phase = 'lecturePlaying';
    else if (engineMode === 'paused') phase = 'lecturePaused';
    else phase = 'idle';

    // 源文本
    var sourceText;
    if (liveSpeech) sourceText = liveSpeech;
    else if (isInLiveFlow) sourceText = '';
    else if (lectureSpeech) sourceText = lectureSpeech;
    else if (phase === 'completed') sourceText = '';
    else sourceText = idleText || '';

    var isBubbleLoading = !!(speakingAgentId && !liveSpeech);
    var isAgentLoading = !!(speakingStudent && !liveSpeech);

    // activeRole
    var activeRole;
    if (liveSpeech && speakingStudent) activeRole = 'agent';
    else if (liveSpeech) activeRole = 'teacher';
    else if (isAgentLoading) activeRole = 'agent';
    else if (isBubbleLoading) activeRole = 'teacher';
    else if (isCueUser) activeRole = null;
    else if (lectureSpeech) activeRole = 'teacher';
    else activeRole = null;

    // bubbleRole
    var bubbleRole;
    if (liveSpeech && speakingStudent) bubbleRole = 'agent';
    else if (liveSpeech) bubbleRole = 'teacher';
    else if (isAgentLoading) bubbleRole = 'agent';
    else if (isBubbleLoading) bubbleRole = 'teacher';
    else if (isInLiveFlow) bubbleRole = null;
    else if (isCueUser) bubbleRole = null;
    else if (lectureSpeech || idleText) bubbleRole = 'teacher';
    else bubbleRole = null;

    // 按钮状态
    var buttonState;
    if (isTopicPending) buttonState = 'play';
    else if (phase === 'lecturePlaying' || phase === 'discussionActive') buttonState = 'bars';
    else if (phase === 'completed') buttonState = 'restart';
    else if (phase === 'idle' || phase === 'lecturePaused') buttonState = 'play';
    else buttonState = 'none';

    var isTopicActive = chatIsStreaming || isTopicPending || isCueUser || engineMode === 'live' || !!discussionTrigger;

    return {
      phase: phase,
      sourceText: sourceText,
      bubbleRole: bubbleRole,
      activeRole: activeRole,
      buttonState: buttonState,
      isInLiveFlow: isInLiveFlow,
      isTopicActive: isTopicActive,
    };
  }

  global.OpenMAICDerivedState = {
    PHASES: PHASES,
    computeView: computeView,
  };
})(typeof window !== 'undefined' ? window : globalThis);
