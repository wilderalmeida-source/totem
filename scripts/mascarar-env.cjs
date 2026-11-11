const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const marker = '# COPIA MASCARADA PARA COMPARTILHAMENTO - NAO USAR NA EXECUCAO';

function maskEnv(content) {
  const keys = new Set();
  let quote = '';
  function closingQuote(value, start, character) {
    for (let i = start; i < value.length; i++) {
      if (value[i] === '\\') { i++; continue; }
      if (value[i] === character) return true;
    }
    return false;
  }
  for (const line of content.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    if (quote) { if (closingQuote(line, 0, quote)) quote = ''; continue; }
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (match) {
      keys.add(match[1]);
      const value = match[2].trimStart();
      if (["'", '"', '`'].includes(value[0]) && !closingQuote(value, 1, value[0])) quote = value[0];
    }
  }
  // Discard values, inline comments, free-form comments and multiline contents.
  return marker + '\n# Todos os valores e comentarios originais foram removidos.\n\n' + [...keys].map(key => key + "='[MASCARADO]'").join('\n') + '\n';
}
async function exportMasked(input = '.env.backend', output = input + '.mascarado') {
  const source = path.resolve(input), destination = path.resolve(output);
  if (source === destination || !destination.endsWith('.mascarado')) throw new Error('A copia deve terminar em .mascarado e ser diferente do arquivo original.');
  const info = await fs.lstat(source);
  if (!info.isFile()) throw new Error('O ambiente de origem deve ser um arquivo regular.');
  const original = await fs.readFile(source, 'utf8');
  let exists = false;
  try {
    const info = await fs.lstat(destination);
    if (!info.isFile() || !(await fs.readFile(destination, 'utf8')).startsWith(marker + '\n')) throw new Error('O destino ja existe e nao e uma copia mascarada gerada por este script.');
    exists = true;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const masked = maskEnv(original);
  await fs.writeFile(destination, masked, { mode: 0o600, flag: exists ? 'w' : 'wx' });
  return destination;
}
module.exports = { maskEnv, exportMasked };
if (require.main === module) {
  const { values } = parseArgs({ options: { input: { type: 'string', default: '.env.backend' }, output: { type: 'string' } } });
  exportMasked(values.input, values.output).then(file => console.log('Copia mascarada criada em ' + file + '. Original preservado.')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
