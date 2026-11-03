import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const browserPath = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const url = process.argv[2] ?? 'http://127.0.0.1:4173';
const output = resolve('test-results');

await mkdir(output, { recursive: true });

const profile = await mkdtemp(`${output}/browser-`);

const browser = spawn(
  browserPath,
  ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' },
);

let launchError;

browser.on('error', (error) => {
  launchError = error;
});

let socket;
let sequence = 0;
const pending = new Map();
const errors = [];
const fileChoosers = [];

async function waitFor(probe, description) {
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (await probe()) return;

    await delay(100);
  }

  throw new Error(`Timed out: ${description}`);
}

function command(method, params = {}) {
  const id = ++sequence;

  return new Promise((resolveResult, reject) => {
    pending.set(id, { resolve: resolveResult, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });

  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);

  return result.result.value;
}

async function check(expression, description) {
  assert.equal(await evaluate(expression), true, description);

  console.log(`PASS ${description}`);
}

async function click(label) {
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(label)}).click()`);
}

async function toggleChromePart(part) {
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey(part === 'header' ? 'h' : 'b', part === 'header' ? 'KeyH' : 'KeyB', 3);
}

async function screenshot(name) {
  await waitFor(
    () =>
      evaluate(
        '[...document.querySelectorAll(".dl-modal,.dl-notification-toast")].every(node => node.getAnimations({subtree:true}).every(animation => animation.playState !== "running"))',
      ),
    'settled overlay screenshot',
  );

  const result = await command('Page.captureScreenshot', { format: 'png' });

  await writeFile(`${output}/${name}.png`, Buffer.from(result.data, 'base64'));
}

async function reload() {
  const origin = await evaluate('performance.timeOrigin');

  await command('Page.reload', { ignoreCache: true });

  await waitFor(
    () => evaluate(`performance.timeOrigin !== ${origin} && document.querySelectorAll('.dv-tab').length === 3 && !!document.querySelector('#hello-name')`),
    'reload demo',
  );
}

async function checkModalExit(selector, close, description, horizontal = false, title) {
  await waitFor(
    () => evaluate(`document.querySelector(${JSON.stringify(selector)}).getAnimations({subtree:true}).every(animation => animation.playState !== 'running')`),
    'settled modal before closing',
  );
  await close();

  const snapshot = await evaluate(`(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const dialog = document.querySelector(${JSON.stringify(selector)});
    const animations = dialog.getAnimations({subtree:true});

    globalThis.modalExitAnimations = animations;

    for (const animation of animations) {
      animation.pause();
      animation.currentTime = Number(animation.effect.getTiming().duration) / 2;
    }

    const style = getComputedStyle(dialog);
    const backdrop = getComputedStyle(dialog, '::backdrop');

    return {open:dialog.open,display:style.display,overlay:style.overlay,opacity:Number(style.opacity),translate:style.translate,backdrop:Number(backdrop.opacity),title:dialog.querySelector('h2')?.textContent};
  })()`);

  assert.equal(snapshot.open, false, 'Native close releases modal state immediately');
  assert.notEqual(snapshot.display, 'none', 'The closing modal stays rendered');
  assert.equal(snapshot.overlay, 'auto', 'The closing modal stays in the top layer');
  assert.ok(snapshot.opacity > 0 && snapshot.opacity < 1, 'The modal fades out: ' + JSON.stringify(snapshot));
  assert.ok(snapshot.backdrop > 0 && snapshot.backdrop < 1, 'The backdrop fades out: ' + JSON.stringify(snapshot));

  const [x, y = 0] = snapshot.translate.split(' ').map(Number.parseFloat);

  assert.ok(horizontal ? x > 0 : y < 0, 'The modal slides out in its entry direction');

  if (title) assert.equal(snapshot.title, title, 'Closing preserves the displayed page');

  await screenshot(horizontal ? 'demo-notifications-exit' : 'demo-modal-exit');
  await evaluate('globalThis.modalExitAnimations.forEach(animation => animation.finish()); delete globalThis.modalExitAnimations');
  await waitFor(() => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).display === 'none'`), 'completed modal exit');

  console.log('PASS ' + description);
}

async function pressKey(key, code, modifiers = 0, windowsVirtualKeyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 13) {
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
}

async function searchPalette(text) {
  await evaluate('document.querySelector(".dl-palette-search input").focus(); document.querySelector(".dl-palette-search input").select()');
  await command('Input.insertText', { text });
}

async function clickBackdrop() {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: 2, y: 2 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: 2, y: 2 });
}

async function clickText(selector, text) {
  let point;

  await waitFor(async () => {
    const previousPoint = point;

    point = await evaluate(`(() => {
      for (const node of document.querySelectorAll(${JSON.stringify(selector)})) {
        if (node.textContent.trim() !== ${JSON.stringify(text)}) continue;
        const rect = node.getBoundingClientRect();
        const popup = node.closest('.ant-dropdown');
        if (!rect.width) continue;
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        if (node.contains(document.elementFromPoint(x, y)) && !popup?.getAnimations({subtree: true}).some(animation => animation.playState === 'running')) return {x, y};
      }
      return null;
    })()`);

    return point !== null && previousPoint?.x === point.x && previousPoint?.y === point.y;
  }, `visible, settled control: ${text}`);

  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}

async function openMenuItem(text, parent = 'File') {
  await evaluate('document.querySelector(".dl-menu-trigger").click()');
  await waitFor(() => evaluate('document.querySelector(".dl-menu-trigger").getAttribute("aria-expanded") === "true"'), 'application menu');

  const expanded = await evaluate(
    `[...document.querySelectorAll('[role=menuitem]')].find(node => node.textContent.trim() === ${JSON.stringify(parent)} && node.getBoundingClientRect().width)?.getAttribute('aria-expanded') === 'true'`,
  );

  if (!expanded) await clickText('[role=menuitem]', parent);

  await waitFor(
    () =>
      evaluate(
        `[...document.querySelectorAll('[role=menuitem]')].some(node => node.textContent.trim() === ${JSON.stringify(text)} && node.getBoundingClientRect().width > 0)`,
      ),
    'File submenu',
  );

  await clickText('[role=menuitem]', text);
}

async function openPreferences() {
  await openMenuItem('Preferences');

  await waitFor(
    () => evaluate('document.querySelector(".dl-settings-dialog").open && document.querySelector(".dl-settings-dialog h2").textContent === "Preferences"'),
    'preferences dialog',
  );
}

async function chooseSelect(index, value) {
  await evaluate(`document.querySelectorAll('.dl-settings-dialog select')[${index}].focus()`);
  await pressKey('Home', 'Home', 0, 36);

  const position = await evaluate(
    `[...document.querySelectorAll('.dl-settings-dialog select')[${index}].options].findIndex(option => option.value === ${JSON.stringify(value)})`,
  );

  assert.ok(position >= 0, `Select contains ${value}`);

  for (let step = 0; step < position; step++) await pressKey('ArrowDown', 'ArrowDown', 0, 40);

  await pressKey('Tab', 'Tab', 0, 9);
}

