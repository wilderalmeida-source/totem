const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

async function setup(t, historicoNome) {
  const file = path.join(__dirname, '../src/routes/senhas.js');
  const realRequire = createRequire(file); const exports = {}; let consultas = 0;
  const prisma = { atendimentos_senhas: { findMany: async () => { consultas++; return [{ cd_senha: 1, atendimentos: { pacientes_atendimentos_cd_pacienteTopacientes: { ds_paciente: 'MARIA APARECIDA DOS SANTOS' } } }]; } }, $queryRaw: async () => [] };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { exports, Date, require: n => n === '../../config/prismaDB' ? { prisma }
    : n.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ historicoNome }) }
    : n.includes('gerar-senha.service') ? {} : n.includes('flow-audit') ? { flowAudit() {} } : realRequire(n) });
  const app = Fastify(); t.after(() => app.close()); await app.register(exports.senhaRoute);
  return { get: async () => (await app.inject('/clinux/senhas')).json(), consultas: () => consultas };
}
const nome = body => body.senhas[0].atendimentos.pacientes_atendimentos_cd_pacienteTopacientes.ds_paciente;

test('historico do totem usa o formato escolhido e o padrao continua primeiro e ultimo nome', async t => {
  assert.equal(nome(await (await setup(t, 'primeiro_ultimo')).get()), 'MARIA SANTOS');
  assert.equal(nome(await (await setup(t, 'abreviado')).get()), 'MARIA A. S.');
  assert.equal(nome(await (await setup(t, 'iniciais')).get()), 'M. A. S.');
});

test('historico oculto nao consulta o banco nem devolve nomes', async t => {
  const api = await setup(t, 'oculto');
  const body = await api.get();
  assert.equal(body.oculto, true);
  assert.equal(body.senhas.length + body.senhasnr.length, 0);
  assert.equal(api.consultas(), 0);
});
