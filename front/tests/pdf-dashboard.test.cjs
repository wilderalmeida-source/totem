const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mod = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/pdf-dashboard.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod, crypto: globalThis.crypto, Uint32Array, Uint8Array });
const { gerarSenha, planejarPaginas, textoPeriodo, nomeArquivo, textoSeguro, quebrarLinhas } = mod;

test('senha tem sempre 6 digitos, com zeros a esquerda, e descarta a sobra de 2^32', () => {
  for (let i = 0; i < 200; i++) assert.match(gerarSenha(), /^\d{6}$/);
  assert.equal(gerarSenha(() => 42), '000042');
  const seq = [4294999999, 4294000000, 1234567];
  assert.equal(gerarSenha(() => seq.shift()), '234567'); // os dois primeiros caem na sobra e sao rejeitados
});

test('bloco que cabe nao e cortado: vai inteiro para a proxima pagina', () => {
  const p = planejarPaginas([{ h: 300 }, { h: 300 }], 500, 500);
  assert.equal(p.length, 2);
  assert.equal(JSON.stringify(p[1]), JSON.stringify([{ bloco: 1, y: 0, topo: 0, altura: 300, escala: 1 }]));
});

test('bloco que quase cabe e reduzido em vez de deixar a pagina vazia', () => {
  const p = planejarPaginas([{ h: 200 }, { h: 330 }], 500, 500);
  assert.equal(p.length, 1);
  assert.ok(p[0][1].escala >= 0.8 && p[0][1].escala < 1);
  assert.equal(p[0][1].altura, 290);
});

test('titulo curto acompanha o bloco seguinte', () => {
  const p = planejarPaginas([{ h: 400 }, { h: 20, manterComProximo: true }, { h: 300 }], 500, 500);
  assert.equal(p[0].length, 1);
  assert.equal(JSON.stringify(p[1].map(x => x.bloco)), JSON.stringify([1, 2]));
});

test('tabela maior que a pagina e cortada entre linhas e nunca reduzida', () => {
  const cortes = Array.from({ length: 50 }, (_, i) => (i + 1) * 23);
  const p = planejarPaginas([{ h: 1150, cortes }], 500, 500);
  const fatias = p.flat();
  assert.ok(fatias.every(f => f.escala === 1));
  for (const f of fatias.slice(0, -1)) assert.ok(cortes.includes(f.topo + f.altura), `corte fora da linha: ${f.topo + f.altura}`);
  assert.equal(Math.round(fatias.reduce((s, f) => s + f.altura, 0)), 1150);
});

test('periodo, nome do arquivo e texto para a fonte do PDF', () => {
  assert.equal(textoPeriodo(['2026-11-01', '2026-11-24']), '01/11/2026 a 24/11/2026');
  assert.equal(textoPeriodo(['2026-11']), '11/2026');
  assert.equal(textoPeriodo([]), null);
  assert.equal(nomeArquivo('Exames e auditoria', '01/11/2026 a 24/11/2026', new Date(2026, 10, 24)), 'exames-e-auditoria_01-11-2026-a-24-11-2026_2026-11-24.pdf');
  assert.equal(textoSeguro('Ticket ≥ 10 → ok ✓ ação'), 'Ticket >= 10 -> ok v ação');
  assert.equal(textoSeguro('emoji 😀 fora'), 'emoji  fora');
  const l = quebrarLinhas('um dois tres quatro cinco seis', 10, s => s.length, 2);
  assert.equal(l.length, 2);
  assert.ok(l[1].endsWith('…'));
});
