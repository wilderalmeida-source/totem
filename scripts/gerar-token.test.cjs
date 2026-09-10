const { test } = require('node:test');
const assert = require('node:assert/strict');
const { updateEnv } = require('./gerar-token.cjs');
test('preserva comentarios CRLF e outras chaves', () => {
  const original = Buffer.from('# comentario\r\nOUTRA=abc\r\nTOKEN_API_INT=antigo # manter\r\nFINAL=xyz');
  assert.equal(updateEnv(original, 'TOKEN_API_INT', 'novo').toString(), '# comentario\r\nOUTRA=abc\r\nTOKEN_API_INT=novo # manter\r\nFINAL=xyz');
});
test('acrescenta chave ausente sem perder ultima linha', () => {
  assert.equal(updateEnv(Buffer.from('OUTRA=1'), 'TOKEN_API_INT', 'novo').toString(), 'OUTRA=1\nTOKEN_API_INT=novo\n');
});
test('preserva BOM UTF8 e atualiza duplicatas sem remover linhas', () => {
  const bom = Buffer.from([239,187,191]);
  const original = Buffer.concat([bom, Buffer.from('TOKEN_API_INT="old"\nTOKEN_API_INT=old\n# fim')]);
  assert.ok(updateEnv(original, 'TOKEN_API_INT', 'novo').equals(Buffer.concat([bom, Buffer.from('TOKEN_API_INT=novo\nTOKEN_API_INT=novo\n# fim')])));
});
