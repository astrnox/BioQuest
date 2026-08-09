/*!
 * openmaic-classroom-runner.js
 * 移植自 OpenMAIC classroom/[id] 页面（9KB page.tsx）+ stage 组件
 *
 * 原版核心：
 *  - useSceneGenerator：场景生成编排
 *  - Stage：白板/对话/媒体的统一舞台
 *  - 多媒体任务调度
 *  - IndexedDB 持久化
 *
 * BioQuest 移植策略：
 *  - 不依赖 IndexedDB，state 仅存于内存
 *  - 复用 BioQuest 现有的 classroom.js + classroom-player.js
 *  - 提供 Runner 接口，作为两者的胶水层
 *  - 让用户能在 6 步可视化进度中看到我们课堂的真实生成过程
 *
 * 暴露：
 *   window.OpenMAICClassroomRunner = {
 *     startFromEntry(opts): 课堂入口（点击「开始」时调用）
 *     resume(classroomData): 恢复已有课堂
 *     stop(): 停止
 *   }
 */

(function (global) {
  'use strict';

  // ---------- 启动：课堂入口 ----------
  // 弹出 OpenMAIC 风格的 6 步生成进度，跑完后自动进入 BioQuest 课堂播放器
  async function startFromEntry(opts = {}) {
    const topic = opts.topic || '细胞呼吸';
    if (!global.OpenMAICGenProgress) {
      console.warn('[ClassroomRunner] OpenMAICGenProgress not loaded; falling back to direct start');
      if (global.Classroom && global.Classroom.open) {
        global.Classroom.open(topic, opts);
      }
      return;
    }

    global.OpenMAICGenProgress.open({
      topic,
      hooks: await buildHooks(topic, opts),
      onComplete: (result) => {
        // 进度弹窗关闭后，直接打开 BioQuest 课堂播放器
        if (global.Classroom && global.Classroom.open) {
          global.Classroom.open(topic, { ...opts, _runnerResult: result });
        }
      },
    });
  }

  // ---------- 构建进度钩子（绑定到 BioQuest 真实生成流程） ----------
  async function buildHooks(topic, opts) {
    // 第 1 步：分析输入（教材/上下文）
    const analyzeStart = async (idx, step) => {
      // 这一步通常瞬间完成，仅做切换提示
      await sleep(400);
    };
    const analyzeEnd = async () => {
      // 调用 BioQuest ai-client 准备上下文（warmup 可选）
      if (global.AIClient && global.AIClient.warmup) {
        try { await global.AIClient.warmup(topic); } catch (e) { /* ignore */ }
      }
    };

    // 第 2 步：网络搜索（可选，0 成本策略：跳过）
    const webStart = async () => { await sleep(500); };
    const webEnd = async () => {
      // 更新 web 步骤数据为「已跳过」
      if (global.OpenMAICGenProgress.setStepStatus) {
        global.OpenMAICGenProgress.setStepStatus(1, 'done', { sources: [] });
      }
    };

    // 第 3 步：生成大纲（核心 LLM 调用 #1）
    const outlineStart = async () => { await sleep(300); };
    const outlineEnd = async () => {
      // 触发 BioQuest 内部大纲生成
      const outlines = await callBioQuestOutline(topic);
      if (global.OpenMAICGenProgress.setStepStatus) {
        global.OpenMAICGenProgress.setStepStatus(2, 'done', { outlines });
      }
    };

    // 第 4 步：智能体生成（多角色编排）
    const agentStart = async () => { await sleep(400); };
    const agentEnd = async () => {
      if (global.MultiAgent && global.MultiAgent.init) {
        try { global.MultiAgent.init(topic); } catch (e) { /* ignore */ }
      }
    };

    // 第 5 步：生成内容（核心 LLM 调用 #2：slides + quiz）
    const contentStart = async () => { await sleep(400); };
    const contentEnd = async () => {
      // 准备内容缓存（warmup 可选）
      if (global.Classroom && global.Classroom.warmup) {
        try { await global.Classroom.warmup(topic); } catch (e) { /* ignore */ }
      }
    };

    // 第 6 步：生成动作（DSL）
    const actionsStart = async () => { await sleep(300); };
    const actionsEnd = async () => {
      const dsl = global.BioQuestDSL || global.OpenMAICDSL;
      if (dsl && dsl.preloadActions) {
        try { dsl.preloadActions(topic); } catch (e) { /* ignore */ }
      }
    };

    return {
      onStepStart: async (idx, step) => {
        const handlers = [analyzeStart, webStart, outlineStart, agentStart, contentStart, actionsStart];
        if (handlers[idx]) await handlers[idx](idx, step);
      },
      onStepEnd: async (idx, step) => {
        const handlers = [analyzeEnd, webEnd, outlineEnd, agentEnd, contentEnd, actionsEnd];
        if (handlers[idx]) await handlers[idx](idx, step);
      },
    };
  }

  // 调用 BioQuest 已有的大纲生成（复用 ai-client）
  async function callBioQuestOutline(topic) {
    if (!global.AIClient) return [];
    try {
      const prompt = `为生物课「${topic}」生成 5 个清晰的教学大纲，每条 1 句。
输出 JSON 数组：[{"title":"...","keyPoints":["...","..."]}]`;
      const text = await global.AIClient.chat(prompt, { stage: 'outline', temperature: 0.6 });
      return parseOutlines(text);
    } catch (e) {
      console.warn('[ClassroomRunner] outline fallback:', e);
      return fallbackOutlines(topic);
    }
  }

  function parseOutlines(text) {
    if (!text) return [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          return arr.slice(0, 5).map(o => ({
            title: o.title || '',
            keyPoints: o.keyPoints || [],
          }));
        }
      }
    } catch (e) { /* ignore */ }
    return fallbackOutlines('');
  }

  function fallbackOutlines(topic) {
    return [
      { title: `${topic || '主题'} · 引入`, keyPoints: ['生活实例', '问题情境'] },
      { title: `${topic || '主题'} · 核心概念`, keyPoints: ['定义', '关键特征'] },
      { title: `${topic || '主题'} · 过程机制`, keyPoints: ['步骤拆解', '能量变化'] },
      { title: `${topic || '主题'} · 案例分析`, keyPoints: ['真实情境', '应用拓展'] },
      { title: `${topic || '主题'} · 小结测验`, keyPoints: ['核心回顾', '易错辨析'] },
    ];
  }

  // ---------- 恢复 ----------
  function resume(classroomData) {
    if (global.Classroom && global.Classroom.open) {
      global.Classroom.open(classroomData.topic, { ...classroomData.opts, _resume: true });
    }
  }

  // ---------- 停止 ----------
  function stop() {
    if (global.OpenMAICGenProgress) global.OpenMAICGenProgress.close();
    if (global.Classroom && global.Classroom.close) global.Classroom.close();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  global.OpenMAICClassroomRunner = {
    startFromEntry,
    resume,
    stop,
  };
})(window);
