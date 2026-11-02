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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function check(expression, description) {
  assert.equal(await evaluate(expression), true, description);
  console.log(`PASS ${description}`);
}

async function click(label) {
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(label)}).click()`);
}

async function screenshot(name) {
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

async function pressKey(key, code, modifiers = 0, windowsVirtualKeyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 13) {
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
}

async function searchPalette(text) {
  await evaluate('document.querySelector(".dl-palette-search input").focus(); document.querySelector(".dl-palette-search input").select()');
  await command('Input.insertText', { text });
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
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await waitFor(() => evaluate('document.querySelectorAll(".dv-tab").length === 3 && !!document.querySelector("#hello-name")'), 'Hello World panels');
  await check('document.querySelector(".dl-dock").getBoundingClientRect().height > 400', 'Dockview has usable workspace dimensions');
  await evaluate('document.querySelector("#hello-name").focus(); document.querySelector("#hello-name").select()');
  await command('Input.insertText', { text: 'Ada' });
  await evaluate('document.querySelector(".hello-form button").click()');
  await waitFor(() => evaluate('document.querySelector(".hello-result").textContent === "Hello, Ada!"'), 'greeting interaction');
  await check('document.querySelector(".hello-result").textContent === "Hello, Ada!"', 'Hello World handles real input');
  await evaluate('globalThis.testPanel = document.querySelector(".hello-world"); true');
  await click('Hide header');
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'hide header');
  await click('Hide footer');
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
  await click('Show header');
  await click('Show footer');
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
  await click('Hide header');
  await click('Save layout');
  await waitFor(() => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent === "Layout saved."'), 'save layout');
  await click('Rows layout');
  await waitFor(
    () => evaluate('document.querySelector(".demo-guide").getBoundingClientRect().top > document.querySelector(".hello-world").getBoundingClientRect().top'),
    'rows preset',
  );
  await click('Show header');
  await click('Restore saved layout');
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
  await click('Reset layout');
  await waitFor(
    () =>
      evaluate(
        '!!document.querySelector(".dl-header") && document.querySelector(".demo-playground").getBoundingClientRect().top > document.querySelector(".demo-guide").getBoundingClientRect().top',
      ),
    'reset layout',
  );
  await check(
    'document.querySelector(".hello-world") === globalThis.testPanel && !Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label") === "Restore saved layout").disabled',
    'Reset restores the application layout without deleting the saved checkpoint',
  );
  await reload();
  await waitFor(() => evaluate('!document.querySelector(".dl-header")'), 'restore persisted header preference');
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
  await click('Save layout');
  await waitFor(
    () => evaluate('document.querySelector(".dl-notification-toast strong")?.textContent.includes("Browser storage is unavailable")'),
    'blocked storage feedback',
  );
  await check(
    '!Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label") === "Restore saved layout").disabled && document.querySelectorAll(".dv-tab").length === 3',
    'Unavailable storage leaves a usable in-memory checkpoint',
  );
  await evaluate('Storage.prototype.setItem = globalThis.originalStorageWrite; true');
  await click('Save layout');
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
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Browser checks passed. Screenshots are in test-results/.');
} catch (error) {
  if (socket?.readyState === 1) {
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
