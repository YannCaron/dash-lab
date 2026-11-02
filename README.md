# dash-lab

Build once. Create many.

A reusable React workbench and a separate Hello World demo. Features 1–8 provide the foundation, dockable workbench, themes, saved layouts, notifications, commands, command palette, menus, and settings; the remaining features are tracked in [prompt.md](prompt.md).

## Run the demo

Use Node.js 24 LTS (or Node.js 22.13+ in the 22.x series). From this directory:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Development runs the library build in watch mode, watches TypeScript declarations, and serves the demo with hot reload. Stop with Ctrl+C.

```sh
npm run start
```

This checks types, builds the library and demo, and serves a local production preview at http://127.0.0.1:4173 without watching source files. No prior build is required. The preview is intended for local evaluation.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` for these commands.

## Development

```sh
npm run check
npm run lint
npm run format:check
npm test
npm run build
npm run storybook
npm run build:storybook
npm pack
```

With the demo running, `npm run test:browser` checks it in headless Microsoft Edge on Windows. Set `BROWSER_PATH` to another Chromium executable when needed. Pass a URL after `--` to test the development server: `npm run test:browser -- http://127.0.0.1:5173`. Screenshots are written to `test-results/`.

The package is ESM with TypeScript declarations and a separate stylesheet:

```tsx
import { Workbench } from 'dash-lab';
import 'dash-lab/style.css';

export function Application() {
  return <Workbench title="My Lab">Application content</Workbench>;
}
```

Give the workbench a parent with an explicit height. React and React DOM are peer dependencies. See [architecture](docs/architecture.md) for component boundaries, [dependency notes](docs/dependencies.md) for versions and licensing, and [validation](docs/validation.md) for verified behavior and current limits.

## Workbench shell

Supply `panels` with unique IDs, titles and React components. Optional positions reference panels listed earlier. Keep the initial panel collection stable for the lifetime of a workbench. The library exposes `WorkbenchPanel` for TypeScript consumers and `onWorkspaceReady` for access to the Dockview API.

Use the `headerActions`, `controlBar`, `monitoringBar`, and `footer` slots for application content. The single View control hides or shows the header and footer together; individual choices remain in Settings and their existing shortcuts. Mod+Alt+V invokes the same combined action. The Focus control hides all chrome. Escape or the visible exit button leaves Focus mode and restores the previous visibility preferences. The docked workspace stays mounted throughout, preserving component state. Default tabs stay open.

## Saved layouts

The layout toolbar offers application, columns, and rows presets, plus Save, Restore, and Reset. Presets and restoration reuse the existing React panels. Reset restores the application's initial positions and header/footer preferences; it keeps the saved checkpoint available.

Save explicitly stores the panel layout and header/footer visibility in browser local storage. That checkpoint is restored automatically on reload. Unsaved rearrangements, panel content, and Focus mode are not persisted. Set `layoutStorageKey="my-lab:layout:v1"` on Workbench to choose an application-specific key, or `layoutStorageKey={false}` for in-memory checkpoints only. The default key uses the workbench title. Keep the key stable while mounted.

Saved data is versioned and checked against the current panel definitions. Corrupt or incompatible saves leave the default workspace usable and show an error. If browser storage is blocked or full, Save retains a checkpoint for the current session. Layouts in separate browser windows are outside this increment.

## Themes

The toolbar switches between light and dark. Workbench supplies a light theme automatically, or inherits an explicit provider:

```tsx
import { ThemeProvider, Workbench } from 'dash-lab';

<ThemeProvider initialMode="dark">
  <Workbench title="My Lab" panels={panels} />
</ThemeProvider>;
```

`useTheme()` exposes `mode`, `setMode('light' | 'dark')`, `toggleTheme()`, `motionPreference`, and `setMotionPreference('system' | 'reduced')` to components inside the provider or workbench. `ThemeToggle` is also exported for custom application controls. Theme changes update CSS tokens, Ant Design's ConfigProvider, and Dockview in place. They do not reset panel layout or component state. Workbench persists these preferences automatically; a standalone ThemeProvider keeps them in memory.

Public CSS tokens are `--dl-canvas`, `--dl-surface`, `--dl-raised`, `--dl-text`, `--dl-muted`, `--dl-border`, `--dl-accent`, `--dl-accent-soft`, `--dl-on-accent`, `--dl-success`, `--dl-warning`, and `--dl-error`. Transitions take 180 ms and respect `prefers-reduced-motion`.

Modal windows enter from outside the viewport while the backdrop fades in; notifications enter from the right. Reduced motion disables these animations as well as color transitions. Click the backdrop, press Escape, or use the enlarged close button to dismiss a modal. A drag starting inside the dialog does not dismiss it. Dismissing Preferences discards unapplied edits.

## Notifications

Call `useNotifications().notify({ title: 'Saved', description: 'Your work is ready.', level: 'success' })` from a component inside Workbench. Supported levels are info, success, warning, and error. The toolbar bell opens the history dialog and displays the unread count. Users can mark entries read, remove them, or clear history.

