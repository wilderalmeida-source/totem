const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

async function setup(t, query = 'inicio=2026-11-01&fim=2026-11-24') {
  const file = path.join(__dirname, '../src/routes/financeiro-exames.js');
  const realRequire = createRequire(file); const mod = {}; const sqls = [];
  const fora = { cd_exame: 77, cd_atendimento: 2190941, cd_paciente: 5, data: '2026-11-10', cd_procedimento: 223, cd_modalidade: 7, cd_fornecedor: 173,
    valor: 12, convenio: 12, particular: 0, n: 40n, media: 480, desvio: 60, q1: 500, mediana: 500, q3: 500, total: 1n, impacto: -488 };
  const prisma = { $queryRaw: async (strings, ...vals) => {
    const sql = Array.isArray(strings) ? strings.join('?') : strings.strings.join('?'); sqls.push({ sql, vals });
    if (sql.includes('WITH base')) return [fora];
    if (sql.includes('AS grupos')) return [{ grupos: 12n, exames: 900n }];
    if (sql.includes('percentile_cont(0.5)')) return [{ id: 7, exames: 30n, atendimentos: 20n, valor: 10000, convenio: 8000, particular: 2000, atend_convenio: 16n, atend_particular: 4n, mediana: 300 }];
    if (sql.includes('COUNT(DISTINCT e.cd_atendimento) AS atendimentos, SUM')) return [{ id: 7, atendimentos: 25n, valor: 10000 }];
    if (sql.includes('FROM pacientes')) return [{ id: 5, nome: 'JOSE CARLOS MOREIRA' }];
    if (sql.includes('FROM modalidades')) return [{ id: 7, nome: 'RESSONANCIA' }];
    if (sql.includes('FROM procedimentos')) return [{ id: 223, nome: 'RM PROSTATA' }];
    if (sql.includes('FROM fornecedores')) return [{ id: 173, nome: 'UNIMED' }];
    return []; } };
  const fat = { exames: { strings: ['exames e'] }, onde: () => ({ strings: ['1=1'] }), num: v => (v === null || v === undefined ? 0 : Number(v)) };
  const Prisma = { sql: (strings, ...vals) => ({ strings, vals }), empty: { strings: [''] } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { exports: mod, require: n => n === '../../config/prismaDB' ? { prisma } : n === './faturamento' ? fat : n.includes('generated/prisma/client') ? { Prisma } : realRequire(n) });
  const app = Fastify(); t.after(() => app.close()); await app.register(mod.financeiroExamesRoutes);
  const res = await app.inject(`/clinux/financeiro/exames?${query}`);
  return { res, body: res.json(), sqls };
}

test('exame fora do padrao traz paciente, atendimento e as estatisticas do grupo', async t => {
  const { body } = await setup(t);
  const i = body.foraDoPadrao.itens[0];
  assert.equal(i.cdAtendimento, 2190941);
  assert.equal(body.nomes.pacientes[5], 'JOSE CARLOS MOREIRA');
  assert.equal(JSON.stringify(i.grupo), JSON.stringify({ exames: 40, media: 480, desvio: 60, q1: 500, mediana: 500, q3: 500 }));
  assert.equal(body.foraDoPadrao.gruposAnalisados, 12);
  assert.equal(body.ticket[0].atendimentos, 20);
  assert.equal(JSON.stringify(body.ticket[0].anterior), JSON.stringify({ atendimentos: 25, valor: 10000 }));
});

test('compara pelo mesmo procedimento e convenio, com minimo de exames e diferenca minima', async t => {
  const { sqls } = await setup(t, 'inicio=2026-11-01&fim=2026-11-24&rigor=extremo');
  const q = sqls.find(s => s.sql.includes('WITH base'));
  assert.match(q.sql, /GROUP BY 1, 2 HAVING COUNT\(\*\) >= \?/);
  assert.match(q.sql, /s\.cd_fornecedor IS NOT DISTINCT FROM b\.cd_fornecedor/);
  assert.match(q.sql, /GREATEST\(1, ABS\(s\.mediana\) \* 0\.05\)/);
  assert.ok(q.vals.includes(3), 'rigor extremo usa 3 x IQR');
});

test('periodo invalido e recusado', async t => {
  const { res } = await setup(t, 'inicio=2026-11-24&fim=2026-11-01');
  assert.equal(res.statusCode, 400);
});
