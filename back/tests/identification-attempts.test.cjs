const { test } = require('node:test');
const assert = require('node:assert/strict');
const { identificationAttempts } = require('../src/lib/identification-attempts');
test('contador expira e nunca fica negativo', () => {
  for (let i = 0; i < 5; i++) identificationAttempts('expiry-test', 'fail', 1000);
  assert.equal(identificationAttempts('expiry-test', 'read', 2000), 0);
  assert.equal(identificationAttempts('expiry-test', 'read', 601000), 3);
});
