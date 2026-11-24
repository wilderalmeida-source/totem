const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/erros.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Math, Map, Set });
  return exports;
}

const atendimento = (cdAtendimento, extra = {}) => ({
  cdAtendimento, data: '2026-11-03', horaFicha: '08:20', cdFuncionario: 1, funcionario: 'ANA', cdMedico: 10, medico: 'DR X',
  cdConvenio: 100, convenio: 'UNIMED', modalidade: 'RAIO X', cdPaciente: cdAtendimento, paciente: 'JOAO', ...extra,
});
let seq = 0;
const alteracao = (cdAtendimento, coluna, antes, depois, extra = {}) => ({
  id: ++seq, cdAtendimento, origem: 'exame', coluna, campo: coluna, registro: cdAtendimento * 10,
  antes, depois, alteradoEm: `2026-11-03T09:${String(seq).padStart(2, '0')}:00`, minutosAposFicha: 30,
  cdCorretor: 2, corretor: 'BIA', ...extra,
});

test('consolidarErros: várias alterações do mesmo campo viram um erro; tolerância, reversão e preenchimento', () => {
  const { consolidarErros } = load();
  const alteracoes = [
    alteracao(1, 'ds_guia', '111', '222'),
    alteracao(1, 'ds_guia', '222', '333', { corretor: 'ANA' }),
    alteracao(1, 'cd_plano', '5', '6', { minutosAposFicha: 1 }),        // dentro da tolerância
    alteracao(2, 'ds_matricula', 'A', 'B'),
    alteracao(2, 'ds_matricula', 'B', 'A'),                            // voltou ao original
    alteracao(3, 'ds_autorizacao', null, '9597742'),                   // estava vazio
  ];
  const erros = consolidarErros(alteracoes, { toleranciaMin: 2, incluirPreenchimentos: true });
  assert.equal(erros.length, 2);
  const guia = erros.find(e => e.coluna === 'ds_guia');
  assert.equal(guia.antes, '111');
  assert.equal(guia.depois, '333');
  assert.equal(guia.alteracoes, 2);
  assert.deepEqual([...guia.corretores], ['BIA', 'ANA']);
  assert.equal(erros.find(e => e.coluna === 'ds_autorizacao').preenchimento, true);

  const semPreenchimento = consolidarErros(alteracoes, { toleranciaMin: 2, incluirPreenchimentos: false });
  assert.deepEqual([...semPreenchimento.map(e => e.coluna)], ['ds_guia']);
  assert.equal(consolidarErros(alteracoes, { toleranciaMin: 0, incluirPreenchimentos: false }).length, 2);
});

test('taxa de erro por funcionário e por campo usa as fichas analisadas como base', () => {
  const { consolidarErros, agruparErros, resumirErros, filtrarErros } = load();
  const atendimentos = [atendimento(1), atendimento(2), atendimento(3), atendimento(4, { cdFuncionario: 7, funcionario: 'CAIO' })];
  const erros = consolidarErros([
    alteracao(1, 'ds_guia', '1', '2'),
    alteracao(1, 'cd_plano', '1', '2'),
    alteracao(4, 'ds_guia', '1', '2'),
    alteracao(4, 'ds_cpf', '1', '2', { origem: 'paciente', campo: 'CPF' }),
  ], { toleranciaMin: 0, incluirPreenchimentos: true });
  const base = { atendimentos, erros };

  const r = resumirErros(base);
  assert.equal(r.analisados, 4);
  assert.equal(r.comErro, 2);
  assert.equal(r.taxa, 50);
  assert.equal(r.erros, 4);
  assert.equal(r.porOrigem.paciente, 1);

  const porFuncionario = agruparErros(base, 'funcionario');
  const ana = porFuncionario.find(g => g.nome === 'ANA');
  assert.equal(ana.analisados, 3);
  assert.equal(ana.comErro, 1);
  assert.equal(ana.erros, 2);
  assert.equal(ana.taxa, 33.3);
  assert.equal(porFuncionario.find(g => g.nome === 'CAIO').taxa, 100);

  const guia = agruparErros(base, 'campo').find(g => g.chave === 'exame:ds_guia');
  assert.equal(guia.erros, 2);
  assert.equal(guia.taxa, 50);

  // Filtrar um campo mantém todas as fichas no denominador; filtrar funcionário recorta as fichas.
  const soGuia = filtrarErros(base, { campo: 'exame:ds_guia' });
  assert.equal(soGuia.atendimentos.length, 4);
  assert.equal(soGuia.erros.length, 2);
  const soCaio = filtrarErros(base, { funcionario: '7' });
  assert.equal(soCaio.atendimentos.length, 1);
  assert.equal(soCaio.erros.length, 2);
});

