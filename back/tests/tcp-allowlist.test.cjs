const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAllowedIps, tcpAllowed, normalizeIp } = require('../src/lib/tcp-allowlist.js');

test('TCP_ALLOWED_IPS vazio aceita todos (comportamento anterior)', () => {
  for (const raw of [undefined, '', '  ', '""']) {
    const allowed = parseAllowedIps(raw === '""' ? '' : raw);
    assert.equal(tcpAllowed('203.0.113.9', allowed), true);
  }
});

test('TCP_ALLOWED_IPS aceita so os IPs listados, inclusive na forma IPv6 do Node', () => {
  const allowed = parseAllowedIps(' 10.0.0.5, 10.0.0.6;192.168.1.20 ');
  assert.equal(tcpAllowed('10.0.0.5', allowed), true);
  assert.equal(tcpAllowed('::ffff:10.0.0.6', allowed), true);
  assert.equal(tcpAllowed('192.168.1.20', allowed), true);
  assert.equal(tcpAllowed('10.0.0.7', allowed), false);
  assert.equal(tcpAllowed(undefined, allowed), false);
  assert.equal(normalizeIp('::FFFF:10.0.0.5'), '10.0.0.5');
  assert.equal(normalizeIp('::1'), '::1');
});
