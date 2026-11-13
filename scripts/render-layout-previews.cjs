// Exact CSS viewports via an isolated local browser. Fixture pages only.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const directory = path.resolve(process.argv[2] || '');
const requestedSize = process.argv[3] || 'all';
const screens = ['home','priority','search-name','search-data','search-cpf','confirm-name','confirm-date','modalities','modal','tv','login','login-totem','admin','themes'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  if (!process.argv[2] || !['all','desktop','mobile'].includes(requestedSize)) throw Error('Usage: node scripts/render-layout-previews.cjs <fixture-directory> [all|desktop|mobile]');
  const profile = await fs.mkdtemp(path.join(directory, 'edge-cdp-'));
  const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let port;
    for (let attempt=0; attempt<100; attempt++) {
      try { port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/); break; } catch { await delay(100); }
    }
    if (!port) throw Error('Browser did not expose its local debugging endpoint.');
    socket = new WebSocket(`ws://127.0.0.1:${port[0]}${port[1]}`);
    await new Promise((resolve,reject)=>{ socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence=0;
    const pending = new Map(), listeners = new Set();
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if (message.id) {
        const request=pending.get(message.id);
        if (request) { pending.delete(message.id); clearTimeout(request.timeout); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); }
      } else { for (const listener of listeners) listener(message); }
    });
    function send(method,params={},sessionId) {
      return new Promise((resolve,reject)=>{
        const id=++sequence;
        const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`Browser timeout: ${method}`));},15000);
        pending.set(id,{resolve,reject,timeout}); socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
      });
    }
    function loaded(sessionId) {
      return new Promise((resolve,reject)=>{
        const listener=message=>{if(message.sessionId===sessionId && message.method==='Page.loadEventFired'){clearTimeout(timeout);listeners.delete(listener);resolve();}};
        const timeout=setTimeout(()=>{listeners.delete(listener);reject(Error('Local fixture did not finish loading.'));},15000);
        listeners.add(listener);
      });
    }
    const results=[];
    for (const viewport of requestedSize==='all'?['desktop','mobile']:[requestedSize]) {
      for (const screen of screens) {
        if(viewport==='mobile'&&screen==='tv') continue;
        for(const theme of ['theme1','theme2']) for(const mode of ['light','dark']) {
          const name=`${screen}-${theme}-${mode}`, artifact=name+(viewport==='mobile'?'-mobile':'');
          const [width,height]=viewport==='mobile'?[390,844]:screen==='tv'?[1920,1080]:['admin','themes'].includes(screen)?[1440,1000]:[712,900];
          const {targetId}=await send('Target.createTarget',{url:'about:blank'});
          const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
          await send('Page.enable',{},sessionId);
          await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
          const pageLoaded=loaded(sessionId);
          await send('Page.navigate',{url:pathToFileURL(path.join(directory,name+'.html')).href},sessionId);
          await pageLoaded;
          await delay(150);
          const metrics=await send('Runtime.evaluate',{expression:'JSON.parse(document.getElementById("review-metrics").textContent)',returnByValue:true},sessionId);
          const measurement=metrics.result.value;
          if(!measurement || measurement.width!==width) throw Error(`Incorrect viewport for ${artifact}`);
          results.push({screen:artifact,...measurement});
          const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
          await fs.writeFile(path.join(directory,artifact+'.png'),Buffer.from(screenshot.data,'base64'));
          await send('Target.closeTarget',{targetId});
        }
        console.log(viewport+' / '+screen);
      }
    }
    await fs.writeFile(path.join(directory,'measurements.json'),JSON.stringify(results,null,2));
    const overflow=results.filter(result=>result.scrollWidth>result.width);
    if(overflow.length) throw Error('Horizontal overflow: '+overflow.map(result=>result.screen).join(', '));
    console.log(`${results.length} previews rendered with exact viewports and no horizontal overflow.`);
    await send('Browser.close');
  } finally { socket?.close(); if(browser.exitCode===null) browser.kill(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
