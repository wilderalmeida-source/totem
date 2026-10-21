const fs = require('node:fs');
const path = require('node:path');
const { summarize } = require('./metrics.cjs');

async function main() {
  const base = new URL(process.env.TOTEM_TEST_URL || '');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('Use TOTEM_TEST_URL com apenas a origem, sem credenciais.');
  const users = Number(process.env.TOTEM_TEST_USERS || 3);
  const seconds = Number(process.env.TOTEM_TEST_SECONDS || 600);
  if (!Number.isInteger(users) || users < 1 || users > 20 || !Number.isInteger(seconds) || seconds < 10 || seconds > 3600) throw Error('Use 1–20 usuarios e 10–3600 segundos.');
  if (process.env.TOTEM_TEST_CONFIRM !== 'HOMOLOGACAO') throw Error('Defina TOTEM_TEST_CONFIRM=HOMOLOGACAO para confirmar o ambiente.');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const samples = [], devices = [], contexts = [], started = new Map();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  const begin = Date.now();
  const output = path.join(__dirname, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(output, { recursive: true });
  try {
    for (let i = 0; i < users && !stopping; i++) {
      const context = await browser.newContext({ baseURL: base.origin, viewport: { width: 1366, height: 768 } });
      contexts.push(context);
      const page = await context.newPage();
      const device = { id: i + 1, ready: false, pageErrors: 0, uiProbes: [], leftHome: 0 };
      devices.push(device);
      // Only route names and timings: never bodies, query parameters, cookies or patient names.
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.origin === base.origin && url.pathname.startsWith('/api/')) started.set(request, { device: device.id, route: url.pathname, start: Date.now(), method: request.method() });
      });
      const finish = (request, failed) => {
        const data = started.get(request); if (!data) return;
        started.delete(request);
        if (data.route === '/api/events') return; // SSE is intentionally long-lived.
        samples.push({ device: data.device, route: data.route, method: data.method, kind: failed ? 'failed' : 'completed',
          status: failed ? null : request.response().then(r => r?.status()), ms: Date.now() - data.start });
      };
      page.on('requestfinished', request => finish(request, false));
      page.on('requestfailed', request => finish(request, true));
      page.on('pageerror', () => device.pageErrors++);
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (new URL(page.url()).pathname === '/login-totem') {
          const card = process.env.TOTEM_TEST_CARD, pin = process.env.TOTEM_TEST_PIN;
          if (!card || !pin) throw Error('LOGIN_REQUIRED');
          await page.locator('input[placeholder]').first().fill(card);
          await page.locator('input[aria-label="PIN"]').fill(pin, { timeout: 15000 });
          await page.getByRole('button', { name: 'Liberar', exact: true }).click();
          await page.waitForURL(url => url.pathname === '/', { timeout: 20000 });
        }
        if (new URL(page.url()).pathname !== '/') throw Error('NOT_HOME');
        device.ready = true;
      } catch { device.setupFailed = true; }
      device.page = page;
    }
    const deadline = Date.now() + seconds * 1000;
    console.log(`Observando ${devices.filter(d => d.ready).length}/${users} navegadores por ${seconds}s. Ctrl+C encerra e salva.`);
    while (!stopping && Date.now() < deadline && devices.some(d => d.ready)) {
      await Promise.all(devices.filter(d => d.ready).map(async device => {
        const start = Date.now();
        try {
          await device.page.locator('body').isVisible({ timeout: 5000 });
          device.uiProbes.push(Date.now() - start);
          if (new URL(device.page.url()).pathname !== '/') device.leftHome++;
        } catch { device.probeFailures = (device.probeFailures || 0) + 1; }
      }));
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } finally {
    const pending = [...started.values()].map(({ device, route, method }) => ({ device, route, method }));
    // Snapshot before closing so cancellation during shutdown is not counted as an outage.
    const captured = samples.slice();
    for (const sample of captured) if (sample.status instanceof Promise) sample.status = await sample.status;
    const routes = Object.fromEntries([...new Set(captured.map(s => s.route))].map(route => [route, summarize(captured.filter(s => s.route === route))]));
    const report = { elapsedSeconds: Math.round((Date.now() - begin) / 1000), users, routes, pending,
      devices: devices.map(({ page, ...device }) => device), samples: captured };
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`Relatorio: ${path.join(output, 'report.json')}`);
    console.table(routes);
    if (devices.length !== users || devices.some(d => !d.ready)) process.exitCode = 1;
  }
}
main().catch(() => { console.error('Teste interrompido. Confira URL, confirmacao, instalacao do Playwright e acesso ao ambiente.'); process.exitCode = 1; });