test('erro de processo (botão Ficha não marcado) conta mesmo dentro da tolerância', () => {
  const { consolidarErros } = load();
  const erros = consolidarErros([
    alteracao(7, 'ficha_nao_marcada', 'Ficha não marcada por ANA', 'Ficha marcada às 08:20 por BIA', { minutosAposFicha: 0, sempre: true, origem: 'atendimento' }),
    alteracao(7, 'ds_guia', '1', '2', { minutosAposFicha: 0 }),
  ], { toleranciaMin: 2, incluirPreenchimentos: false });
  assert.deepEqual([...erros.map(e => e.coluna)], ['ficha_nao_marcada']);
});

test('podiosFuncionarios: volume, acerto e desempenho equilibrado', () => {
  const { podiosFuncionarios, notaDesempenho } = load();
  const g = (chave, analisados, comErro) => ({ chave, nome: chave, analisados, comErro, erros: comErro, taxa: Math.round((comErro / analisados) * 1000) / 10 });
  const grupos = [
    g('perfeita-poucas', 12, 0),   // 100% mas pouco volume
    g('volume-bom', 400, 8),       // 98% com muito volume
    g('volume-ruim', 600, 150),    // mais fichas, muitos erros
    g('media', 100, 5),
    g('poucas', 5, 0),             // abaixo do mínimo: fora dos pódios de acerto
    g('-', 900, 0),                // sem funcionário
  ];
  const p = podiosFuncionarios(grupos);
  assert.deepEqual([...p.menosErra.map(x => x.chave)], ['perfeita-poucas', 'volume-bom', 'media']);
  assert.deepEqual([...p.maisAtende.map(x => x.chave)], ['volume-ruim', 'volume-bom', 'media']);
  assert.deepEqual([...p.desempenho.map(x => x.chave)], ['volume-bom', 'media', 'perfeita-poucas']);
  assert.ok(notaDesempenho(400, 8) > notaDesempenho(12, 0));
  assert.equal(notaDesempenho(0, 0), 0);
});

test('mapaCalorErros: dia da semana e hora da ficha, segunda a sábado', () => {
  const { mapaCalorErros, diaDaSemana } = load();
  assert.equal(diaDaSemana('2026-11-21'), 6); // sábado
  assert.equal(diaDaSemana('2026-11-16'), 1); // segunda
  const atendimentos = [
    atendimento(1, { data: '2026-11-16', horaFicha: '08:10' }),
    atendimento(2, { data: '2026-11-16', horaFicha: '08:50' }),
    atendimento(3, { data: '2026-11-21', horaFicha: '10:05' }),
  ];
  const erros = [{ cdAtendimento: 1 }, { cdAtendimento: 1 }];
  const m = mapaCalorErros({ atendimentos, erros });
  assert.deepEqual([...m.horas], [8, 9, 10]);
  assert.deepEqual([...m.linhas.map(l => l.nome)], ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  const seg8 = m.linhas[0].celulas[0];
  assert.equal(seg8.analisados, 2);
  assert.equal(seg8.comErro, 1);
  assert.equal(seg8.erros, 2);
  assert.equal(seg8.taxa, 50);
  assert.equal(m.linhas[5].celulas[2].analisados, 1);
});

test('podiosFuncionarios: só quem atendeu em pelo menos N dias diferentes', () => {
  const { podiosFuncionarios, minimoDias } = load();
  const g = (chave, analisados, dias) => ({ chave, nome: chave, analisados, comErro: 0, taxa: 0, erros: 0, dias });
  const grupos = [g('A', 50, 5), g('B', 80, 2), g('C', 30, 3)];
  const p = podiosFuncionarios(grupos, 3);
  assert.deepEqual([...p.maisAtende.map(x => x.chave)], ['A', 'C']);
  assert.equal(minimoDias(30), 3);
  assert.equal(minimoDias(2), 2);
  assert.equal(minimoDias(1), 1);
});
