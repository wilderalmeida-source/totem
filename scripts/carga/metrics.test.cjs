const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('./metrics.cjs');
test('separates HTTP errors, network failures and completed latency', () => {
  assert.deepEqual(summarize([{ kind: 'completed', status: 200, ms: 100 }, { kind: 'completed', status: 503, ms: 300 }, { kind: 'failed', ms: 5000 }]),
    { completed: 2, networkFailures: 1, httpErrors: 1, averageMs: 200, p95Ms: 300 });
  assert.equal(summarize([]).p95Ms, null);
});
