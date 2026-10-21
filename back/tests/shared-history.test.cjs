const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sharedHistory } = require('../src/lib/shared-history');
test('simultaneous devices share the same pending query and short snapshot', async () => {
  const read = sharedHistory(); let calls = 0, finish;
  const load = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const requests = [read(load), read(load), read(load)];
  await Promise.resolve(); assert.equal(calls, 1);
  finish({ senhas: [] });
  const values = await Promise.all(requests);
  assert.equal(values[0], values[2]);
  await read(load); assert.equal(calls, 1);
});
test('expired snapshots reload and rejected queries can be retried', async () => {
  const read = sharedHistory(0); let calls = 0;
  const load = async () => ++calls;
  assert.equal(await read(load), 1); assert.equal(await read(load), 2);
  await assert.rejects(read(async () => { throw Error('offline'); }));
  assert.equal(await read(load), 3);
});
