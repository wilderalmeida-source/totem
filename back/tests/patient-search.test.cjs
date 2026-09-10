const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

async function setup(t, file, exportName, result = []) {
  const calls = [];
  const diagnostics = [];
  const findMany = async args => { calls.push(args); return result; };
  const prisma = { pacientes: { findMany }, atendimentos: { findMany } };
  const filename = path.join(__dirname, '../src/routes', file);
  const realRequire = createRequire(filename);
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports, require: name => name === '../../config/prismaDB' ? { prisma } : name === '../lib/patient-diagnostics' ? { describePatientInput: value => value, patientDiagnostic: (id, metadata) => diagnostics.push(metadata) } : realRequire(name),
    console, process: { env: {} }, Date,
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
  assert.ok(calls.every(call => call.take === 101));
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

test('nascimento inicial elimina repetições e refinamento por nome/data continua disponível', async t => {
  const { calls, get } = await setup(t, 'pacientes.js', 'pacientesRoute');
  await get('/clinux/pacientes', { dt_nascimento: '1980-01-01' });
  assert.equal(calls[0].distinct.join(), 'dt_nascimento');
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
  assert.ok(calls[1].where.dt_data.lte - calls[1].where.dt_data.gte <= 93 * 86400000);
  assert.equal(calls[0].select.ds_observacao, undefined);
  assert.equal(calls[0].select.pacientes_atendimentos_cd_pacienteTopacientes, undefined);
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
  const query = { tipo: 'NOMEDATA', ds_paciente: 'ANA', dt_nascimento: '1980-01-01' };
  const attempt = async flow => (await get('/clinux/pacientes', query, { 'x-flow-id': flow })).json()[0].tentativas;
  assert.equal(await attempt('attempt-a'), 2);
  assert.equal(await attempt('attempt-a'), 1);
  assert.equal(await attempt('attempt-b'), 2);
  assert.equal(await attempt('attempt-c'), 2);
  assert.equal(await attempt('attempt-a'), 0);
  const before = calls.length;
  assert.equal(await attempt('attempt-a'), 0);
  assert.equal(calls.length, before);
  await get('/clinux/pacientes', { tipo: 'RESET' }, { 'x-flow-id': 'attempt-a' });
  assert.equal(await attempt('attempt-a'), 2);
  assert.equal(await attempt('attempt-b'), 1);
});
