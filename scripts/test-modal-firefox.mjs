import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer as createSocketServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import { createServer, preview } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'test-results');
const development = process.argv.includes('--dev');
const configFile = resolve(root, 'vite.config.ts');
const server = development
  ? await createServer({ configFile, server: { host: '127.0.0.1', port: 0 } })
  : await preview({ configFile, preview: { host: '127.0.0.1', port: 0 } });

if (development) await server.listen();

const httpServer = server.httpServer;
const url = `http://127.0.0.1:${httpServer.address().port}`;

await mkdir(output, { recursive: true });

const profile = await mkdtemp(resolve(output, 'firefox-modal-'));
const listener = createSocketServer();

await new Promise((done) => listener.listen(0, '127.0.0.1', done));

const port = listener.address().port;

await new Promise((done) => listener.close(done));

const browser = spawn(
  process.env.FIREFOX_PATH ?? 'C:/Program Files/Mozilla Firefox/firefox.exe',
  ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', String(port)],
  { windowsHide: true, stdio: 'ignore' },
);
const pending = new Map();
let socket;
let context;
let sequence = 0;
let launchError;

browser.on('error', (error) => {
  launchError = error;
});

async function waitFor(probe, description) {
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (await probe()) return;

    await delay(100);
  }

  throw new Error('Timed out: ' + description);
}

