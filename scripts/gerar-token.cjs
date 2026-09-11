const fs = require('node:fs');
const path = require('node:path');

// Latin1 permite preservar todos os bytes originais, inclusive BOM e CRLF.
function updateEnv(original, key, token) {
  let found = false;
  let text = original.toString('latin1');
  const pattern = new RegExp('^([ \\t]*(?:export[ \\t]+)?' + key + '[ \\t]*=[ \\t]*)(.*)$');
  text = text.split(/(\r\n|\n|\r)/).map(line => {
    const bom = line.startsWith('\xef\xbb\xbf') ? '\xef\xbb\xbf' : '';
    const match = line.slice(bom.length).match(pattern);
    if (!match) return line;
    found = true;
    const value = match[2];
    let quote = '', comment = -1;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '\\') { i++; continue; }
      if (quote) { if (value[i] === quote) quote = ''; }
      else if (value[i] === '"' || value[i] === "'") quote = value[i];
      else if (value[i] === '#') { comment = i; break; }
    }
    const beforeComment = comment < 0 ? value : value.slice(0, comment);
    const spacing = beforeComment.match(/[ \t]*$/)[0];
    return bom + match[1] + token + spacing + (comment < 0 ? '' : value.slice(comment));
  }).join('');
  if (!found) {
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    if (text && !/[\r\n]$/.test(text)) text += newline;
    text += key + '=' + token + newline;
  }
  return Buffer.from(text, 'latin1');
}

function writeExisting(file, data) {
  const fd = fs.openSync(file, 'r+');
  try {
    let offset = 0;
    while (offset < data.length) offset += fs.writeSync(fd, data, offset, data.length - offset, offset);
    fs.ftruncateSync(fd, data.length);
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

async function main() {
  const files = [['.env.backend', 'TOKEN_API_INT'], ['.env.frontend', 'TOKEN_API_INT']].map(([name, key]) => {
    const file = path.resolve(name);
    if (!fs.lstatSync(file).isFile()) throw Error('Os arquivos de ambiente devem ser arquivos regulares.');
    fs.accessSync(file, fs.constants.R_OK | fs.constants.W_OK);
    return { file, key, original: fs.readFileSync(file) };
  });
  if (!process.env.ADMIN_SECRET) throw Error('ADMIN_SECRET ausente no ambiente do backend.');
  // Backups exclusivos, sem substituir backups anteriores.
  const suffix = '.backup-' + Date.now() + '-' + require('node:crypto').randomBytes(4).toString('hex');
  for (const item of files) fs.writeFileSync(item.file + suffix, item.original, { flag: 'wx', mode: 0o600 });
  const response = await fetch('http://127.0.0.1:5000/tokens', {
    method: 'POST', headers: { 'x-admin-key': process.env.ADMIN_SECRET },
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error('O backend recusou a geracao do token (HTTP ' + response.status + ').');
  const body = await response.json();
  if (typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw Error('Resposta de token invalida.');
  for (const item of files) {
    if (!fs.readFileSync(item.file).equals(item.original)) throw Error('Arquivo alterado durante a operacao. Nenhuma atualizacao iniciada.');
  }
  const touched = [];
  try {
    for (const item of files) {
      touched.push(item);
      let updated = updateEnv(item.original, item.key, body.token);
      // Mantem a linha legada, se existir, sincronizada durante a transicao.
      if (/^[ \t]*(?:export[ \t]+)?TOKENAPIINT[ \t]*=/m.test(item.original.toString('utf8').replace(/^\uFEFF/, ''))) {
        updated = updateEnv(updated, 'TOKENAPIINT', body.token);
      }
      writeExisting(item.file, updated);
    }
  } catch {
    let restored = true;
    for (const item of touched) {
      try { writeExisting(item.file, item.original); } catch { restored = false; }
    }
    throw Error(restored ? 'Falha na gravacao. Conteudo original restaurado.' : 'Falha na gravacao e restauracao. Recupere os arquivos usando os backups ' + suffix);
  }
  console.log('Token gerado e atualizado nos dois arquivos. Demais linhas preservadas.');
  console.log('Backups: .env.backend' + suffix + ' e .env.frontend' + suffix);
  console.log('Nenhum container foi reiniciado. O token sera carregado quando forem recriados.');
}

module.exports = { updateEnv };
if (require.main === module) main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error('Nao foi possivel concluir: ' + detail);
  console.error('Verifique o backend, ADMIN_SECRET e permissoes. Em caso de falha de gravacao, confira os backups antes de usar os arquivos.');
  process.exitCode = 1;
});
