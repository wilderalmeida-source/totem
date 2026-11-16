const { test } = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const WebSocket = require('ws');
const wsPlugin = require('../src/routes/websocket.js').default;

async function server(t) {
  const app = Fastify();
  await app.register(wsPlugin, { heartbeatMs: 50 });
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(() => app.close());
  return { app, url: `ws://127.0.0.1:${app.server.address().port}/ws` };
}
const opened = ws => new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });

test('cliente que responde ao ping continua recebendo broadcast', async t => {
  const { app, url } = await server(t);
  const ws = new WebSocket(url);
  t.after(() => ws.terminate());
  await opened(ws);
  await new Promise(r => setTimeout(r, 250));
  const message = new Promise(resolve => ws.once('message', data => resolve(JSON.parse(data))));
  app.broadcast({ type: 'tcp', ok: true });
  assert.deepEqual(await message, { type: 'tcp', ok: true });
});

test('cliente que para de responder ao ping e encerrado pelo servidor', async t => {
  const { url } = await server(t);
  const ws = new WebSocket(url, { autoPong: false });
  t.after(() => ws.terminate());
  await opened(ws);
  const closed = new Promise(resolve => ws.once('close', resolve));
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('nao encerrou')), 2000));
  await Promise.race([closed, timeout]);
});