async function importConfiguration(path, fromSettings = false) {
  const previous = fileChoosers.length;

  if (fromSettings) await clickText('.dl-settings-dialog button', 'Import configuration');
  else await openMenuItem('Import configuration…');

  await waitFor(() => fileChoosers.length > previous, 'native configuration file chooser');
  await command('DOM.setFileInputFiles', { files: [resolve(path)], backendNodeId: fileChoosers.at(-1).backendNodeId });
}

try {
  let port;

  await waitFor(async () => {
    try {
      port = Number((await readFile(`${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]);

      return port > 0;
    } catch {
      return false;
    }
  }, 'headless browser startup');

  const response = await globalThis.fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const target = await response.json();

  socket = new globalThis.WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolveOpen, reject) => {
    socket.onopen = resolveOpen;
    socket.onerror = reject;
  });

  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);

    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Page.fileChooserOpened') fileChoosers.push(message.params);

    const request = pending.get(message.id);

    if (request) {
      pending.delete(message.id);

      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
  };

  socket.onclose = () => {
    for (const request of pending.values()) request.reject(new Error('Browser connection closed.'));

    pending.clear();
  };

  await command('Runtime.enable');
  await command('Page.enable');
  await command('Page.setInterceptFileChooserDialog', { enabled: true });
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await waitFor(() => evaluate('document.querySelectorAll(".dv-tab").length === 3 && !!document.querySelector("#hello-name")'), 'Hello World panels');
  await waitFor(() => evaluate('document.querySelector(".dl-dock").getBoundingClientRect().height > 400'), 'workspace after viewport resize');
  await check('document.querySelector(".dl-dock").getBoundingClientRect().height > 400', 'Dockview has usable workspace dimensions');
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Ada' });
  await evaluate('document.querySelector(".hello-form button").click()');
  await waitFor(() => evaluate('document.querySelector(".hello-result").textContent === "Hello, Ada!"'), 'greeting interaction');
  await check('document.querySelector(".hello-result").textContent === "Hello, Ada!"', 'Hello World handles real input');
  await evaluate('globalThis.testPanel = document.querySelector(".hello-world"); true');
  await click('Hide header and footer');
  await waitFor(() => evaluate('!document.querySelector(".dl-header") && !document.querySelector(".dl-footer")'), 'combined View hide');

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector("#hello-name").value === "Ada"',
    'One View control hides header and footer without resetting the panel',
  );

  await click('Show header and footer');
  await waitFor(() => evaluate('!!document.querySelector(".dl-header") && !!document.querySelector(".dl-footer")'), 'combined View show');
  await toggleChromePart('header');
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'hide header');
  await toggleChromePart('footer');
  await waitFor(() => evaluate('!document.querySelector(".dl-footer")'), 'hide footer');
  await click('Enter focus mode');
  await waitFor(() => evaluate('!!document.querySelector(".dl-exit-focus")'), 'enter focus mode');

  await check(
    '!document.querySelector(".dl-control-bar") && !document.querySelector(".dl-monitoring-bar") && document.activeElement === document.querySelector(".dl-exit-focus")',
    'Focus hides chrome and moves keyboard focus to the exit control',
  );

  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(() => evaluate('!document.querySelector(".dl-exit-focus")'), 'exit focus mode');

  await check(
    '!document.querySelector(".dl-header") && !document.querySelector(".dl-footer") && !!document.querySelector(".dl-control-bar") && document.activeElement?.getAttribute("aria-label") === "Enter focus mode"',
    'Escape restores visibility preferences and keyboard focus',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector("#hello-name").value === "Ada"',
    'Visibility changes preserve panel instances and input state',
  );

  await toggleChromePart('header');
  await toggleChromePart('footer');
  await waitFor(() => evaluate('!!document.querySelector(".dl-header") && !!document.querySelector(".dl-footer")'), 'restore chrome');
  await check('getComputedStyle(document.querySelector(".dl-header")).transitionDuration.split(",")[0].trim() === "0.18s"', 'Theme transitions are enabled');
  await screenshot('demo-light');
  await evaluate('globalThis.lightInputBackground = getComputedStyle(document.querySelector("#hello-name")).backgroundColor');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  await check(
    'getComputedStyle(document.querySelector(".dl-header")).transitionDuration.split(",")[0].trim() === "0s"',
    'Reduced motion disables theme transitions',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector(".hello-result").textContent === "Hello, Ada!"',
    'Changing reduced-motion preferences preserves panel state',
  );

  await click('Switch to dark theme');
  await waitFor(() => evaluate('document.querySelector(".dl-theme").dataset.theme === "dark"'), 'dark theme');

  await waitFor(
    () =>
      evaluate(
        '!!document.querySelector(".dl-workspace .dockview-theme-dark") && getComputedStyle(document.querySelector("#hello-name")).backgroundColor !== globalThis.lightInputBackground',
      ),
    'Ant Design and Dockview dark theme application',
  );

  await check(
    '!!document.querySelector(".dl-workspace .dockview-theme-dark") && getComputedStyle(document.querySelector("#hello-name")).backgroundColor !== globalThis.lightInputBackground',
    'Dockview and real Ant Design inputs follow the dark theme',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector(".hello-result").textContent === "Hello, Ada!" && document.querySelectorAll(".dv-tab").length === 3',
    'Theme switching preserves panels, layout, and component state',
  );

  for (const [family, label] of [
    ['emerald', 'Emerald'],
    ['umber', 'Umber'],
    ['contrast', 'High Contrast'],
    ['azure', 'Azure'],
  ]) {
    await openMenuItem(label, 'Theme');
    await waitFor(() => evaluate(`document.querySelector('.dl-theme').dataset.themeFamily === '${family}'`), `${family} palette`);
    await check(
      `document.querySelector('.dl-theme').dataset.theme === 'dark' && document.querySelector('.hello-world') === globalThis.testPanel && document.querySelector('#hello-name').value === 'Ada'`,
      `${label} keeps mode and mounted panel state`,
    );
    await click('Switch to light theme');
    await waitFor(() => evaluate(`document.querySelector('.dl-theme').dataset.theme === 'light'`), `${family} light`);
    await check(`document.querySelector('.dl-theme').dataset.themeFamily === '${family}'`, `${label} has an independent light variant`);
    await screenshot(`theme-${family}-light`);
    await click('Switch to dark theme');
    await waitFor(() => evaluate(`document.querySelector('.dl-theme').dataset.theme === 'dark'`), `${family} dark`);
    await screenshot(`theme-${family}-dark`);
  }

  await screenshot('demo-dark');
  await click('Switch to light theme');
  await waitFor(() => evaluate('document.querySelector(".dl-theme").dataset.theme === "light"'), 'light theme');

  await check(
    '!!document.querySelector(".dl-workspace .dockview-theme-light") && getComputedStyle(document.querySelector("#hello-name")).backgroundColor === globalThis.lightInputBackground',
    'Light theme is restored consistently',
  );

  await click('Columns layout');

  await waitFor(
    () =>
      evaluate(
        'Math.abs(document.querySelector(".hello-world").getBoundingClientRect().top - document.querySelector(".demo-guide").getBoundingClientRect().top) < 3 && document.querySelector(".demo-playground").getBoundingClientRect().left > document.querySelector(".demo-guide").getBoundingClientRect().left',
      ),
    'columns preset',
  );

  const sash = await evaluate(`(() => {
    const node = [...document.querySelectorAll('.dv-horizontal > .dv-sash-container > .dv-sash')].find(node => node.getBoundingClientRect().height > 100);
    const rect = node.getBoundingClientRect();
    return {x:rect.x + rect.width/2,y:rect.y + rect.height/2};
  })()`);
  const beforeResize = await evaluate('document.querySelector(".hello-world").getBoundingClientRect().width');

  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...sash });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...sash });
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: sash.x + 75, y: sash.y });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: sash.x + 75, y: sash.y });
  await waitFor(() => evaluate(`Math.abs(document.querySelector('.hello-world').getBoundingClientRect().width - ${beforeResize}) > 40`), 'manual panel resize');
  await toggleChromePart('header');
  await waitFor(
    () => evaluate(`JSON.parse(localStorage.getItem('dash-lab:dash.lab:layout:v1')).headerVisible === false`),
    'automatic custom layout and settings save',
  );
  await evaluate(
    `globalThis.customLayout = localStorage.getItem('dash-lab:dash.lab:layout:v1'); globalThis.customWidth = document.querySelector('.hello-world').getBoundingClientRect().width; true`,
  );
  await check(
    `!document.querySelector('button[aria-label="Save layout"]') && !document.querySelector('button[aria-label="Restore saved layout"]') && !document.querySelector('button[aria-label="Reset layout"]')`,
    'Toolbar offers a custom preset instead of manual save/restore/reset',
  );
  await click('Rows layout');

  await waitFor(
    () => evaluate('document.querySelector(".demo-guide").getBoundingClientRect().top > document.querySelector(".hello-world").getBoundingClientRect().top'),
    'rows preset',
  );

  await openMenuItem('High Contrast', 'Theme');
  await command('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('new Promise(resolve => setTimeout(resolve, 350))');
  await check(
    `localStorage.getItem('dash-lab:dash.lab:layout:v1') === globalThis.customLayout`,
    'Theme and host-window resizing preserve the saved custom layout',
  );
  await openMenuItem('Azure', 'Theme');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('new Promise(resolve => setTimeout(resolve, 350))');
  await check(`localStorage.getItem('dash-lab:dash.lab:layout:v1') === globalThis.customLayout`, 'Selecting a preset preserves the saved custom arrangement');
  await click('Custom layout');
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'restore saved chrome');

  await waitFor(
    () =>
      evaluate(
        'Math.abs(document.querySelector(".hello-world").getBoundingClientRect().top - document.querySelector(".demo-guide").getBoundingClientRect().top) < 3',
      ),
    'restored columns geometry',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector(".hello-result").textContent === "Hello, Ada!" && Math.abs(document.querySelector(".hello-world").getBoundingClientRect().top - document.querySelector(".demo-guide").getBoundingClientRect().top) < 3',
    'Presets and saved layout restoration preserve the live panel state',
  );

  await check(
    'Math.abs(document.querySelector(".hello-world").getBoundingClientRect().width - globalThis.customWidth) < 3',
    'Custom layout restores manually resized panel dimensions',
  );
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Unsaved plugin edit' });
  await evaluate('document.querySelector(".hello-form button").click()');
  await click('Custom layout');
  await waitFor(() => evaluate('document.querySelector("#hello-name").value === "Ada"'), 'plugin checkpoint restoration');
  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && document.querySelector(".hello-result").textContent === "Hello, Ada!"',
    'Restore layout also restores registered plugin state without replacing its panel',
  );

  await click('Application layout');

  await waitFor(
    () =>
      evaluate(
        '!document.querySelector(".dl-header") && document.querySelector(".demo-playground").getBoundingClientRect().top > document.querySelector(".demo-guide").getBoundingClientRect().top',
      ),
    'reset layout',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && !Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label") === "Custom layout").disabled',
    'Application preset preserves the custom layout and chrome settings',
  );

  await reload();
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'restore persisted header preference');
  await check('document.querySelector("#hello-name").value === "Ada"', 'Registered plugin state survives a full reload with its saved layout');

  await check(
    'Math.abs(document.querySelector(".hello-world").getBoundingClientRect().top - document.querySelector(".demo-guide").getBoundingClientRect().top) < 3',
    'Saved layout and chrome survive a full page reload',
  );

  await evaluate('localStorage.setItem("dash-lab:dash.lab:layout:v1", "not-json")');
  await reload();
  await waitFor(() => evaluate('!!document.querySelector(".dl-notification-toast[role=alert]")'), 'invalid storage feedback');

  await check(
    '!!document.querySelector(".dl-header") && document.querySelectorAll(".dv-tab").length === 3',
    'Corrupt persisted state falls back to the usable application layout',
  );

  await evaluate(
    'globalThis.originalStorageWrite = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error("Storage blocked"); }; true',
  );

  await toggleChromePart('header');

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent.includes("Browser storage is unavailable")'),
    'blocked storage feedback',
  );

  await check(
    '!Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label") === "Custom layout").disabled && document.querySelectorAll(".dv-tab").length === 3',
    'Unavailable storage leaves a usable in-memory checkpoint',
  );

  await evaluate('Storage.prototype.setItem = globalThis.originalStorageWrite; true');
  if (!(await evaluate('!!document.querySelector(".dl-header")'))) await toggleChromePart('header');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('s', 'KeyS', 3);
  await screenshot('demo-layout-management');
  await click('Open notifications');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-center").open'), 'open notification history');

  await check(
    'document.activeElement?.getAttribute("aria-label") === "Close notifications" && document.querySelectorAll(".dl-notification-entry").length >= 3',
    'Notification history includes layout actions and takes keyboard focus',
  );

  await evaluate('[...document.querySelectorAll(".dl-notification-actions button")].find(button => button.textContent === "Clear history").click()');
  await click('Close notifications');
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-center").open'), 'close history');
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Ada' });
  await evaluate('document.querySelector(".hello-form button").click()');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Hello, Ada!"'), 'greeting notification');
  await click('Dismiss notification: Hello, Ada!');

  await check(
    '!document.querySelector(".dl-notification-toast") && document.querySelector(".dl-notification-count")?.textContent === "1"',
    'Dismissing a toast keeps its unread history entry',
  );

  await click('Open notifications');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-center").open'), 'inspect greeting history');
  await click('Mark as read: Hello, Ada!');

  await check(
    '!document.querySelector(".dl-notification-count") && document.querySelector(".dl-notification-entry")?.dataset.read === "true"',
    'Acknowledgment updates the unread badge and history',
  );

  await evaluate('[...document.querySelectorAll(".dl-notification-actions button")].find(button => button.textContent === "Clear history").click()');
  await click('Close notifications');
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-center").open'), 'close cleared history');

  await evaluate(
    '[...document.querySelectorAll(".demo-notification-controls button")].find(button => button.textContent === "Send info").click(); [...document.querySelectorAll(".demo-notification-controls button")].find(button => button.textContent === "Send error").click()',
  );

  await waitFor(() => evaluate('!!document.querySelector(".dl-notification-toast[role=alert]")'), 'error notification');
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-toast[data-level=info]")'), 'informational toast timeout');

  await check(
    '!!document.querySelector(".dl-notification-toast[data-level=error]") && document.querySelector(".dl-notification-count")?.textContent === "2"',
    'Toast expiry preserves history while errors remain visible',
  );

  await click('Open notifications');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-center").open'), 'inspect timed notification history');
  await check('document.querySelectorAll(".dl-notification-entry").length === 2', 'Timed-out notifications remain available in history');
  await evaluate('[...document.querySelectorAll(".dl-notification-actions button")].find(button => button.textContent === "Mark all read").click()');
  await click('Remove notification: A workspace update');
  await screenshot('demo-notifications');

  await check(
    'document.querySelectorAll(".dl-notification-entry").length === 1 && !document.querySelector(".dl-notification-count")',
    'History supports marking all read and individual removal',
  );

  await evaluate('[...document.querySelectorAll(".dl-notification-actions button")].find(button => button.textContent === "Clear history").click()');

  await check(
    '!!document.querySelector(".dl-notification-empty") && !document.querySelector(".dl-notification-toast")',
    'Clearing history also clears active toasts',
  );

  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-center").open'), 'close notification history with Escape');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('Enter', 'Enter', 2);
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Command executed"'), 'custom keyboard command');
  await check('document.querySelector(".dl-notification-count")?.textContent === "1"', 'An application command executes once through its keyboard shortcut');
  await evaluate('document.querySelector("#demo-note").focus()');
  await pressKey('Enter', 'Enter', 2);
  await check('document.querySelector(".dl-notification-count")?.textContent === "1"', 'Application shortcuts leave text-entry shortcuts available by default');

  await evaluate(
    'globalThis.editableProbe = document.createElement("div"); globalThis.editableProbe.contentEditable = "true"; globalThis.editableProbe.textContent = "Editable area"; document.querySelector(".dl-workbench").appendChild(globalThis.editableProbe); globalThis.editableProbe.focus()',
  );

  await pressKey('Enter', 'Enter', 2);
  await check('document.querySelector(".dl-notification-count")?.textContent === "1"', 'Contenteditable regions keep their default shortcut behavior');
  await evaluate('globalThis.editableProbe.remove(); document.querySelector("#demo-note").focus()');
  await pressKey('h', 'KeyH', 3);
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'header shortcut in an input');
  await check('document.activeElement?.id === "demo-note"', 'Explicit workbench shortcuts work in inputs without stealing focus');
  await pressKey('h', 'KeyH', 3);
  await waitFor(() => evaluate('!!document.querySelector(".dl-header")'), 'show header shortcut');

  await evaluate(
    'globalThis.outsideProbe = document.createElement("button"); globalThis.outsideProbe.textContent = "Outside workbench"; document.body.appendChild(globalThis.outsideProbe); globalThis.outsideProbe.focus()',
  );

  await pressKey('h', 'KeyH', 3);
  await check('!!document.querySelector(".dl-header")', 'Shortcuts do not capture keys outside the active workbench');
  await evaluate('globalThis.outsideProbe.remove(); document.querySelector("#demo-note").focus()');
  await pressKey('t', 'KeyT', 3);
  await waitFor(() => evaluate('document.querySelector(".dl-theme").dataset.theme === "dark"'), 'theme command shortcut');
  await pressKey('t', 'KeyT', 3);
  await waitFor(() => evaluate('document.querySelector(".dl-theme").dataset.theme === "light"'), 'restore theme command shortcut');
  await pressKey('f', 'KeyF', 3);
  await waitFor(() => evaluate('!!document.querySelector(".dl-exit-focus")'), 'focus command shortcut');
  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-exit-focus")'), 'focus exit command');
  await check('document.activeElement?.getAttribute("aria-label") === "Enter focus mode"', 'Focus commands preserve Escape and keyboard focus restoration');
  await pressKey('s', 'KeyS', 3);
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Layout saved."'), 'save layout shortcut');
  await pressKey('3', 'Digit3', 3);

  await waitFor(
    () => evaluate('document.querySelector(".demo-guide").getBoundingClientRect().top > document.querySelector(".hello-world").getBoundingClientRect().top'),
    'rows shortcut',
  );

  await pressKey('r', 'KeyR', 3);

  await waitFor(
    () =>
      evaluate('document.querySelector(".demo-playground").getBoundingClientRect().left > document.querySelector(".hello-world").getBoundingClientRect().left'),
    'restore layout shortcut',
  );

  await check(
    'document.querySelectorAll(".dv-tab").length === 3 && document.querySelector(".hello-result").textContent === "Hello, Ada!"',
    'Layout commands use the same state-preserving actions as the toolbar',
  );

  await evaluate('[...document.querySelectorAll(".demo-command-examples button")].find(button => button.textContent === "Try failed command").click()');

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast[role=alert] strong")?.textContent === "Command failed: Example failed action"'),
    'asynchronous command error feedback',
  );

  await check('document.querySelectorAll(".dv-tab").length === 3', 'Asynchronous command errors enter notification history and keep the workspace usable');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('n', 'KeyN', 3);
  await waitFor(() => evaluate('document.querySelector(".dl-notification-center").open'), 'open notifications shortcut');
  await pressKey('h', 'KeyH', 3);

  await check(
    '!!document.querySelector(".dl-header") && document.activeElement?.getAttribute("aria-label") === "Close notifications"',
    'Modal dialogs retain their keyboard scope',
  );

  await screenshot('demo-commands');
  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-center").open'), 'dismiss command history');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('P', 'KeyP', 10);

  await waitFor(
    () => evaluate('document.querySelector(".dl-command-palette").open && document.activeElement?.getAttribute("aria-label") === "Search commands"'),
    'open command palette shortcut',
  );

  await searchPalette('no-such-action-zzzz');
  await waitFor(() => evaluate('!!document.querySelector(".dl-palette-empty")'), 'empty command search');

  await check(
    'document.querySelector(".dl-palette-empty").textContent === "No commands match your search."',
    'The palette presents an explicit empty search state',
  );

  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-command-palette").open'), 'dismiss empty palette');
  await check('document.activeElement === document.querySelector(".dl-workbench")', 'Dismissing the palette restores keyboard focus');
  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'open palette from toolbar');
  await searchPalette('workbench.focus.exit');
  await waitFor(() => evaluate('document.querySelectorAll(".dl-palette-option").length === 1'), 'disabled command result');
  await pressKey('Enter', 'Enter');

  await check(
    'document.querySelector(".dl-command-palette").open && document.querySelector(".dl-palette-option").getAttribute("aria-disabled") === "true" && !document.querySelector(".dl-palette-search input").getAttribute("aria-activedescendant")',
    'Unavailable commands cannot be selected or executed',
  );

  await searchPalette('workbench.header.toggle');
  await pressKey('Enter', 'Enter');

  await waitFor(
    () => evaluate('!document.querySelector(".dl-command-palette").open && !document.querySelector(".dl-header")'),
    'execute palette command by ID',
  );

  await check('document.querySelector(".hello-result").textContent === "Hello, Ada!"', 'The palette executes the existing action without resetting panels');
  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'recent palette commands');
  await waitFor(() => evaluate('document.querySelector(".dl-palette-search input").value === ""'), 'reset palette query');

  await check(
    'document.querySelector(".dl-palette-option").textContent.includes("Toggle header") && document.querySelector(".dl-palette-search input").value === ""',
    'Recent successful commands lead the next empty search',
  );

  await pressKey('Enter', 'Enter');

  await waitFor(
    () => evaluate('!!document.querySelector(".dl-header") && !document.querySelector(".dl-command-palette").open'),
    'restore header through recent command',
  );

  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'palette navigation');
  await searchPalette('layout');

  const firstOption = await evaluate('document.querySelector(".dl-palette-search input").getAttribute("aria-activedescendant")');

  await pressKey('ArrowDown', 'ArrowDown', 0, 40);

  await check(
    `document.querySelector('.dl-palette-search input').getAttribute('aria-activedescendant') !== ${JSON.stringify(firstOption)} && document.activeElement?.getAttribute('aria-label') === 'Search commands'`,
    'Arrow navigation changes the active option while keeping focus in the search field',
  );

  await pressKey('ArrowUp', 'ArrowUp', 0, 38);

  await check(
    `document.querySelector('.dl-palette-search input').getAttribute('aria-activedescendant') === ${JSON.stringify(firstOption)}`,
    'Arrow navigation returns to the previous command',
  );

  await screenshot('demo-command-palette');
  await searchPalette('workbench.notifications.open');
  await pressKey('Enter', 'Enter');

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-center").open && !document.querySelector(".dl-command-palette").open'),
    'palette dialog handoff',
  );

  await check('document.querySelectorAll("dialog[open]").length === 1', 'Palette actions hand focus to the next dialog without stacking modals');
  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-notification-center").open'), 'close palette-opened notification history');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('f', 'KeyF', 3);
  await waitFor(() => evaluate('!!document.querySelector(".dl-exit-focus")'), 'focus before palette');
  await pressKey('P', 'KeyP', 10);
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'palette while focused');
  await searchPalette('workbench.focus.exit');
  await pressKey('Enter', 'Enter');

  await waitFor(
    () => evaluate('!document.querySelector(".dl-exit-focus") && !document.querySelector(".dl-command-palette").open'),
    'exit focus through palette',
  );

  await check('document.activeElement?.getAttribute("aria-label") === "Enter focus mode"', 'The palette respects live availability and focus-mode restoration');
  await evaluate('document.querySelector(".dl-menu-trigger").focus()');
  await pressKey('ArrowDown', 'ArrowDown', 0, 40);

  await waitFor(
    () => evaluate('document.activeElement?.getAttribute("role") === "menuitem" && document.activeElement.textContent.trim() === "File"'),
    'keyboard application menu',
  );

  await pressKey('ArrowRight', 'ArrowRight', 0, 39);

  await waitFor(
    () => evaluate('document.activeElement?.getAttribute("role") === "menuitem" && document.activeElement.textContent.trim() === "Settings"'),
    'keyboard submenu focus',
  );

  await waitFor(
    () =>
      evaluate(
        '[...document.querySelectorAll("[role=menuitem]")].some(node => node.textContent.trim() === "Settings" && node.getBoundingClientRect().width > 0)',
      ),
    'keyboard File submenu',
  );

  await pressKey('Enter', 'Enter');
  await waitFor(() => evaluate('document.querySelector(".dl-settings-dialog").open'), 'keyboard settings dialog');

  await check(
    'document.querySelector(".dl-settings-dialog h2").textContent === "Settings" && document.activeElement?.getAttribute("aria-label") === "Close settings"',
    'The hamburger menu opens File > Settings entirely by keyboard',
  );

  await evaluate('document.querySelectorAll(".dl-settings-dialog input[type=checkbox]")[0].click()');
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'settings header choice');
  await waitFor(() => evaluate(`JSON.parse(localStorage.getItem('dash-lab:dash.lab:layout:v1')).headerVisible === false`), 'settings saved automatically');
  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'close settings');

  await check(
    'document.activeElement === document.querySelector(".dl-menu-trigger") && document.querySelector(".hello-result").textContent === "Hello, Ada!"',
    'Settings preserve panel content and restore focus to the menu trigger',
  );

  await reload();
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'saved settings on reload');
  await check('!document.querySelector(".dl-header") && !!document.querySelector(".dl-footer")', 'Settings save through the existing workspace checkpoint');
  await toggleChromePart('header');
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Ada' });
  await evaluate('document.querySelector(".hello-form button").click(); globalThis.configurationPanel = document.querySelector(".hello-world"); true');
  await openPreferences();
  await chooseSelect(0, 'dark');
  await clickText('.dl-settings-dialog button', 'Cancel');
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'cancel preference draft');
  await check('document.querySelector(".dl-theme").dataset.theme === "light"', 'Cancel discards preference edits');
  await openPreferences();
  await chooseSelect(0, 'dark');
  await chooseSelect(1, 'reduced');
  await chooseSelect(3, 'emerald');
  await evaluate('document.querySelector(".dl-settings-dialog input[type=checkbox]").click()');

  await evaluate(
    'document.querySelector(".dl-settings-dialog input[type=number]").focus(); document.querySelector(".dl-settings-dialog input[type=number]").select()',
  );

  await command('Input.insertText', { text: '2' });
  await screenshot('demo-preferences');
  await clickText('.dl-settings-dialog button', 'Apply preferences');

  await waitFor(
    () => evaluate('!document.querySelector(".dl-settings-dialog").open && document.querySelector(".dl-theme").dataset.theme === "dark"'),
    'apply preference draft',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.configurationPanel && document.querySelector(".hello-result").textContent === "Hello, Ada!" && getComputedStyle(document.querySelector(".dl-header")).transitionDuration.split(",")[0].trim() === "0s"',
    'Applying theme and motion preferences preserves mounted panels and their state',
  );

  await check('document.querySelectorAll(".dl-notification-toast").length === 0', 'Disabling popups dismisses active toasts');
  await reload();
  await waitFor(() => evaluate('document.querySelector(".dl-theme").dataset.theme === "dark"'), 'restore preferences on reload');

  await check(
    '!!document.querySelector(".dl-header") && document.querySelector(".dl-theme").dataset.motion === "reduced"',
    'Preferences and chrome settings both persist automatically',
  );

  await check('document.querySelector(".dl-theme").dataset.themeFamily === "emerald"', 'Selected theme family survives reload independently of light/dark');
  await openPreferences();

  await check(
    '!document.querySelector(".dl-settings-dialog input[type=checkbox]").checked && document.querySelector(".dl-settings-dialog input[type=number]").value === "2"',
    'Notification visibility and duration persist across reload',
  );

  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'close restored preferences');

  const downloads = await mkdtemp(`${output}/downloads-`);

  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: resolve(downloads) });
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Exported' });
  await evaluate('document.querySelector(".hello-form button").click()');
  await openMenuItem('Export configuration…');

  const exportedPath = `${downloads}/dash-lab-configuration.json`;

  await waitFor(async () => {
    try {
      JSON.parse(await readFile(exportedPath, 'utf8'));

      return true;
    } catch {
      return false;
    }
  }, 'download configuration JSON');

  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));

  assert.equal(exported.format, 'dash-lab');
  assert.equal(exported.version, 1);
  assert.equal(exported.workspace.headerVisible, true);
  assert.equal(exported.preferences.theme, 'dark');
  assert.equal(exported.preferences.themeFamily, 'emerald');
  assert.equal(exported.preferences.notifications.toastDurationMs, 2000);
  assert.deepEqual(exported.plugins, { 'hello-world': { version: 1, name: 'Exported', greeting: 'Hello, Exported!' } });
  assert.equal(Object.hasOwn(exported.workspace, 'plugins'), false);
  assert.deepEqual(Object.keys(exported).sort(), ['format', 'plugins', 'preferences', 'version', 'workspace']);

  console.log('PASS Export downloads opted-in plugin data once alongside layout and preferences, excluding notification history');

  const imported = globalThis.structuredClone(exported);

  imported.workspace.headerVisible = true;
  imported.workspace.footerVisible = false;
  imported.preferences = { theme: 'light', motion: 'system', notifications: { toastsEnabled: true, toastDurationMs: 1000 } };
  imported.plugins['hello-world'] = { version: 1, name: 'Restored', greeting: 'Hello, restored plugin!' };

  const importedPath = `${downloads}/import.json`;

  await writeFile(importedPath, JSON.stringify(imported));
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Ada' });
  await evaluate('document.querySelector(".hello-form button").click(); globalThis.configurationPanel = document.querySelector(".hello-world"); true');
  await openMenuItem('Settings');
  await waitFor(() => evaluate('document.querySelector(".dl-settings-dialog").open'), 'settings before import');
  await screenshot('demo-settings');
  await importConfiguration(importedPath, true);

  await waitFor(
    () =>
      evaluate(
        'document.querySelector(".dl-theme").dataset.theme === "light" && !!document.querySelector(".dl-header") && !document.querySelector(".dl-footer")',
      ),
    'import configuration',
  );

  await check(
    'document.querySelector(".hello-world") === globalThis.configurationPanel && document.querySelector("#hello-name").value === "Restored" && document.querySelector(".hello-result").textContent === "Hello, restored plugin!"',
    'Import from Settings applies plugin state without remounting panels',
  );

  await pressKey('Escape', 'Escape', 0, 27);
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'close import settings');
  await reload();
  await waitFor(() => evaluate('!!document.querySelector(".dl-header") && !document.querySelector(".dl-footer")'), 'imported checkpoint after reload');

  await check(
    'document.querySelector(".dl-theme").dataset.theme === "light" && document.querySelector(".dl-theme").dataset.motion === "system" && document.querySelector("#hello-name").value === "Restored" && document.querySelector(".hello-result").textContent === "Hello, restored plugin!"',
    'Imported plugin state, workspace and preferences are restored together on reload',
  );

  for (const [name, invalid] of [
    ['future', { ...imported, version: 2 }],
    ['foreign', { ...imported, workspace: { ...imported.workspace, layout: { ...imported.workspace.layout, panels: {} } } }],
    ['plugin', { ...imported, workspace: { ...imported.workspace, headerVisible: false }, plugins: { 'hello-world': { version: 99 } } }],
  ]) {
    const path = `${downloads}/${name}.json`;

    await writeFile(path, JSON.stringify({ ...invalid, preferences: { ...imported.preferences, theme: 'dark' } }));
    await importConfiguration(path);

    await waitFor(
      () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Configuration could not be imported"'),
      `reject ${name} configuration`,
    );

    await check(
      'document.querySelector(".dl-theme").dataset.theme === "light" && !!document.querySelector(".dl-header") && !document.querySelector(".dl-footer") && document.querySelector("#hello-name").value === "Restored" && document.querySelector(".hello-result").textContent === "Hello, restored plugin!"',
      `Invalid ${name} configuration leaves plugin state, workspace and preferences unchanged`,
    );

    await click('Dismiss notification: Configuration could not be imported');
  }

  await importConfiguration(importedPath);
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Configuration imported."'), 'repeat import');
  await check('document.querySelector("input[type=file]").value === ""', 'The same configuration file can be selected again');

  const legacy = globalThis.structuredClone(imported);
  const legacyPath = `${downloads}/legacy.json`;

  delete legacy.plugins;
  await writeFile(legacyPath, JSON.stringify(legacy));
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Legacy preserved' });
  await importConfiguration(legacyPath);
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Configuration imported."'), 'legacy import');
  await check('document.querySelector("#hello-name").value === "Legacy preserved"', 'Legacy configuration files leave current plugin state unchanged');

  await evaluate('globalThis.preferenceWrite = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new Error("Blocked test storage"); }');
  await openPreferences();
  await chooseSelect(0, 'dark');
  await clickText('.dl-settings-dialog button', 'Apply preferences');

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Preferences kept for this session"'),
    'blocked preference storage',
  );

  await check(
    'document.querySelector(".dl-theme").dataset.theme === "dark" && document.querySelectorAll(".dv-tab").length === 3',
    'Blocked preference storage keeps the chosen preferences usable for the current session',
  );

  await evaluate('Storage.prototype.setItem = globalThis.preferenceWrite');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await evaluate('[...document.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === "Open command palette").focus()');
  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'animated palette');

  await check(
    'document.querySelector(".dl-command-palette").getAnimations({subtree:true}).some(animation => animation instanceof CSSTransition && animation.transitionProperty === "translate") && getComputedStyle(document.querySelector(".dl-command-palette"), "::backdrop").transitionProperty.includes("opacity")',
    'Modal windows slide into view and their backdrops fade in',
  );

  await waitFor(
    () => evaluate('document.querySelector(".dl-command-palette").getAnimations().every(animation => animation.playState !== "running")'),
    'palette entry animation',
  );

  await check(
    'document.querySelector(".dl-command-palette .dl-dialog-close").getBoundingClientRect().width >= 38 && getComputedStyle(document.querySelector(".dl-dialog-close")).fontSize === "28px"',
    'Modal close controls have a larger icon and target',
  );

  const dragOrigin = await evaluate(
    '(() => { const bounds = document.querySelector(".dl-palette-search input").getBoundingClientRect(); return {x:bounds.x+20,y:bounds.y+10}; })()',
  );

  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...dragOrigin });
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...dragOrigin });
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: 2, y: 2 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: 2, y: 2 });
  await check('document.querySelector(".dl-command-palette").open', 'Dragging from inside a modal to its backdrop does not dismiss it');
  await checkModalExit('.dl-command-palette', clickBackdrop, 'Palette backdrop dismissal animates the dialog and backdrop before hiding');

  await check(
    'document.activeElement?.getAttribute("aria-label") === "Open command palette"',
    'Clicking the palette backdrop dismisses it and restores keyboard focus',
  );

  await openPreferences();
  await chooseSelect(0, 'light');
  await checkModalExit('.dl-settings-dialog', clickBackdrop, 'Preferences animate out while retaining their content', false, 'Preferences');
  await check('document.querySelector(".dl-theme").dataset.theme === "dark"', 'Clicking outside Preferences discards the unapplied draft');
  await click('Open notifications');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-center").open'), 'animated notification history');

  await check(
    'document.querySelector(".dl-notification-center").getAnimations({subtree:true}).some(animation => animation instanceof CSSTransition && animation.transitionProperty === "translate") && document.querySelector(".dl-notification-center").getBoundingClientRect().width >= 480 && getComputedStyle(document.querySelector(".dl-notification-entry h3")).fontSize === "16px"',
    'Notification history uses an animated, larger panel with readable text',
  );

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-center").getAnimations().every(animation => animation.playState !== "running")'),
    'notification entry animation',
  );

  await screenshot('demo-notifications-updated');
  await checkModalExit('.dl-notification-center', clickBackdrop, 'Notification history slides right and fades out on dismissal', true, 'Notifications');

  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'palette for Escape exit');
  await checkModalExit('.dl-command-palette', () => pressKey('Escape', 'Escape', 0, 27), 'Escape animates palette closure');
  await openMenuItem('Settings');
  await waitFor(() => evaluate('document.querySelector(".dl-settings-dialog").open'), 'settings for close button');
  await checkModalExit('.dl-settings-dialog', () => click('Close settings'), 'The close button animates Settings closure', false, 'Settings');
  await openPreferences();
  await checkModalExit(
    '.dl-settings-dialog',
    () => clickText('.dl-settings-dialog button', 'Cancel'),
    'Cancel animates Preferences closure',
    false,
    'Preferences',
  );
  await openPreferences();
  await checkModalExit(
    '.dl-settings-dialog',
    () => clickText('.dl-settings-dialog button', 'Apply preferences'),
    'Apply animates Preferences closure',
    false,
    'Preferences',
  );

  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'animated command handoff palette');
  await searchPalette('Open settings');
  await pressKey('Enter', 'Enter');
  await waitFor(() => evaluate('document.querySelector(".dl-settings-dialog").open'), 'animated settings handoff');
  await check(
    'document.querySelectorAll("dialog[open]").length === 1 && document.activeElement?.getAttribute("aria-label") === "Close settings"',
    'Animated palette exit preserves immediate focus handoff to Settings',
  );
  await click('Close settings');
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'close handoff settings');

  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'palette for rapid reopen');
  await click('Close command palette');
  await waitFor(() => evaluate('!document.querySelector(".dl-command-palette").open'), 'start rapid exit');
  await click('Open command palette');
  await waitFor(
    () =>
      evaluate(
        'document.querySelector(".dl-command-palette").open && document.querySelector(".dl-command-palette").getAnimations({subtree:true}).every(animation => animation.playState !== "running")',
      ),
    'settled reopened palette',
  );
  await check('document.activeElement === document.querySelector(".dl-palette-search input")', 'Rapid reopening keeps the palette open and focused');
  await click('Close command palette');
  await evaluate('[...document.querySelectorAll(".demo-playground button")].find(button => button.textContent.trim() === "Send warning").click()');
  await waitFor(() => evaluate('!!document.querySelector(".dl-notification-toast[data-level=warning]")'), 'animated warning toast');

  await check(
    'getComputedStyle(document.querySelector(".dl-notification-toast[data-level=warning]")).animationName === "dl-toast-enter" && getComputedStyle(document.querySelector(".dl-notification-toast strong")).fontSize === "16px"',
    'Notification popups animate in with enlarged text',
  );

  const scrollPoint = await evaluate(
    '(() => { const bounds = document.querySelector(".demo-playground").closest(".dl-panel-content").getBoundingClientRect(); return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}; })()',
  );

  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...scrollPoint });
  await command('Input.dispatchMouseEvent', { type: 'mouseWheel', deltaX: 0, deltaY: 1200, ...scrollPoint });
  await waitFor(() => evaluate('document.querySelector(".demo-playground").closest(".dl-panel-content").scrollTop > 0'), 'overflowing panel wheel scroll');

  await check(
    'document.querySelector(".demo-playground").closest(".dl-panel-content").scrollHeight > document.querySelector(".demo-playground").closest(".dl-panel-content").clientHeight && window.scrollY === 0',
    'Overflowing tab content scrolls vertically without moving the workbench',
  );

  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'reduced-motion palette');

  await check(
    'getComputedStyle(document.querySelector(".dl-command-palette")).transitionProperty === "none" && getComputedStyle(document.querySelector(".dl-command-palette"), "::backdrop").transitionProperty === "none"',
    'Reduced motion disables both dialog and backdrop animations',
  );

  await clickBackdrop();
  await waitFor(() => evaluate('!document.querySelector(".dl-command-palette").open'), 'close reduced-motion palette');
  await check(
    'getComputedStyle(document.querySelector(".dl-command-palette")).display === "none" && document.querySelector(".dl-command-palette").getAnimations({subtree:true}).length === 0',
    'System reduced motion closes dialogs immediately without exit transitions',
  );

  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await openPreferences();
  await chooseSelect(1, 'reduced');
  await clickText('.dl-settings-dialog button', 'Apply preferences');
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'explicit reduced-motion closure');
  await check(
    'getComputedStyle(document.querySelector(".dl-settings-dialog")).display === "none" && document.querySelector(".dl-settings-dialog").getAnimations({subtree:true}).length === 0',
    'Applying explicit reduced motion disables the Preferences exit transition immediately',
  );
  await openPreferences();
  await chooseSelect(1, 'system');
  await clickText('.dl-settings-dialog button', 'Apply preferences');
  await waitFor(() => evaluate('!document.querySelector(".dl-settings-dialog").open'), 'restore system motion');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  await toggleChromePart('footer');
  await waitFor(() => evaluate('!!document.querySelector("[data-plugin-status-item]")'), 'plugin footer visibility');

  await check(
    'document.querySelector("[data-plugin-status-item]").textContent === "Hello World ready" && document.querySelector("[data-plugin-monitoring-item]").textContent === "Local plugin active"',
    'The discovered local plugin contributes panels, status, and monitoring',
  );

  await click('Open command palette');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'plugin palette action');
  await searchPalette('hello-world.greet');
  await pressKey('Enter', 'Enter');

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Hello from the local plugin!"'),
    'local plugin command execution',
  );

  const pluginMessages = await evaluate(
    '[...document.querySelectorAll(".dl-notification-entry h3")].filter(node => node.textContent === "Hello from the local plugin!").length',
  );

  await openMenuItem('Say hello', 'Plugins');

  await waitFor(
    () =>
      evaluate(
        `[...document.querySelectorAll('.dl-notification-entry h3')].filter(node => node.textContent === 'Hello from the local plugin!').length === ${pluginMessages + 1}`,
      ),
    'plugin menu command',
  );

  await check('document.querySelectorAll(".dv-tab").length === 3', 'The plugin menu and palette execute the same command once without replacing panels');

  const unknownLanguage = globalThis.structuredClone(imported);

  unknownLanguage.preferences.locale = 'zz';
  unknownLanguage.workspace.headerVisible = false;

  const unknownPath = `${downloads}/unknown-language.json`;

  await writeFile(unknownPath, JSON.stringify(unknownLanguage));

  const beforeLanguageImport = await evaluate(
    'JSON.stringify([document.querySelector(".dl-theme").dataset.theme, !!document.querySelector(".dl-header"), !!document.querySelector(".dl-footer")])',
  );

  await importConfiguration(unknownPath);

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Configuration could not be imported"'),
    'reject unregistered language',
  );

  assert.equal(
    await evaluate(
      'JSON.stringify([document.querySelector(".dl-theme").dataset.theme, !!document.querySelector(".dl-header"), !!document.querySelector(".dl-footer")])',
    ),
    beforeLanguageImport,
  );

  console.log('PASS Unregistered languages are rejected before applying any workspace changes');

  await evaluate(
    'globalThis.languagePanel = document.querySelector(".hello-world"); document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select(); true',
  );

  await command('Input.insertText', { text: 'Ada' });
  await openPreferences();
  await evaluate('document.querySelector("select[aria-label=Language]").focus()');
  await pressKey('End', 'End', 0, 35);
  await pressKey('Tab', 'Tab', 0, 9);
  await clickText('.dl-settings-dialog button', 'Apply preferences');
  await waitFor(() => evaluate('document.querySelector(".dl-i18n").lang === "fr" && !document.querySelector(".dl-settings-dialog").open'), 'apply French');

  await check(
    'document.querySelector(".hello-world") === globalThis.languagePanel && document.querySelector("#hello-name").value === "Ada" && [...document.querySelectorAll(".dv-tab")].some(node => node.textContent === "Bonjour le monde")',
    'Changing language translates panel titles without resetting panel state',
  );

  await evaluate('document.querySelector(".hello-form button").click()');
  await waitFor(() => evaluate('document.querySelector(".hello-result").textContent === "Bonjour, Ada !"'), 'French plugin interaction');
  await click('Ouvrir la palette de commandes');
  await waitFor(() => evaluate('document.querySelector(".dl-command-palette").open'), 'French command palette');
  await searchPalette('thème');

  await waitFor(
    () => evaluate('[...document.querySelectorAll(".dl-palette-option")].some(node => node.textContent.includes("Changer de thème"))'),
    'translated command search',
  );

  await pressKey('Enter', 'Enter');
  await waitFor(() => evaluate('!document.querySelector(".dl-command-palette").open'), 'translated command execution');
  await evaluate('document.querySelector(".dl-workbench").focus()');
  await pressKey('s', 'KeyS', 3);

  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Disposition enregistrée."'),
    'French layout feedback',
  );

  await check('document.querySelector(".hello-world") === globalThis.languagePanel', 'French commands and feedback preserve the live application');
  await reload();
  await waitFor(() => evaluate('document.querySelector(".dl-i18n").lang === "fr"'), 'French persistence');
  await openMenuItem('Préférences', 'Fichier');
  await waitFor(() => evaluate('document.querySelector(".dl-settings-dialog").open'), 'French preferences menu');

  await check(
    'document.querySelector(".dl-settings-dialog h2").textContent === "Préférences" && document.querySelector("select[aria-label=Langue]").value === "fr" && document.querySelector(".demo-status").textContent.trim() === "Espace de travail prêt" && document.querySelector("[data-plugin-status-item]").textContent === "Bonjour le monde prêt" && [...document.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === "Activer le mode focus").getBoundingClientRect().right <= window.innerWidth',
    'French is restored on reload and used by menus, preferences, and accessible labels',
  );

  await screenshot('demo-french');
  await pressKey('Escape', 'Escape', 0, 27);

  assert.deepEqual(errors, [], 'No browser runtime errors');

  console.log('Browser checks passed. Screenshots are in test-results/.');
} catch (error) {
  if (socket?.readyState === 1) {
    console.error(
      await evaluate(
        `JSON.stringify([...document.querySelectorAll('[role=menuitem]')].map(node => {const rect = node.getBoundingClientRect(); const popup = node.closest('.ant-dropdown'); return {text:node.textContent,rect,popup:popup?.className,animations:popup?.getAnimations({subtree:true}).map(a=>({state:a.playState,time:a.currentTime})),hit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.outerHTML.slice(0,250)};}))`,
      ),
    );

    console.error(
      await evaluate(
        'JSON.stringify({ theme: document.querySelector(".dl-theme")?.dataset.theme, samePanel: document.querySelector(".hello-world") === globalThis.testPanel, greeting: document.querySelector(".hello-result")?.textContent, groups: [...document.querySelectorAll(".hello-world,.demo-guide,.demo-playground")].map(node => ({className:node.className, top:node.getBoundingClientRect().top, left:node.getBoundingClientRect().left})), layoutFeedback: document.querySelector(".dl-notification-toast strong")?.textContent })',
      ),
    );

    await screenshot('demo-failure');
  }

  throw error;
} finally {
  if (socket?.readyState === 1) await command('Browser.close').catch(() => {});

  socket?.close();
  browser.kill();
}
