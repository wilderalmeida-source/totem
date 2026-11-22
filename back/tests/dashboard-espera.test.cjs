const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularEspera, percentil } = require('../src/lib/dashboard-espera.js');

const reg = (data, hora, minutos, extra = {}) => ({ data, horaSenha: hora, minutos, modalidade: 'RAIO X', preferencial: false, senha: 'NR-1', cdPaciente: 101, ...extra });

test('percentil interpola entre posições', () => {
  assert.equal(percentil([], 0.5), 0);
  assert.equal(percentil([10], 0.9), 10);
  assert.equal(percentil([0, 10], 0.5), 5);
});

test('resumo, meta e comparação com o período anterior', () => {
  const atual = [reg('2026-11-02', '08:10:00', 4), reg('2026-11-02', '08:40:00', 20), reg('2026-11-03', '09:05:00', 12, { modalidade: 'TOMOGRAFIA', preferencial: true })];
  const anterior = [reg('2026-10-31', '08:00:00', 24)];
  const r = calcularEspera(atual, anterior, { inicio: '2026-11-02', fim: '2026-11-04', metaMinutos: 15 });

  assert.equal(r.resumo.total, 3);
  assert.equal(r.resumo.media, 12);
  assert.equal(r.resumo.mediana, 12);
  assert.equal(r.resumo.dentroMeta, 2);
  assert.equal(r.resumo.percentualMeta, 66.7);
  assert.equal(r.variacao.media, -50);

  // Dias sem dados aparecem zerados para o gráfico não "pular" datas.
  assert.deepEqual(r.porDia.map(d => d.total), [2, 1, 0]);
  assert.deepEqual(r.porHora.map(h => h.hora), ['08h', '09h']);
  assert.equal(r.porModalidade[0].modalidade, 'RAIO X');
  assert.equal(r.distribuicao.find(f => f.faixa === '15–30 min').total, 1);
  assert.equal(r.porTipo.find(t => t.tipo === 'Preferencial').total, 1);
  assert.equal(r.maioresEsperas[0].minutos, 20);
  assert.equal(r.maioresEsperas[0].cdPaciente, 101);
  assert.equal(r.mapaCalor[0].indice, 1);
  assert.deepEqual(r.mapaCalor.map(l => l.dia), ['Seg', 'Ter']);
});

test('período vazio não quebra e não gera variação', () => {
  const r = calcularEspera([], [], { inicio: '2026-11-01', fim: '2026-11-01', metaMinutos: 15 });
  assert.equal(r.resumo.total, 0);
  assert.equal(r.variacao.media, null);
  assert.deepEqual(r.porHora, []);
  assert.deepEqual(r.mapaCalor, []);
});