Toasts disappear after five seconds by default; errors remain until dismissed. Preferences can disable popups and set their default duration to 1–30 seconds. `useNotifications()` exposes `preferences` and `setPreferences({ toastsEnabled, toastDurationMs })` for custom controls. Override duration per notification with `durationMs` (zero means sticky). Disabling popups dismisses active toasts and keeps history; re-enabling does not replay old entries. Dismissing or timing out a toast keeps its unread history entry. History contains up to 100 entries and the visible stack up to three. History lives in memory for the current session.

Workbench supplies an isolated center automatically. For custom composition, wrap a workbench in `NotificationProvider` inside `ThemeProvider`, and set `historyLimit` when needed. `NotificationButton` is exported for custom controls. Layout feedback and application notifications use the same center. The Hello World greeting and Playground buttons demonstrate all severities.

## Commands and shortcuts

`useCommands()` exposes `register`, `execute`, `canExecute`, and a reactive `commands` list. Register application actions in an effect and return the cleanup function:

```tsx
const { register, execute } = useCommands();
const { notify } = useNotifications();

useEffect(
  () =>
    register({
      id: 'my-app.greet',
      title: 'Say hello',
      shortcut: 'Mod+Enter',
      execute: () => {
        notify({ title: 'Hello!', level: 'success' });
      },
    }),
  [register, notify],
);
```

The same action can run from a button with `void execute('my-app.greet')`. Handlers may return promises. Duplicate IDs and equivalent shortcuts are rejected. Disabled, unknown, or already-running commands return false. Failures are reported through the nearest notification center; a standalone CommandProvider without one propagates the error. For non-React use, `new CommandRegistry('mac' | 'other')` supplies the same registration and execution engine, whose errors always propagate.

Workbench creates a provider automatically. Custom provider composition is ThemeProvider → NotificationProvider → CommandProvider → Workbench; use one command registry per workbench, and keep the `workbench.*` namespace reserved for built-in actions. `CommandProvider` also accepts an existing `registry`.

| Action                              | Shortcut                          |
| ----------------------------------- | --------------------------------- |
| Toggle theme                        | Mod+Alt+T                         |
| Toggle Focus mode                   | Mod+Alt+F                         |
| Leave Focus mode                    | Escape                            |
| Toggle header / footer              | Mod+Alt+H / Mod+Alt+B             |
| Save / restore layout               | Mod+Alt+S / Mod+Alt+R             |
| Reset layout                        | Mod+Alt+0                         |
| Application / columns / rows layout | Mod+Alt+1 / Mod+Alt+2 / Mod+Alt+3 |
| Open notifications                  | Mod+Alt+N                         |

Mod means Command on macOS and Control elsewhere. Shortcuts use semantic key names and exact modifiers; supported named keys include Enter, Escape, arrows, Space, Plus, and function keys. Registered application shortcuts ignore editable controls by default; set `allowInEditable: true` to opt in. Built-in workbench combinations opt in explicitly. Repeated keys, IME composition, AltGraph, already-handled events, and modal dialogs are left to their existing handlers. Keyboard dispatch is scoped to the focused workbench, with no document-wide listener. The palette is available with Mod+Shift+P or the Commands toolbar button.

## Command palette

Open Commands in the toolbar or press Mod+Shift+P. Search command titles or IDs; matching ignores case and accents and supports abbreviated letters. Arrow keys select available actions, Enter runs one, and Escape closes the palette and restores focus. Disabled commands remain visible. Shortcuts appear alongside their actions, and the six most recently successful palette selections lead an empty search for the current session.

The palette uses the same registry and error handling as buttons and shortcuts. It remains accessible by keyboard in Focus mode. `CommandPalette` is exported as a controlled component with `open` and `onClose` props for applications composing their own command and notification providers.

## Menus and settings

The hamburger menu contains File → Settings, Preferences, Import configuration, and Export configuration. All four actions are also searchable in the command palette. Open the menu with Enter, Space, or Arrow Down; use arrows to navigate and Escape to dismiss it.

Settings controls header/footer visibility and saves or resets the current workspace through the existing layout service. Changes apply immediately; Save workspace layout stores a checkpoint. Preferences edits the theme, motion choice, popup visibility, and popup duration. Apply saves these choices; Cancel or Escape discards the draft. System reduced motion always takes priority.

Preferences persist independently from saved layouts, including changes made by the theme toolbar button. Set `preferencesStorageKey="my-lab:preferences:v1"` to customize storage or `preferencesStorageKey={false}` to keep preferences in memory. The default key uses the workbench title; keep it stable while mounted. Storage failures retain the current choices and report the session-only fallback in notification history.

Export downloads `dash-lab-configuration.json`, containing `format: 'dash-lab'`, `version: 1`, the current workspace checkpoint structure, and preferences. It includes the current arrangement even when unsaved. Import validates the whole file, its version, preferences, and compatibility with the current panel IDs before applying it; accepted imports update the saved checkpoint. React panel state, notification history, and recent commands are excluded. Files are limited to 1 MB. Workbenches without panels export `workspace: null`. `WorkbenchConfiguration`, `WorkbenchPreferences`, and the pure `decodeConfiguration(text, panels)` validator are exported for application integrations.

## License

[MIT](LICENSE).
