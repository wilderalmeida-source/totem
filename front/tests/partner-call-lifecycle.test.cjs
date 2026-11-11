const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('popup stays through audio, stale timers cannot hide next call and cleanup cancels work', async () => {
  const timers = new Map(), effects = [], values = []; let nextId = 0;
  const settings = { enabled: true, displaySeconds: 10 };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../hooks/usePartnerCall.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, AbortController, AbortSignal,
    setTimeout: fn => { timers.set(++nextId, fn); return nextId; }, clearTimeout: id => timers.delete(id),
    fetch: async () => ({ ok: true, json: async () => settings }),
    require: name => name === 'react' ? { useState: initial => [initial, value => values.push(value)], useRef: current => ({ current }), useCallback: fn => fn, useEffect: fn => effects.push(fn) }
      : { choosePartnerLogo: config => config.enabled ? { id: 'logo' } : null },
  });
  const hook = exports.usePartnerCall(1);
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  hook.show({ id: 'first' }, true);
  assert.equal(values.at(-1).call.id, 'first');
  const timerCount = timers.size;
  hook.show({ id: 'first' }, true);
  assert.equal(timers.size, timerCount);
  hook.finish('first');
  const previousTimer = timers.get(nextId);
  hook.show({ id: 'second' }, true);
  previousTimer();
  assert.equal(values.at(-1).call.id, 'second');
  hook.finish('second'); timers.get(nextId)();
  assert.equal(values.at(-1), null);
  settings.enabled = false;
  hook.show({ id: 'third' }, false);
  assert.equal(values.at(-1), null);
  cleanup();
  const count = values.length;
  hook.show({ id: 'after-unmount' }, true);
  assert.equal(values.length, count);
});
