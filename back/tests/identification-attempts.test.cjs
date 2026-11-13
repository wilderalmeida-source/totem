const { test } = require('node:test');
const assert = require('node:assert/strict');
const { identificationAttempts } = require('../src/lib/identification-attempts');
test('contador expira e nunca fica negativo', () => {
  for (let i = 0; i < 5; i++) identificationAttempts('expiry-test', 'fail', 1000);
  assert.equal(identificationAttempts('expiry-test', 'read', 2000), 0);
  assert.equal(identificationAttempts('expiry-test', 'read', 601000), 3);
});

test('contador por alvo dura 30 minutos e não é afetado pelo contador de fluxo', () => {
  const { TARGET, FLOW } = require('../src/lib/identification-attempts');
  for (let i = 0; i < 3; i++) identificationAttempts('cpf#teste-ttl', 'fail', 1000, TARGET);
  assert.equal(identificationAttempts('cpf#teste-ttl', 'read', 1000 + FLOW.ttl + 1, TARGET), 0);
  assert.equal(identificationAttempts('cpf#teste-ttl', 'read', 1000 + TARGET.ttl, TARGET), 3);
});

test('muitos fluxos não travam a identificação: descarta os mais antigos', () => {
  for (let i = 0; i < 10050; i++) identificationAttempts(`massa-${i}`, 'fail', 5000);
  assert.equal(identificationAttempts('massa-novo', 'fail', 5000), 2);
  assert.equal(identificationAttempts('massa-0', 'read', 5000), 3);
  assert.equal(identificationAttempts('massa-10049', 'read', 5000), 2);
});

test('chave do alvo normaliza nome e separa CPF e nome', () => {
  const { identificationTarget } = require('../src/lib/identification-attempts');
  assert.equal(identificationTarget({ tipo: 'NOMEDATA', ds_paciente: '  ana   maria ' }), 'nome#ANA MARIA');
  assert.equal(identificationTarget({ tipo: 'ID', ds_cpf: '12345678901' }), 'cpf#12345678901');
  assert.equal(identificationTarget({ tipo: 'NOME', ds_paciente: 'ANA' }), null);
});
