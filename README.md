# dash-lab

Build once. Create many.

A reusable React workbench and a separate Hello World demo. Features 1–7 provide the foundation, dockable workbench, themes, saved layouts, notifications, commands, and command palette; the remaining features are tracked in [prompt.md](prompt.md).

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

Use the `headerActions`, `controlBar`, `monitoringBar`, and `footer` slots for application content. The control bar toggles header/footer visibility and enters Focus mode. Escape or the visible exit button leaves Focus mode and restores the previous visibility preferences. The docked workspace stays mounted throughout, preserving component state. Default tabs stay open.

## Saved layouts

The layout toolbar offers application, columns, and rows presets, plus Save, Restore, and Reset. Presets and restoration reuse the existing React panels. Reset restores the application's initial positions and header/footer preferences; it keeps the saved checkpoint available.

Save explicitly stores the panel layout and header/footer visibility in browser local storage. That checkpoint is restored automatically on reload. Unsaved rearrangements, panel content, Focus mode, and theme choice are not persisted. Set `layoutStorageKey="my-lab:layout:v1"` on Workbench to choose an application-specific key, or `layoutStorageKey={false}` for in-memory checkpoints only. The default key uses the workbench title. Keep the key stable while mounted.

Saved data is versioned and checked against the current panel definitions. Corrupt or incompatible saves leave the default workspace usable and show an error. If browser storage is blocked or full, Save retains a checkpoint for the current session. Layouts in separate browser windows are outside this increment.

## Themes

The toolbar switches between light and dark. Workbench supplies a light theme automatically, or inherits an explicit provider:

```tsx
import { ThemeProvider, Workbench } from 'dash-lab';

<ThemeProvider initialMode="dark">
  <Workbench title="My Lab" panels={panels} />
</ThemeProvider>;
```

`useTheme()` exposes `mode`, `setMode('light' | 'dark')`, and `toggleTheme()` to components inside the provider or workbench. `ThemeToggle` is also exported for custom application controls. Theme changes update CSS tokens, Ant Design's ConfigProvider, and Dockview in place. They do not reset panel layout or component state. Theme selection is in memory for this increment.

Public CSS tokens are `--dl-canvas`, `--dl-surface`, `--dl-raised`, `--dl-text`, `--dl-muted`, `--dl-border`, `--dl-accent`, `--dl-accent-soft`, `--dl-on-accent`, `--dl-success`, `--dl-warning`, and `--dl-error`. Transitions take 180 ms and respect `prefers-reduced-motion`.

## Notifications

Call `useNotifications().notify({ title: 'Saved', description: 'Your work is ready.', level: 'success' })` from a component inside Workbench. Supported levels are info, success, warning, and error. The toolbar bell opens the history dialog and displays the unread count. Users can mark entries read, remove them, or clear history.

Toasts disappear after five seconds; errors remain until dismissed. Override this per notification with `durationMs` (zero means sticky). Dismissing or timing out a toast keeps its unread history entry. History contains up to 100 entries and the visible stack up to three. History lives in memory for the current session.

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

## License

[MIT](LICENSE).
