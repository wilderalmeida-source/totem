const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load('lib/' + name.slice(2) + '.ts') : require(name) });
  return exports;
}
const { flowSteps } = load('lib/audit-summary.ts');
let n = 0;
const ev = (action, metadata = {}, step) => ({ id: String(++n), category: 'TOTEM', sessionId: 'flow-1', action, step, metadata, createdAt: '2026-11-19T11:05:00Z' });
const byKey = steps => Object.fromEntries(steps.map(s => [s.key, s]));

test('atendimento completo: servico, paciente, modalidade e senha', () => {
  const { steps, result, name } = flowSteps([
    ev('servico_selecionado', { servico: 'B' }), ev('prioridade_selecionada', { servico: 'B', preferencial: 1, opcao: '60 anos ou mais' }),
    ev('tipo_busca_selecionado', { tipo: 'NOME' }), ev('resultado_busca_selecionado', { tipo: 'NOME', nomePaciente: 'MARIA DA SILVA' }),
    ev('modal_paciente_aberto', { nomePaciente: 'MARIA DA SILVA' }), ev('confirmacao_senha', { servico: 'B' }),
    ev('modalidades_exibida', {}, 'modalidade'), ev('modalidade_selecionada', { modalidadeNome: 'Raio X' }, 'modalidade'),
    ev('senha_e_vinculo_confirmados', { nr_senha: 42, outcome: 'CONCLUIDO' }),
  ]);
  const s = byKey(steps);
  assert.equal(steps.map(x => x.key).join(), 'servico,paciente,data,achou,modalidade,senha');
  assert.equal(s.servico.answer, 'Atendimento'); assert.equal(s.servico.detail, '60 anos ou mais');
  assert.equal(name, 'MARIA DA SILVA'); assert.equal(s.paciente.detail, 'Pela busca por nome');
  assert.equal(s.achou.answer, 'Achou o paciente');
  assert.equal(s.modalidade.answer, 'Sim, escolheu Raio X');
  assert.equal(s.senha.answer, 'Sim, senha 42'); assert.equal(s.senha.state, 'ok');
  assert.equal(result.label, 'Deu certo');
});

test('avancou sem cadastro, viu modalidades e nao escolheu', () => {
  const { steps, result } = flowSteps([
    ev('servico_selecionado', { servico: 'D' }), ev('avancar_clicado', { tipo: 'NOME' }),
    ev('modalidades_exibida', {}, 'modalidade'), ev('inicio_clicado', {}, 'modalidade'),
    ev('fluxo_encerrado', { reason: 'retorno_inicio' }),
  ]);
  const s = byKey(steps);
  assert.equal(s.paciente.state, 'warn');
  assert.equal(s.achou.answer, 'Clicou em Avançar sem cadastro');
  assert.equal(s.modalidade.answer, 'Sim, mas não escolheu');
  assert.equal(s.senha.answer, 'Não gerou'); assert.equal(s.senha.detail, 'Voltou ao início');
  assert.equal(result.label, 'Não concluído');
});

test('entrega por QR sem modalidade e falha na gravacao da senha', () => {
  const { steps, result } = flowSteps([
    ev('servico_selecionado', { servico: 'C' }), ev('qr_resposta_recebida', { quantidade: 1, nomePaciente: 'JOSE' }),
    ev('confirmacao_senha', {}), ev('emissao_rejeitada', { code: 'PATIENT_SESSION_MISSING', outcome: 'FALHOU' }),
  ]);
  const s = byKey(steps);
  assert.equal(s.paciente.answer, 'JOSE'); assert.equal(s.paciente.detail, 'Pela busca por QR Code');
  assert.equal(s.modalidade.answer, 'Não apareceu'); assert.equal(s.modalidade.state, 'skip');
  assert.equal(s.senha.answer, 'Não, deu erro'); assert.match(s.senha.detail, /Sessão do paciente/);
  assert.equal(result.label, 'Deu erro');
});

test('QR invalido sem paciente e data de nascimento digitada aparece na data', () => {
  const qr = byKey(flowSteps([ev('servico_selecionado', { servico: 'C' }), ev('qr_invalido', {})]).steps);
  assert.equal(qr.achou.state, 'fail');
  const data = byKey(flowSteps([ev('servico_selecionado', { servico: 'B' }), ev('identificacao_enviada_next', { enviado: { dt_nascimento: '1962-03-15' } })]).steps);
  assert.equal(data.data.detail, 'Nascimento digitado: 15/03/1962');
  assert.match(data.data.answer, /19\/11\/2026 às/);
  assert.equal(data.achou.answer, 'Parou antes de se identificar');
});
