const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

async function setup(t, file, exportName, result = [], eligible = null, env = {}) {
  const calls = [];
  const diagnostics = [];
  const findMany = async args => { calls.push(args); return result; };
  const prisma = { pacientes: { findMany }, atendimentos: { findMany, findFirst: async args => { calls.push(args); return eligible; } } };
  const filename = path.join(__dirname, '../src/routes', file);
  const realRequire = createRequire(filename);
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports, require: name => name === '../lib/flow-audit' ? { flowAudit: () => {} } : name === '../../config/prismaDB' ? { prisma } : name === '../lib/patient-diagnostics' ? { describePatientInput: value => value, patientDiagnostic: (id, metadata) => diagnostics.push(metadata) } : realRequire(name),
    console, process: { env: { IDMODALIDADE: '10000', ...env } }, Date,
  });
  const app = Fastify();
  t.after(() => app.close());
  await app.register(exports[exportName]);
  return { calls, diagnostics, get: (route, query, headers = {}) => app.inject({ url: route + '?' + new URLSearchParams(query), headers }) };
}

test('pacientes rejeita filtros ausentes, parciais, curtos, misturados e datas impossíveis sem consultar banco', async t => {
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute');
  for (const query of [{}, { tipo: 'ID' }, { tipo: 'DATA' }, { tipo: 'NOME' },
    { tipo: 'INVALIDO' }, { ds_paciente: 'A' }, { ds_paciente: 'MARIA' },
    { ds_cpf: '123' }, { cd_paciente: '12abc' }, { cd_paciente: '-1' },
    { dt_nascimento: '2024-02-30' }, { tipo: 'ID', ds_cpf: '12345678901' },
    { tipo: 'NOMEDATA', ds_paciente: 'ANA' },
    { cd_paciente: '1', tipo: 'ID', ds_cpf: '12345678901', dt_nascimento: '1980-01-01' }]) {
    const response = await get('/clinux/pacientes', query);
    assert.equal(response.statusCode, 400, JSON.stringify(query));
  }
  assert.equal(calls.length, 0);
});

test('confirma CPF e nome com nascimento; preserva QR e pesquisa por nome', async t => {
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute');
  for (const query of [
    { tipo: 'ID', ds_cpf: '12345678901', dt_nascimento: '1980-01-01T03:00:00.000Z' },
    { tipo: 'NOMEDATA', ds_paciente: 'ANA', dt_nascimento: '1980-01-01' },
    { cd_paciente: '123' }, { ds_paciente: 'CARLOS' },
  ]) assert.equal((await get('/clinux/pacientes', query)).statusCode, 200);
  assert.equal(calls[0].where.ds_cpf, '12345678901');
  assert.equal(calls[0].where.dt_nascimento.toISOString(), '1980-01-01T00:00:00.000Z');
  assert.equal(calls[1].where.ds_paciente.contains, 'ANA');
  assert.equal(calls[1].where.dt_nascimento.toISOString(), '1980-01-01T00:00:00.000Z');
  assert.equal(calls[2].where.cd_paciente, 123);
  assert.equal(calls[3].where.ds_paciente.startsWith, 'CARLOS');
  assert.deepEqual(calls.map(call => call.take), [2, 101, 1, 101]);
  assert.equal(calls[0].orderBy, undefined);
  assert.equal(calls[2].orderBy, undefined);
});

test('mantém as dez opções de nascimento na confirmação por CPF', async t => {
  const { get } = await setup(t, 'pacientes.js', 'pacientesRoute', [{ dt_nascimento: new Date('1980-01-01') }]);
  const response = await get('/clinux/pacientes', { tipo: 'MASK', ds_cpf: '12345678901' });
  const rows = response.json();
  assert.equal(rows.length, 10);
  assert.ok(rows.some(row => row.dt_nascimento === '1980-01-01T00:00:00.000Z'));
  assert.ok(rows.every(row => Object.keys(row).join() === 'dt_nascimento'));
});

test('busca ampla não devolve lista truncada; reset não consulta o banco', async t => {
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute', Array(101).fill({ ds_paciente: 'TESTE' }));
  const response = await get('/clinux/pacientes', { ds_paciente: 'CARLOS' });
  assert.equal(response.statusCode, 422);
  assert.match(response.json().error, /refinar/);
  assert.equal((await get('/clinux/pacientes', { tipo: 'RESET', ds_paciente: 'RE' })).statusCode, 200);
  assert.equal(calls.length, 1);
});

