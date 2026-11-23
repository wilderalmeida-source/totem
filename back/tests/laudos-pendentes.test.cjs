const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

const linha = (over) => ({ cd_exame: 1, cd_atendimento: 10, cd_paciente: 5, data: '2026-11-19', data_exame: '2026-11-19', realizado: null,
  finalizado: false, assinado: null, prazo: '2026-11-19 16:00', prazo_recalculado: false, horas: null, atraso_horas: 90,
  cd_medico: 1, cd_modalidade: 8, cd_convenio: 173, cd_procedimento: 589, tipo: 'laudo', cd_medico_origem: null, cd_exame_origem: null, ...over });

async function setup(t, rows, volume, minimoExames = 10) {
  const file = path.join(__dirname, '../src/routes/laudos.js');
  const realRequire = createRequire(file); const exports = {}; const sqls = [];
  const prisma = { $queryRaw: async (strings) => { const sql = strings.join('?'); sqls.push(sql);
    if (sql.includes('WITH cand')) return rows;
    if (sql.includes('GROUP BY 1, 2')) return volume;
    if (sql.includes('FROM pacientes')) return [{ id: 5, nome: 'JOSE CARLOS MOREIRA DOS SANTOS' }];
    return []; } };
  const cfg = { modalidadesExcluidas: [], medicosExcluidos: [], conveniosExcluidos: [], procedimentosExcluidos: [], procedimentosRevisao: [], procedimentosRetificacao: [], minimoExames };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { exports, require: n => n === '../../config/prismaDB' ? { prisma } : n === '../lib/config-analises' ? { lerConfigAnalise: async () => cfg } : realRequire(n) });
  const app = Fastify(); t.after(() => app.close()); await app.register(exports.laudosRoutes);
  const res = await app.inject('/clinux/dashboard/laudos?inicio=2026-08-26&fim=2026-11-23');
  return { body: res.json(), sqls };
}

test('pendente atrasado conta mesmo quando o medico tem menos laudos que o minimo', async t => {
  const rows = [
    linha({ cd_exame: 1 }),                                                             // pendente, medico 1 com poucos laudos
    linha({ cd_exame: 2, finalizado: true, assinado: '2026-11-10 10:00', atraso_horas: -5 }), // laudo do mesmo par: sai pelo minimo
    linha({ cd_exame: 3, cd_medico: 3, cd_modalidade: 3, finalizado: true, assinado: '2026-11-10 10:00', atraso_horas: -5 }),
  ];
  const { body } = await setup(t, rows, [{ cd_medico: 1, cd_modalidade: 8, n: 2n }, { cd_medico: 3, cd_modalidade: 3, n: 50n }]);
  const ids = body.linhas.map(l => l.id).sort();
  assert.equal(JSON.stringify(ids), JSON.stringify([1, 3]));
  assert.equal(body.foraPeloMinimo.exames, 1);
  const pendente = body.linhas.find(l => l.id === 1);
  assert.equal(pendente.finalizado, false);
  assert.ok(pendente.atrasoHoras > 0);
  assert.equal(body.nomes.pacientes[5], 'JOSE CARLOS MOREIRA DOS SANTOS'); // nome no lugar do ID na lista
});

test('pendente nao atrasado tambem traz o nome do paciente', async t => {
  const { body } = await setup(t, [linha({ cd_exame: 9, atraso_horas: -20 })], [], 0);
  assert.equal(body.nomes.pacientes[5], 'JOSE CARLOS MOREIRA DOS SANTOS');
});

test('pendentes de antes do inicio do periodo entram na consulta', async t => {
  const { sqls } = await setup(t, [], [], 0);
  const sql = sqls.find(s => s.includes('WITH cand'));
  assert.match(sql, /OR COALESCE\(e\.dt_laudo, e\.dt_assinado, e\.dt_publicado\) IS NULL\s/);
  // sn_laudar = "NAO laudar": so o true sai dos pendentes (RM com false precisa aparecer).
  assert.match(sql, /OR \(dt_laudo IS NULL AND sn_laudar IS DISTINCT FROM true AND dt_data < \(now\(\) AT TIME ZONE 'America\/Sao_Paulo'\)::date\)/); // exames de hoje fora
  assert.equal(/sn_laudar IS DISTINCT FROM false/.test(sql), false);
});