function command(method, params) {
  const id = ++sequence;

  return new Promise((resolveResult, reject) => {
    pending.set(id, { resolve: resolveResult, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(source) {
  const result = await command('script.evaluate', {
    expression: `(async () => { const value = await (async () => { ${source} })(); return JSON.stringify(value); })()`,
    target: { context },
    awaitPromise: true,
  });

  if (result.type === 'exception') throw new Error(JSON.stringify(result.exceptionDetails));

  return JSON.parse(result.result.value);
}

try {
  await waitFor(async () => {
    const candidate = new globalThis.WebSocket(`ws://127.0.0.1:${port}/session`);

    return new Promise((done) => {
      candidate.onopen = () => {
        socket = candidate;
        done(true);
      };
      candidate.onerror = () => done(false);
    });
  }, 'Firefox WebDriver BiDi');

  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);

    if (!request) return;

    pending.delete(message.id);

    if (message.type === 'error') request.reject(new Error(JSON.stringify(message)));
    else request.resolve(message.result);
  };

  const session = await command('session.new', { capabilities: {} });

  console.log('Firefox ' + session.capabilities.browserVersion);

  ({ context } = await command('browsingContext.create', { type: 'tab' }));
  await command('browsingContext.navigate', { context, url, wait: 'complete' });
  await waitFor(() => evaluate('return !!document.querySelector(".dl-workbench");'), 'workbench');

  const preferences = await evaluate('return {systemReduced:matchMedia("(prefers-reduced-motion: reduce)").matches, overlay:CSS.supports("overlay","auto")};');

  console.log('Browser capabilities: ' + JSON.stringify(preferences));
  assert.equal(preferences.systemReduced, false, 'This animation regression needs system motion enabled.');

  await evaluate(`const trigger = document.querySelector('button[aria-label="Open notifications"]'); trigger.focus(); trigger.click(); return true;`);
  await waitFor(
    () =>
      evaluate(
        'const dialog=document.querySelector(".dl-notification-center"); return dialog.open && dialog.getAnimations({subtree:true}).every(a=>a.playState!=="running");',
      ),
    'notification entry',
  );

  const snapshot = await evaluate(`
    document.querySelector('.dl-notification-center .dl-dialog-close').click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const dialog=document.querySelector('.dl-notification-center');
    const style=getComputedStyle(dialog);

    return {open:dialog.open,display:style.display,opacity:Number(style.opacity),translate:style.translate,width:innerWidth,backdrop:Number(getComputedStyle(dialog,'::backdrop').opacity)};
  `);

  console.log('Notification exit: ' + JSON.stringify(snapshot));
  assert.notEqual(snapshot.display, 'none', 'Firefox must render the notification dialog during its exit.');
  assert.ok(snapshot.opacity > 0 && snapshot.opacity < 1, 'Firefox must fade the notification dialog.');
  assert.ok(snapshot.backdrop > 0 && snapshot.backdrop < 1, 'Firefox must fade its backdrop.');
  assert.ok(
    Number.parseFloat(snapshot.translate) > 0 && Number.parseFloat(snapshot.translate) < snapshot.width,
    'Firefox must slide the dialog through an intermediate position.',
  );

  await waitFor(
    () => evaluate('const dialog=document.querySelector(".dl-notification-center"); return !dialog.open && getComputedStyle(dialog).display==="none";'),
    'completed notification closure',
  );
  assert.equal(await evaluate('return document.activeElement?.getAttribute("aria-label");'), 'Open notifications');

  console.log('PASS Firefox notification history animates out, closes naturally, and restores focus');

  async function openNotifications() {
    await evaluate(`const trigger=document.querySelector('button[aria-label="Open notifications"]'); trigger.focus(); trigger.click(); return true;`);
    await waitFor(
      () =>
        evaluate(
          'const dialog=document.querySelector(".dl-notification-center"); return dialog.open && dialog.getAnimations({subtree:true}).every(a=>a.playState!=="running");',
        ),
      'settled notifications',
    );
  }

  async function expectNotificationExit() {
    await waitFor(() => evaluate('return !!globalThis.notificationExitSample;'), 'sampled notification exit');

    const state = await evaluate('return globalThis.notificationExitSample;');

    assert.equal(state.open, true, 'Firefox keeps the native modal open during its exit.');
    assert.notEqual(state.display, 'none');
    assert.ok(state.opacity > 0 && state.opacity < 1);
    await waitFor(() => evaluate('return !document.querySelector(".dl-notification-center").open;'), 'completed notification exit');
  }

  async function observeNotificationExit() {
    await evaluate(`
      globalThis.notificationExitSample=null;
      const dialog=document.querySelector('.dl-notification-center');
      const sample=(event)=>{
        if(event.propertyName!=='opacity' || event.pseudoElement) return;
        dialog.removeEventListener('transitionstart',sample);
        requestAnimationFrame(()=>{
          const style=getComputedStyle(dialog);
          globalThis.notificationExitSample={open:dialog.open,display:style.display,opacity:Number(style.opacity)};
        });
      };
      dialog.addEventListener('transitionstart',sample);
      return true;
    `);
  }

  await openNotifications();
  await observeNotificationExit();
  await command('input.performActions', {
    context,
    actions: [
      {
        type: 'key',
        id: 'keyboard',
        actions: [
          { type: 'keyDown', value: '\uE00C' },
          { type: 'keyUp', value: '\uE00C' },
        ],
      },
    ],
  });
  await expectNotificationExit();
  console.log('PASS Firefox Escape animates notification closure');

  await openNotifications();
  await observeNotificationExit();
  await command('input.performActions', {
    context,
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', x: 2, y: 2, origin: 'viewport', duration: 0 },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ],
  });
  await expectNotificationExit();
  console.log('PASS Firefox backdrop clicks animate notification closure');

  await openNotifications();
  await evaluate(`
    document.querySelector('.dl-notification-center .dl-dialog-close').click();
    await new Promise(requestAnimationFrame);
    document.querySelector('button[aria-label="Open notifications"]').click();
    return true;
  `);
  await delay(500);
  assert.equal(await evaluate('return document.querySelector(".dl-notification-center").open;'), true);
  await evaluate('document.querySelector(".dl-notification-center .dl-dialog-close").click(); return true;');
  await waitFor(() => evaluate('return !document.querySelector(".dl-notification-center").open;'), 'close reopened history');
  console.log('PASS Firefox rapid reopening cancels pending native closure');

  async function paletteCommand(title) {
    await evaluate(`document.querySelector('button[aria-label="Open command palette"]').click(); return true;`);
    await waitFor(() => evaluate('return document.querySelector(".dl-command-palette").open;'), 'command palette');
    await evaluate(
      `globalThis.openDialogCounts=[]; globalThis.modalMonitor=setInterval(()=>openDialogCounts.push(document.querySelectorAll('dialog[open]').length),5); [...document.querySelectorAll('.dl-palette-option')].find(node=>node.textContent.includes(${JSON.stringify(title)})).click(); return true;`,
    );
    await waitFor(() => evaluate('return document.querySelector(".dl-settings-dialog").open;'), 'command modal handoff');
    assert.equal(await evaluate('clearInterval(modalMonitor); return Math.max(...openDialogCounts,document.querySelectorAll("dialog[open]").length);'), 1);
  }

  await paletteCommand('Open settings');
  assert.equal(await evaluate('return document.activeElement?.getAttribute("aria-label");'), 'Close settings');
  await evaluate('document.querySelector(".dl-settings-dialog .dl-dialog-close").click(); return true;');
  await waitFor(() => evaluate('return !document.querySelector(".dl-settings-dialog").open;'), 'close Settings');
  console.log('PASS Firefox palette waits for its exit before handing focus to Settings');

  await paletteCommand('Open preferences');
  await evaluate(`
    const select=document.querySelectorAll('.dl-settings-dialog select')[1];
    select.value='reduced'; select.dispatchEvent(new Event('change',{bubbles:true}));
    [...document.querySelectorAll('.dl-settings-dialog button')].find(button=>button.textContent==='Apply preferences').click();
    return true;
  `);
  await waitFor(() => evaluate('return !document.querySelector(".dl-settings-dialog").open;'), 'apply reduced motion');
  await openNotifications();
  assert.equal(await evaluate('return document.querySelector(".dl-theme").dataset.motion;'), 'reduced');
  await evaluate('document.querySelector(".dl-notification-center .dl-dialog-close").click(); return true;');
  assert.equal(
    await evaluate('await new Promise(requestAnimationFrame); return getComputedStyle(document.querySelector(".dl-notification-center")).display;'),
    'none',
  );
  console.log('PASS Firefox reduced motion closes notification history immediately');
} catch (error) {
  if (context) {
    console.error(
      await evaluate(
        `const dialog=document.querySelector('.dl-notification-center'); return {open:dialog?.open,closing:dialog?.hasAttribute('data-closing'),opacity:dialog?getComputedStyle(dialog).opacity:null,motion:document.querySelector('.dl-theme')?.dataset.motion};`,
      ),
    );
    const screenshot = await command('browsingContext.captureScreenshot', { context });

    await writeFile(resolve(output, 'firefox-modal-failure.png'), Buffer.from(screenshot.data, 'base64'));
  }

  throw error;
} finally {
  if (socket?.readyState === 1) await command('session.end', {}).catch(() => {});

  socket?.close();
  browser.kill();

  if (development) await server.close();
  else await new Promise((done) => httpServer.close(done));
}
