const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('each popup follows its own queued audio; TCP metadata and attention do not duplicate logos', async () => {
  const effects = [], shown = [], finished = [], audios = [], timers = new Map();
  let stream, timerId = 0;
  const tick = () => new Promise(resolve => setImmediate(resolve));
  class Audio {
    constructor(url) { this.url = url; this.events = {}; audios.push(this); }
    addEventListener(name, fn) { this.events[name] = fn; }
    play() { return Promise.resolve(); }
    pause() {}
    load() { this.events.canplaythrough?.(); }
  }
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../app/painel/[id]/page.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
    exports, Audio, Date, console, setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    window: { setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) },
    EventSource: class { constructor() { stream = this; } close() {} },
    require: name => name === 'react' ? { useState: initial => [initial, () => {}], useRef: current => ({ current }), useCallback: fn => fn, useEffect: fn => effects.push(fn) }
      : name === 'react/jsx-runtime' ? require(name)
      : name === 'next/navigation' ? { useParams: () => ({ id: '1' }) }
      : name.includes('usePartnerCall') ? { usePartnerCall: () => ({ view: null, show: call => shown.push(call.id), finish: id => finished.push(id) }) }
      : name.includes('panel-call') ? { parsePanelCall: value => value ?? null }
      : name.includes('audit-client') ? { auditTotem() {} } : () => null,
  });
  exports.default(); effects.forEach(fn => fn());
  const send = message => stream.onmessage({ data: JSON.stringify({ message: JSON.stringify({ painelId: 1, ...message }) }) });
  const call = id => ({ id, name: id, guicheNumero: '01', guicheNome: 'Guichê 01', recepcao: 'Recepção 1', calledAt: '10:00' });
  send({ type: 'tcp', data: 'raw', payload: { call: call('A'), followsAudio: true } });
  assert.equal(shown.length, 0);
  send({ type: 'tts:audio', payload: { call: call('A'), eventId: 'same-cache-key', ttsBody: { audioContent: 'a.mp3' } } });
  await tick();
  assert.deepEqual(shown, ['A']);
  send({ type: 'tts:audio', payload: { call: call('B'), eventId: 'same-cache-key', ttsBody: { audioContent: 'b.mp3' } } });
  assert.deepEqual(shown, ['A']);
  audios.at(-1).events.ended(); await tick();
  assert.deepEqual(finished, ['A']);
  timers.get(timerId)(); await tick();
  assert.deepEqual(shown, ['A', 'B']);
  audios.at(-1).events.ended(); await tick();
  send({ type: 'tts:audio', payload: { eventId: 'atencao', ttsBody: { audioContent: 'atencao.mp3' } } });
  await tick();
  assert.deepEqual(shown, ['A', 'B']);
  audios.at(-1).events.ended(); await tick();
  assert.deepEqual(finished, ['A', 'B']);
});