test('DATA preserva ate 100 pacientes sem enviar distinct vazio ao Prisma', async t => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ cd_paciente: i + 1, ds_paciente: `TESTE ${i}`, dt_nascimento: new Date('1980-01-01') }));
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute', rows);
  const response = await get('/clinux/pacientes', { tipo: 'DATA', dt_nascimento: '1980-01-01T00:00:00.000Z' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().length, 100);
  assert.equal(new Set(response.json().map(p => p.cd_paciente)).size, 100);
  assert.equal(Object.hasOwn(calls[0], 'distinct'), false);
  assert.equal(calls[0].take, 101);
});

test('nascimento inicial elimina repetições e refinamento por nome/data continua disponível', async t => {
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute');
  await get('/clinux/pacientes', { dt_nascimento: '1980-01-01' });
  assert.equal(calls[0].distinct, undefined);
  assert.equal(calls[0].orderBy, undefined);
  assert.equal(calls[0].take, 1);
  await get('/clinux/pacientes', { tipo: 'DATA', dt_nascimento: '1980-01-01', ds_paciente: 'ANA' });
  assert.equal(calls[1].where.ds_paciente.contains, 'ANA');
  assert.equal(calls[1].select.cd_paciente, true);
  await get('/clinux/pacientes', { tipo: 'NOME', ds_paciente: 'ANA', dt_nascimento: '1980-01-01' });
  assert.equal(calls[2].where.dt_nascimento.toISOString(), '1980-01-01T00:00:00.000Z');
  assert.equal(calls[2].select.cd_paciente, undefined);
});

test('seleção por nascimento permite refinamento e retorna somente identificação', async t => {
  const { calls, get } = await setup(t, 'atendimentos-totem.js', 'atendimentosTotemRoute');
  assert.equal((await get('/clinux/totem/pacientes-com-exames', {})).statusCode, 400);
  assert.equal((await get('/clinux/totem/pacientes-com-exames', { dt_nascimento: '1980-01-01', ds_paciente: 'ANA' })).statusCode, 200);
  const query = calls[0];
  assert.equal(query.where.pacientes_atendimentos_cd_pacienteTopacientes.ds_paciente.contains, 'ANA');
  assert.equal(query.where.ds_status.in.join(), '2,3,7');
  assert.ok(query.where.exames.some);
  assert.equal(query.take, 101);
  assert.equal(query.select.exames, undefined);
  assert.equal(query.select.ds_observacao, undefined);
  assert.equal(Object.keys(query.select.pacientes_atendimentos_cd_pacienteTopacientes.select).sort().join(), 'cd_paciente,ds_paciente');
});

test('atendimentos do totem exigem paciente e não aceitam ampliação de período/status', async t => {
  const { calls, get } = await setup(t, 'atendimentos-totem.js', 'atendimentosTotemRoute');
  for (const query of [{}, { cd_paciente: '0' }, { dt_nascimento: '1980-01-01' },
    { cd_paciente: '1', data_inicial: '2000-01-01' }, { cd_paciente: '1', status: '1' }]) {
    assert.equal((await get('/clinux/totem/atendimentos', query)).statusCode, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await get('/clinux/totem/atendimentos', { cd_paciente: '123' })).statusCode, 200);
  assert.equal((await get('/clinux/totem/atendimentos', { cd_paciente: '123', tipo: 'entrega' })).statusCode, 200);
  assert.equal(calls[0].where.cd_paciente, 123);
  assert.equal(calls[0].where.dt_data.gte.getTime(), calls[0].where.dt_data.lte.getTime());
  assert.equal(calls[1].where.ds_status, 5);
  assert.equal(calls[1].take, 10);
  const expectedStart = new Date(calls[1].where.dt_data.lte);
  expectedStart.setUTCMonth(expectedStart.getUTCMonth() - 6);
  assert.equal(calls[1].where.dt_data.gte.getTime(), expectedStart.getTime());
  assert.equal(calls[0].select.ds_observacao, undefined);
  assert.equal(calls[0].select.pacientes_atendimentos_cd_pacienteTopacientes, undefined);
});

