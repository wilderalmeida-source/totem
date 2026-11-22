const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/laudos.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Math, Map, Number, String });
  return exports;
}

let seq = 0;
const linha = (extra = {}) => ({
  id: ++seq, cdAtendimento: seq, cdPaciente: 1, data: '2026-11-03', realizado: '2026-11-03 08:00', finalizado: true, assinado: '2026-11-03 14:00',
  prazo: '2026-11-05 23:59', horas: 6, atrasoHoras: -40, cdMedico: 1, cdMedicoExame: 1, atribuidoPor: 'laudo', cdExameOrigem: null,
  cdModalidade: 5, cdConvenio: 9, cdProcedimento: 100, tipo: 'laudo', ...extra,
});

test('estatLaudos: só finalizados entram nos cálculos; revisão e retificação separadas', () => {
  const { estatLaudos } = load();
  const e = estatLaudos([
    linha(), linha({ horas: 10 }),
    linha({ finalizado: false, assinado: null, horas: null, atrasoHoras: 5 }), // não finalizado e já atrasado: fora dos cálculos
    linha({ atrasoHoras: 2, horas: 60 }),                             // assinado depois do prazo
    linha({ prazo: null, atrasoHoras: null }),                        // sem prazo: não entra no % no prazo
    linha({ tipo: 'revisao' }), linha({ tipo: 'retificacao' }), linha({ tipo: 'retificacao' }),
    linha({ tipo: 'revisao', finalizado: false, assinado: null }),   // revisão não finalizada: não conta
  ]);
  assert.equal(e.exames, 5);
  assert.equal(e.assinados, 4);
  assert.equal(e.pendentes, 1);
  assert.equal(e.comPrazo, 3);
  assert.equal(e.atrasados, 1);
  assert.equal(e.pendentesAtrasados, 1);
  assert.equal(e.percentualNoPrazo, 66.7);
  assert.equal(e.medianaHoras, 8);
  assert.equal(e.comTempo, 4);
  assert.equal(e.revisoes, 1);
  assert.equal(e.retificacoes, 2);
  assert.equal(e.taxaRevisao, 25);
  assert.equal(e.taxaRetificacao, 50);
});

test('podiosMedicos e filtro cruzado', () => {
  const { agruparLaudos, podiosMedicos, filtrarLaudos } = load();
  const nomes = { medicos: { 1: 'DR A', 2: 'DR B', 3: 'DR C' }, modalidades: {}, convenios: {}, procedimentos: {}, pacientes: {} };
  const linhas = [
    ...Array.from({ length: 30 }, () => linha({ cdMedico: 1, horas: 20 })),                       // muitos, lento, sem erro
    ...Array.from({ length: 12 }, () => linha({ cdMedico: 2, horas: 2 })),                        // rápido
    ...Array.from({ length: 3 }, () => linha({ cdMedico: 3, horas: 1 })),                         // rapidíssimo, mas poucos
    ...Array.from({ length: 4 }, () => linha({ cdMedico: 2, tipo: 'retificacao' })),
  ];
  const p = podiosMedicos(agruparLaudos(linhas, 'medico', nomes));
  assert.deepEqual([...p.maisLaudos.map(g => g.nome)], ['DR A', 'DR B', 'DR C']);
  assert.deepEqual([...p.maisRapidos.map(g => g.nome)], ['DR B', 'DR A']);
  assert.deepEqual([...p.desempenho.map(g => g.nome)], ['DR A', 'DR B']);
  assert.equal(filtrarLaudos(linhas, { medico: '3' }).length, 3);
  assert.equal(filtrarLaudos(linhas, { medico: '3' }, 'medico').length, linhas.length);
});

test('formatarHoras', () => {
  const { formatarHoras } = load();
  assert.equal(formatarHoras(0.5), '30 min');
  assert.equal(formatarHoras(6.5), '6,5 h');
  assert.equal(formatarHoras(72), '3 dias');
});
