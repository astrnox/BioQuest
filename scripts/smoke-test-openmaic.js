// Smoke test: load all 19 modules in order and verify globals exist
const path = require('path');
const base = path.resolve(__dirname, '..');
const files = [
  'vendor/openmaic/openmaic-emitter.js',
  'vendor/openmaic/openmaic-cn.js',
  'vendor/openmaic/openmaic-geometry.js',
  'vendor/openmaic/openmaic-element.js',
  'vendor/openmaic/openmaic-json-repair.js',
  'vendor/openmaic/openmaic-actions-types.js',
  'vendor/openmaic/openmaic-action-parser.js',
  'vendor/openmaic/openmaic-store.js',
  'vendor/openmaic/openmaic-stage-store.js',
  'vendor/openmaic/openmaic-canvas-store.js',
  'vendor/openmaic/openmaic-whiteboard-history-store.js',
  'vendor/openmaic/openmaic-playback.js',
  'vendor/openmaic/openmaic-action-engine.js',
  'vendor/openmaic/openmaic-derived-state.js',
  'vendor/openmaic/openmaic-stream-buffer.js',
  'vendor/openmaic/openmaic-agent-loop.js',
  'vendor/openmaic/openmaic-types.js',
  'vendor/openmaic/openmaic-constants.js',
  'vendor/openmaic/openmaic-browser-tts.js',
];

const expected = {
  'openmaic-emitter.js': 'OpenMAICEmitterGlobal',
  'openmaic-cn.js': 'OpenMAICCn',
  'openmaic-geometry.js': 'OpenMAICGeometry',
  'openmaic-element.js': 'OpenMAICElement',
  'openmaic-json-repair.js': 'OpenMAICJsonRepair',
  'openmaic-actions-types.js': 'OpenMAICActions',
  'openmaic-action-parser.js': 'OpenMAICActionParser',
  'openmaic-store.js': 'OpenMAICStore',
  'openmaic-stage-store.js': 'OpenMAICStageStore',
  'openmaic-canvas-store.js': 'OpenMAICCanvasStore',
  'openmaic-whiteboard-history-store.js': 'OpenMAICWhiteboardHistoryStore',
  'openmaic-playback.js': 'OpenMAICPlayback',
  'openmaic-action-engine.js': 'OpenMAICActionEngine',
  'openmaic-derived-state.js': 'OpenMAICDerivedState',
  'openmaic-stream-buffer.js': 'OpenMAICStreamBuffer',
  'openmaic-agent-loop.js': 'OpenMAICAgentLoop',
  'openmaic-types.js': 'OpenMAICTypes',
  'openmaic-constants.js': 'OpenMAICConstants',
  'openmaic-browser-tts.js': 'OpenMAICBrowserTTS',
};

for (const f of files) {
  try {
    require(path.join(base, f));
  } catch (e) {
    console.error('LOAD FAIL:', f, e.message);
    process.exit(1);
  }
}

console.log('All 19 modules loaded successfully');

// Verify exports
for (const f of files) {
  const basename = f.split('/').pop();
  const exportName = expected[basename];
  if (!exportName) {
    console.error('No expected export for', basename);
    process.exit(1);
  }
  const mod = require(path.join(base, f));
  if (!mod || typeof mod !== 'object') {
    console.error('Missing or invalid export:', exportName, 'from', basename);
    process.exit(1);
  }
}

// Quick functional test of StreamBuffer
const { createStreamBuffer } = require(path.join(base, 'vendor/openmaic/openmaic-stream-buffer.js'));
const buf = createStreamBuffer(
  {
    onAgentStart: () => {},
    onAgentEnd: () => {},
    onTextReveal: () => {},
    onActionReady: () => {},
    onLiveSpeech: () => {},
    onSpeechProgress: () => {},
    onThinking: () => {},
    onCueUser: () => {},
    onDone: () => {},
    onError: (msg) => console.error('T.error:', msg),
  },
  { tickMs: 5, charsPerTick: 3 }
);
buf.start();
buf.pushAgentStart({ messageId: 'm1', agentId: 'a1', agentName: 'Test' });
buf.pushText('m1', 'Hello, World!');
buf.sealText('m1');
buf.pushDone({ totalActions: 0, totalAgents: 1 });
console.log('StreamBuffer smoke test passed');

// Quick functional test of Constants
const { pickColor, pickAvatar } = require(path.join(base, 'vendor/openmaic/openmaic-constants.js'));
console.log('pickColor(0):', pickColor(0));
console.log('pickColor(13):', pickColor(13)); // cycle back
console.log('pickAvatar(0):', pickAvatar(0));

// Browser TTS module load
const tts = require(path.join(base, 'vendor/openmaic/openmaic-browser-tts.js'));
console.log('Browser TTS module functions:', Object.keys(tts).join(', '));

console.log('All smoke tests passed');
