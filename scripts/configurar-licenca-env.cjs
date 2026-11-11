const fs = require('node:fs/promises');
const path = require('node:path');
const { createPublicKey, createHash } = require('node:crypto');
const { parseArgs, parseEnv } = require('node:util');

async function downloadKey(address, workerOrigin, fetcher) {
  const source = new URL(address);
  if (source.protocol !== 'https:' || source.origin !== workerOrigin || source.username || source.password || source.hash || source.search) throw new Error('Baixe a chave somente por HTTPS no mesmo Worker configurado.');
  const response = await fetcher(source, { redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) { await response.body?.cancel(); throw new Error('Falha ao baixar a chave publica (HTTP ' + response.status + ').'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Resposta de chave publica vazia.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 4096) { await reader.cancel(); throw new Error('Resposta de chave publica muito grande.'); }
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new Error('A resposta nao contem uma chave publica JSON valida de ate 4 KB.'); }
  finally { reader.releaseLock(); }
}

async function configure(args, root = path.resolve(__dirname, '..'), fetcher = fetch) {
  const url = new URL(args.url || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Informe a URL HTTPS principal do Worker.');
  if (args['public-key'] && args['public-key-url']) throw new Error('Use --public-key ou --public-key-url, sem combinar as duas opcoes.');
  const key = args['public-key'] ? JSON.parse(await fs.readFile(path.resolve(args['public-key']), 'utf8'))
    : await downloadKey(args['public-key-url'] || new URL('/public-key.json', url).href, url.origin, fetcher);
  if (!key || typeof key !== 'object') throw new Error('Chave publica invalida.');
  if (key.kty !== 'OKP' || key.crv !== 'Ed25519' || !/^[A-Za-z0-9_-]{43}$/.test(key.x ?? '') || Object.keys(key).some(name => !['kty', 'crv', 'x'].includes(name))) throw new Error('Use somente a chave publica Ed25519; chaves privadas nao sao aceitas.');
  createPublicKey({ key, format: 'jwk' });
  const fingerprint = createHash('sha256').update(JSON.stringify({ kty: key.kty, crv: key.crv, x: key.x })).digest('hex');
  if (args['public-key-sha256'] && (!/^[a-f0-9]{64}$/i.test(args['public-key-sha256']) || args['public-key-sha256'].toLowerCase() !== fingerprint)) throw new Error('A impressao SHA-256 da chave publica nao corresponde ao valor esperado.');
  const keyId = args['key-id'] || 'totem-licencas-v1';
  const issuer = args.issuer || 'urn:totem:licencas';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId) || !/^[A-Za-z0-9_:/.\-]{1,200}$/.test(issuer)) throw new Error('Identificador da chave ou emissor invalido.');
  const target = path.resolve(root, args.env || '.env.backend');
  if (target === path.resolve(root, 'env.backend')) throw new Error('O arquivo env.backend esta versionado. Use .env.backend ou outro arquivo privado.');
  let content, exists = true;
  try { content = await fs.readFile(target, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    exists = false;
    // Bootstrap the private Compose env without deleting or changing the original.
    content = await fs.readFile(path.resolve(root, 'env.backend'), 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
  }
  const vars = { LICENSE_SERVER_URL: url.origin, LICENSE_PUBLIC_KEY_JWK: JSON.stringify(key), LICENSE_KEY_ID: keyId, LICENSE_ISSUER: issuer };
  const lines = [];
  for (const [name, value] of Object.entries(vars)) {
    const found = content.split(/\r?\n/).filter(line => new RegExp('^\\s*(?:export\\s+)?' + name + '\\s*=').test(line));
    if (found.length) {
      if (found.length !== 1) throw new Error('Variavel duplicada: ' + name);
      const existing = parseEnv(content)[name] ?? '';
      let same = existing === value;
      if (name === 'LICENSE_SERVER_URL') {
        try { const current = new URL(existing); same = current.protocol === 'https:' && current.origin === url.origin && current.pathname === '/' && !current.username && !current.password && !current.search && !current.hash; }
        catch { same = false; }
      }
      if (name === 'LICENSE_PUBLIC_KEY_JWK') {
        try {
          const current = JSON.parse(existing);
          same = current && Object.keys(current).length === 3 && current.kty === key.kty && current.crv === key.crv && current.x === key.x;
        } catch { same = false; }
      }
      if (!same) throw new Error('Configuracao existente diferente em ' + name + '. Nenhuma linha foi alterada.');
    } else lines.push(name + "='" + value + "'");
  }
  const suffix = lines.length ? (content.endsWith('\n') || !content ? '' : '\n') + '\n# Licenciamento do backend (configuracao privada de implantacao)\n' + lines.join('\n') + '\n' : '';
  if (exists && suffix) await fs.appendFile(target, suffix);
  else if (!exists) await fs.writeFile(target, content + suffix, { flag: 'wx', mode: 0o600 });
  return { target, added: lines.length };
}
module.exports = { configure };
if (require.main === module) {
  const { values } = parseArgs({ options: { url: { type: 'string' }, 'public-key': { type: 'string' }, 'public-key-url': { type: 'string' }, 'public-key-sha256': { type: 'string' }, env: { type: 'string' }, 'key-id': { type: 'string' }, issuer: { type: 'string' } } });
  configure(values).then(result => console.log('Configuracao preparada em ' + result.target + '; ' + result.added + ' variaveis acrescentadas. Nenhum valor foi exibido.')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