test('entrega pede modalidade sem exame real e consulta alem dos dez itens exibidos', async t => {
  for (const eligible of [null, { cd_atendimento: 99 }]) {
    const rows = Array.from({ length: 10 }, (_, i) => ({ cd_atendimento: i, salas: { cd_modalidade: 10000 } }));
    const { calls, get } = await setup(t, 'atendimentos-totem.js', 'atendimentosTotemRoute', rows, eligible);
    const response = await get('/clinux/totem/atendimentos', { cd_paciente: '123', tipo: 'entrega', contexto: 'true' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().requerSelecaoModalidade, !eligible);
    assert.equal(response.json().exames.length, 10);
    assert.equal(calls[1].where.cd_paciente, 123);
    assert.equal(calls[1].where.ds_status, 5);
    assert.equal(calls[1].where.nr_controle.not, null);
    assert.equal(calls[1].where.salas.cd_modalidade.not, 10000);
    assert.equal(calls[1].where.dt_data.gte.getTime(), calls[0].where.dt_data.gte.getTime());
  }
});

test('agenda geral valida intervalo e limita consulta', async t => {
  const { calls, get } = await setup(t, 'agenda.js', 'agendaRoute');
  for (const query of [{}, { data_inicial: '2026-01-01', data_final: '2026-12-31' },
    { data_inicial: '2026-02-01', data_final: '2026-01-01' },
    { data_inicial: '2026-02-30', data_final: '2026-03-01' }]) {
    assert.equal((await get('/clinux/agenda', query)).statusCode, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await get('/clinux/agenda', { data_inicial: '2026-09-09', data_final: '2026-09-09' })).statusCode, 200);
  assert.equal(calls[0].take, 1001);
});


test('nome completo ignora espacos nas pontas, rejeita nomes parciais e preserva datas aleatorias', async t => {
  const rows = [
    { cd_paciente: 1, ds_paciente: '  FULANO DA SILVA   ', dt_nascimento: new Date('1980-01-01') },
    { cd_paciente: 2, ds_paciente: 'FULANO DA SILVA JUNIOR', dt_nascimento: new Date('1980-01-01') },
    { cd_paciente: 3, ds_paciente: 'OUTRO FULANO DA SILVA', dt_nascimento: new Date('1980-01-01') },
  ];
  const { get, calls } = await setup(t, 'pacientes.js', 'pacientesRoute', rows);
  const confirmed = await get('/clinux/pacientes', { tipo: 'NOMEDATA', ds_paciente: ' fulano da silva ', dt_nascimento: '1980-01-01' });
  assert.equal(confirmed.statusCode, 200);
  assert.deepEqual(confirmed.json().map(p => p.cd_paciente), [1]);
  assert.equal(calls[0].where.dt_nascimento.toISOString(), '1980-01-01T00:00:00.000Z');
  const dates = (await get('/clinux/pacientes', { tipo: 'NOME', ds_paciente: 'FULANO DA SILVA' })).json();
  assert.equal(dates.length, 10);
  assert.ok(dates.some(p => p.dt_nascimento === '1980-01-01T00:00:00.000Z'));
  assert.ok(dates.every(p => Object.keys(p).join() === 'dt_nascimento'));
});


test('diagnostico registra entrada normalizacao e resposta sem CPF', async t => {
  const { get, diagnostics } = await setup(t, 'pacientes.js', 'pacientesRoute', [{ ds_paciente: ' ANA  ', dt_nascimento: new Date('1980-01-01') }]);
  await get('/clinux/pacientes', { tipo: 'NOMEDATA', ds_paciente: ' ANA ', dt_nascimento: '1980-01-01' });
  assert.equal(diagnostics[0].recebido.ds_paciente, ' ANA ');
  assert.equal(diagnostics[0].normalizado.ds_paciente, 'ANA');
  assert.equal(diagnostics[0].operacao, 'prisma.pacientes.findMany');
  assert.equal(diagnostics[0].retornados, 1);
  assert.equal(diagnostics[0].correspondenciasNomeCompleto, 1);
  await get('/clinux/pacientes', { tipo: 'NOMEDATA', ds_paciente: 'ANA', dt_nascimento: '1980-02-31' });
  assert.equal(diagnostics[1].prismaExecutado, false);
  assert.equal(diagnostics[1].validacaoCampos.nascimentoValido, false);
});


test('tres totens mantem tentativas independentes e reset nao afeta outro fluxo', async t => {
  const { get, calls } = await setup(t, 'pacientes.js', 'pacientesRoute');
  // Cada totem procura um paciente diferente; o mesmo paciente em vários totens é bloqueado pelo contador por alvo.
  const attempt = async flow => (await get('/clinux/pacientes', { tipo: 'NOMEDATA', ds_paciente: `PACIENTE ${flow}`, dt_nascimento: '1980-01-01' }, { 'x-flow-id': flow })).json()[0].tentativas;
  assert.equal(await attempt('attempt-a'), 2);
  assert.equal(await attempt('attempt-a'), 1);
  assert.equal(await attempt('attempt-b'), 2);
  assert.equal(await attempt('attempt-c'), 2);
  assert.equal(await attempt('attempt-a'), 0);
  const before = calls.length;
  assert.equal(await attempt('attempt-a'), 0);
  assert.equal(calls.length, before);
  await get('/clinux/pacientes', { tipo: 'RESET' }, { 'x-flow-id': 'attempt-a' });
  // RESET libera o fluxo para outro paciente, mas o paciente já errado 3 vezes continua bloqueado.
  assert.equal(await attempt('attempt-a'), 0);
  assert.equal((await get('/clinux/pacientes', { tipo: 'NOMEDATA', ds_paciente: 'OUTRO PACIENTE A', dt_nascimento: '1980-01-01' }, { 'x-flow-id': 'attempt-a' })).json()[0].tentativas, 2);
  assert.equal(await attempt('attempt-b'), 1);
});

test('datas falsas são as mesmas a cada busca, ordenadas e incluem a data real', async t => {
  const rows = [{ ds_paciente: 'FULANO DE TAL', dt_nascimento: new Date('1948-07-30') }];
  const { get } = await setup(t, 'pacientes.js', 'pacientesRoute', rows);
  const first = (await get('/clinux/pacientes', { tipo: 'NOME', ds_paciente: 'FULANO DE TAL' })).json();
  const second = (await get('/clinux/pacientes', { tipo: 'NOME', ds_paciente: '  fulano de tal ' })).json();
  assert.equal(first.length, 10);
  assert.deepEqual(second, first);
  assert.ok(first.some(row => row.dt_nascimento === '1948-07-30T00:00:00.000Z'));
  const values = first.map(row => row.dt_nascimento);
  assert.deepEqual([...values].sort(), values);
  assert.equal(new Set(values).size, 10);
  assert.ok(values.every(value => value >= '1930-01-01' && value < String(new Date().getUTCFullYear())));
  const other = (await get('/clinux/pacientes', { tipo: 'NOME', ds_paciente: 'CICLANO DE TAL' })).json();
  assert.notDeepEqual(other.filter(r => r.dt_nascimento !== '1948-07-30T00:00:00.000Z'), first.filter(r => r.dt_nascimento !== '1948-07-30T00:00:00.000Z'));
});

test('CPF e nome: trocar x-flow-id ou chamar RESET não renova tentativas do mesmo paciente', async t => {
  const { get, calls } = await setup(t, 'pacientes.js', 'pacientesRoute', []);
  const tentativas = async (query, flow) => (await get('/clinux/pacientes', query, { 'x-flow-id': flow })).json()[0].tentativas;
  const cpf = { tipo: 'ID', ds_cpf: '98765432100', dt_nascimento: '1980-01-01' };
  assert.deepEqual([await tentativas(cpf, 'c1'), await tentativas(cpf, 'c2'), await tentativas(cpf, 'c3')], [2, 1, 0]);
  await get('/clinux/pacientes', { tipo: 'RESET' }, { 'x-flow-id': 'c4' });
  const antes = calls.length;
  assert.equal(await tentativas(cpf, 'c4'), 0);
  assert.equal(calls.length, antes, 'bloqueado não consulta o banco');
  // Outro CPF no mesmo fluxo continua com o limite do fluxo.
  assert.equal(await tentativas({ ...cpf, ds_cpf: '11122233344' }, 'c5'), 2);

  const nome = { tipo: 'NOMEDATA', ds_paciente: 'BELTRANO TESTE', dt_nascimento: '1980-01-01' };
  assert.equal(await tentativas(nome, 'n1'), 2);
  assert.equal(await tentativas({ ...nome, ds_paciente: ' beltrano  teste ' }, 'n2'), 1);
  assert.equal(await tentativas(nome, 'n3'), 0);
  assert.equal(await tentativas(nome, 'n4'), 0);
});

test('QR paciente-atendimento: confere vínculo, validade e cancelamento; erro devolve lista vazia', async t => {
  const { qrGuardReset } = require('../src/lib/qr-guard');
  qrGuardReset();
  const paciente = { cd_paciente: 123, ds_paciente: 'ANA', dt_nascimento: new Date('1980-01-01') };
  const ok = await setup(t, 'pacientes.js', 'pacientesRoute', [], { pacientes_atendimentos_cd_pacienteTopacientes: paciente });
  const response = await ok.get('/clinux/pacientes', { tipo: 'QRATEND', cd_paciente: '123', cd_atendimento: '456789' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().map(p => p.cd_paciente), [123]);
  const where = ok.calls[0].where;
  assert.equal(where.cd_paciente, 123);
  assert.equal(where.cd_atendimento, 456789);
  assert.ok(where.dt_data.gte instanceof Date);
  const limite = new Date(); limite.setUTCMonth(limite.getUTCMonth() - 6);
  assert.ok(Math.abs(where.dt_data.gte - limite) < 3 * 86400000);
  assert.equal(JSON.stringify(where.OR), JSON.stringify([{ ds_status: null }, { ds_status: { not: 1 } }]));

  const nao = await setup(t, 'pacientes.js', 'pacientesRoute', [], null);
  assert.deepEqual((await nao.get('/clinux/pacientes', { tipo: 'QRATEND', cd_paciente: '123', cd_atendimento: '1' })).json(), []);
  for (const query of [{ tipo: 'QRATEND', cd_paciente: '123' }, { tipo: 'QRATEND', cd_paciente: '123', cd_atendimento: 'abc' }]) {
    assert.equal((await nao.get('/clinux/pacientes', query)).statusCode, 400);
  }
  qrGuardReset();
});

test('QR: 10 erros somando todos os totens bloqueiam a leitura por 5 minutos', async t => {
  const guard = require('../src/lib/qr-guard');
  guard.qrGuardReset();
  const { get, calls } = await setup(t, 'pacientes.js', 'pacientesRoute', [], null);
  for (let i = 0; i < 10; i++) {
    const r = await get('/clinux/pacientes', { tipo: 'QRATEND', cd_paciente: String(100 + i), cd_atendimento: '5' }, { 'x-flow-id': `totem-${i}` });
    assert.equal(r.statusCode, 200);
  }
  const antes = calls.length;
  const blocked = await get('/clinux/pacientes', { tipo: 'QRATEND', cd_paciente: '1', cd_atendimento: '1' }, { 'x-flow-id': 'outro' });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.json().code, 'QR_BLOQUEADO');
  assert.equal(calls.length, antes, 'bloqueado não consulta o banco');
  assert.equal(guard.qrBlocked(Date.now() + guard.QR_GUARD.blockMs + 1), false);
  // Erros espaçados além da janela não acumulam.
  guard.qrGuardReset();
  for (let i = 0; i < 20; i++) assert.equal(guard.qrFailure(i * guard.QR_GUARD.windowMs / 5), false);
  guard.qrGuardReset();
});

test('QR antigo: aceito por padrão e recusado com QR_LEGADO=false', async t => {
  const rows = [{ cd_paciente: 123, ds_paciente: 'ANA', dt_nascimento: new Date('1980-01-01') }];
  const { get } = await setup(t, 'pacientes.js', 'pacientesRoute', rows);
  const ok = await get('/clinux/pacientes', { tipo: 'QRLEGADO', cd_paciente: '123' });
  assert.deepEqual(ok.json().map(p => p.cd_paciente), [123]);
  {
    const off = await setup(t, 'pacientes.js', 'pacientesRoute', rows, null, { QR_LEGADO: 'false' });
    const response = await off.get('/clinux/pacientes', { tipo: 'QRLEGADO', cd_paciente: '123' });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'QR_LEGADO_DESATIVADO');
    assert.equal(off.calls.length, 0);
    // Consulta por código ligada à sessão do paciente continua funcionando.
    assert.equal((await off.get('/clinux/pacientes', { cd_paciente: '123' })).statusCode, 200);
  }
});
