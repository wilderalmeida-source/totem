const { test } = require('node:test');
const assert = require('node:assert/strict');
const { auditQuery, auditExtraFilters } = require('../src/lib/audit-filters');
test('periodo invalido e pagina invalida sao rejeitados', () => {
  for (const input of [{ from: 'ontem' }, { from: '2026-09-12T10:00:00Z', to: '2026-09-11T10:00:00Z' }, { page: 0 }, { ticket: -1 }, { outcome: 'INVALIDO' }]) assert.equal(auditQuery.safeParse(input).success, false);
});
test('filtros se combinam sem sobrescrever resultado ou codigo', () => {
  const query = auditQuery.parse({ from: '2026-09-12T10:00:00-03:00', outcome: 'DESCONHECIDO', ticket: '123', page: '2' });
  const filters = auditExtraFilters(query);
  assert.equal(filters.length, 3);
  assert.equal(filters[0].createdAt.gte.toISOString(), '2026-09-12T13:00:00.000Z');
  assert.equal(filters[1].metadata.equals, 'DESCONHECIDO');
  assert.equal(filters[2].metadata.equals, 123);
  assert.equal(query.page, 2);
});
