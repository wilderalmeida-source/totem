const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function issue(rows, selected) {
  const exports = {};
  const calls = [];
  const prisma = {
    atendimentos: { findMany: async query => { calls.push(query); return rows; } },
    atendimentos_senhas: { create: async ({ data }) => data },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/senhas/gerar-senha-entrega.service.js'), 'utf8'), {
    exports, Date, process: { env: { IDMODALIDADE: '10000' } },
    require: name => name.includes('prismaDB') ? { prisma }
      : name.includes('flow-audit') ? { auditOperation: (_name, run) => run(), flowAudit: () => {} }
      : {
        getAgoraBrasil: () => new Date('2026-09-22T12:00:00Z'),
        novoAtendimentoTotem: async () => ({ cd_atendimento: 77, nr_controle: 77, salas: { cd_modalidade: 10000 } }),
        resolverIpPainelPorModalidade: async (_service, id) => `painel-${id}`,
        resolveModalidade: async id => `modalidade-${id}`,
      },
  });
  const result = await exports.gerarSenhaEntrega({ cd_paciente: 123, preferencial: 0, cd_modalidade: selected });
  return { result, calls };
}
test('modalidade escolhida prevalece sobre sala TOTEM, com ou sem atendimento anterior', async () => {
  for (const rows of [[], [{ cd_atendimento: 1, nr_controle: 1, salas: { cd_modalidade: 10000 } }]]) {
    const { result } = await issue(rows, 7);
    assert.equal(result.nr_modalidade, 7);
    assert.equal(result.ds_local, 'modalidade-7');
    assert.equal(result.ds_painel, 'painel-7');
    assert.equal(result.ds_fila, 'R');
  }
});
test('sem escolha explicita preserva exame real e ignora controle TOTEM quando ha outra modalidade', async () => {
  const { result, calls } = await issue([
    { cd_atendimento: 1, nr_controle: 1, salas: { cd_modalidade: 10000 } },
    { cd_atendimento: 2, nr_controle: 222, salas: { cd_modalidade: 8 } },
  ]);
  assert.equal(result.nr_controle, 222);
  assert.equal(result.nr_modalidade, 8);
  // Janela de 6 meses (commit "Log e resultados seis meses"): 22/09 -> 22/03.
  assert.equal(calls[0].where.dt_data.gte.toISOString(), '2026-03-22T00:00:00.000Z');
});
test('exame ja entregue (status 6) tambem gera senha pelo NR controle', async () => {
  const { result, calls } = await issue([{ cd_atendimento: 3, nr_controle: 333, ds_status: 6, salas: { cd_modalidade: 8 } }]);
  assert.equal(JSON.stringify(calls[0].where.ds_status), JSON.stringify({ in: [5, 6] }));
  assert.equal(result.nr_controle, 333);
  assert.equal(result.nr_modalidade, 8);
});
test('status 5 tem preferencia sobre status 6 mais recente', async () => {
  const { result } = await issue([
    { cd_atendimento: 4, nr_controle: 444, ds_status: 6, salas: { cd_modalidade: 8 } },
    { cd_atendimento: 5, nr_controle: 555, ds_status: 5, salas: { cd_modalidade: 9 } },
  ]);
  assert.equal(result.nr_controle, 555);
  assert.equal(result.nr_modalidade, 9);
});
