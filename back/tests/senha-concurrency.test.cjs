const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(initial = [], failUpdate = false) {
  let rows = initial.map(nr_senha => ({ nr_senha }));
  let queue = Promise.resolve();
  let updates = 0;
  let reserved = Math.max(initial.length, 0, ...initial);
  const prisma = {
    atendimentos: { findMany: async () => [{ cd_atendimento: 1, ds_status: 2, exames: [{}], salas: { cd_modalidade: 1 } }] },
    $transaction: async (run, options) => {
      assert.equal(options.isolationLevel, 'ReadCommitted');
      let release, locked = false;
      const previous = queue;
      queue = new Promise(resolve => { release = resolve; });
      await previous; locked = true;
      let staged = [...rows];
      try {
        const result = await run({
          $executeRaw: async () => { throw Error('Nao deve bloquear a tabela clinica'); },
          atendimentos_senhas: {
            count: async ({ where }) => {
              assert.ok(locked);
              assert.equal(where.dt_entrada.lt - where.dt_entrada.gte, 86400000);
              return staged.length;
            },
            aggregate: async () => { assert.ok(locked); return { _max: { nr_senha: Math.max(0, ...staged.map(r => r.nr_senha)) } }; },
            create: async ({ data }) => { assert.ok(locked); const row = { ...data, cd_senha: staged.length + 1 }; staged.push(row); return row; },
          },
          atendimentos: { updateMany: async () => {
            assert.ok(locked);
            if (failUpdate) throw Error('falha de vinculo');
            updates++;
          } },
        });
        rows = staged;
        return result;
      } finally { release(); }
    },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/senhas/gerar-senha-atendimento.service.js'), 'utf8'), {
    exports, Date, process: { env: { IDMODALIDADE: '1' } },
    require: name => name.includes('flow-audit') ? { auditOperation: (_step, run) => run(), flowAudit: () => {} } : name.endsWith('prismaDB') ? { prisma } : name.endsWith('reservar-numero-senha.service') ? { reservarNumeroSenha: async () => ++reserved } : {
      getAgoraBrasil: () => new Date('2026-09-09T10:00:00Z'),
      getHojeBrasil: () => new Date('2026-09-09T00:00:00Z'),
      resolveModalidade: async () => 'USG', resolverIpPainelPorModalidade: async () => 'painel',
      montarDsSenha: (p, f, n) => f + '-' + n,
    },
  });
  return { issue: () => exports.gerarSenhaAtendimento({ cd_paciente: 1, servico: 'A', preferencial: 0 }), rows: () => rows, updates: () => updates };
}

test('tres emissoes concorrentes reservam numeros distintos com reserva externa', async () => {
  const env = setup();
  const results = await Promise.all([env.issue(), env.issue(), env.issue()]);
  assert.deepEqual(results.map(r => r.nr_senha), [1, 2, 3]);
  assert.equal(env.updates(), 3);
});

test('lacunas na numeracao nao reutilizam um numero existente', async () => {
  const env = setup([1, 3]);
  assert.equal((await env.issue()).nr_senha, 4);
});

test('falha ao vincular atendimento nao confirma a senha', async () => {
  const env = setup([], true);
  await assert.rejects(env.issue(), /falha de vinculo/);
  assert.equal(env.rows().length, 0);
});


test('contador usa incremento atomico nos logs e preserva piso clinico', async () => {
  const exports = {};
  const calls = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/senhas/reservar-numero-senha.service.js'), 'utf8'), {
    exports, Date,
    require: name => name.includes('flow-audit') ? { auditOperation: (_step, run) => run(), flowAudit: () => {} } : name.endsWith('prismaDB') ? { prisma: { atendimentos_senhas: {
      count: async () => 2,
      aggregate: async () => ({ _max: { nr_senha: 8 } }),
    } } } : { PrismaLog: { $queryRaw: async (sql, ...values) => {
      calls.push({ sql: sql.join('?'), values });
      return [{ number: 9 }];
    } } },
  });
  assert.equal(await exports.reservarNumeroSenha(new Date('2026-09-09T00:00:00Z')), 9);
  assert.match(calls[0].sql, /ON CONFLICT/);
  assert.match(calls[0].sql, /GREATEST/);
  assert.deepEqual(calls[0].values, ['2026-09-09', 9, 8]);
});
