# Public API

Import JavaScript/types from `dash-lab` and styles from `dash-lab/style.css`. The package is ESM and requires React/React DOM 19 peers. Public declarations ship in `dist/`; source JSDoc and this document describe the same contracts.

## Workbench

```tsx
import { Workbench } from 'dash-lab';
import type { WorkbenchPanel } from 'dash-lab';
import 'dash-lab/style.css';

const panels: readonly WorkbenchPanel[] = [{ id: 'main', title: 'Main', component: () => <p>Ready</p> }];
export function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Workbench title="My Lab" panels={panels} />
    </div>
  );
}
```

`WorkbenchProps`:

| Property                                       | Contract                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `title`                                        | Required application name; also supplies default storage-key identity.                                 |
| `subtitle`, `logo`, `headerActions`            | Optional header text and React content.                                                                |
| `controlBar`, `monitoringBar`, `footer`        | Optional React content in the corresponding chrome regions.                                            |
| `panels`                                       | Stable initial panel definitions. Plugin panels precede these.                                         |
| `plugins`                                      | Optional `PluginRegistry`, sealed on first mount.                                                      |
| `onWorkspaceReady(api)`                        | Called after initial panels and compatible saved layout restoration. Receives the native Dockview API. |
| `initialHeaderVisible`, `initialFooterVisible` | Initial visibility, both defaulting to true. Saved layout preferences take precedence.                 |
| `layoutStorageKey`                             | Explicit-checkpoint storage key, or false for session-only checkpoints.                                |
| `preferencesStorageKey`                        | Automatically persisted preferences key, or false for in-memory preferences.                           |
| `children`                                     | Fallback content when no panels exist.                                                                 |

Keep panel collections, plugin registries, and storage keys stable until unmount. Default keys are `dash-lab:${encodeURIComponent(title)}:layout:v1` and `dash-lab:${encodeURIComponent(title)}:preferences:v1`. Applications sharing a title should choose distinct keys when their configuration must be independent.

`WorkbenchPanel` has `id`, `title`, `component`, optional `position: { referencePanel, direction }`, and optional positive `initialWidth`/`initialHeight`. Directions are left, right, above, below, and within. Reference panels must precede their dependants. IDs stay stable across languages and persisted layouts. Components render in independent scrolling containers and remain mounted when inactive or when chrome changes.

View hides/shows header and footer together. Settings and existing individual shortcuts still control each region. Focus suppresses all chrome; Escape restores previous visibility choices. Neither changes the mounted panel instances.

## Providers and hooks

Workbench reuses the nearest providers or supplies defaults. For explicit composition, use:

```tsx
<I18nProvider>
  <ThemeProvider initialMode="dark">
    <NotificationProvider historyLimit={100}>
      <CommandProvider registry={registry}>
        <Workbench title="My Lab" panels={panels} />
      </CommandProvider>
    </NotificationProvider>
  </ThemeProvider>
</I18nProvider>
```

Use one command registry per workbench. Provider props are initial configuration, not controlled replacements. A surrounding router is optional and belongs to the consuming application; the demo uses React Router. Hooks below are called from React components, not from plugin activation functions.

### Theme

`ThemeProviderProps` contains `children` and optional `initialMode: 'light' | 'dark'`. `useTheme(): ThemeControls` returns `mode`, `setMode`, `toggleTheme`, `motionPreference`, and `setMotionPreference`. `MotionPreference` is system or reduced. System reduced motion always wins. `ThemeToggle` is an exported ready-made control.

Theme changes update CSS tokens, Ant Design, and Dockview without resetting content. Standalone providers keep choices in memory; a workbench persists its preferences. The public tokens are canvas, surface, raised, text, muted, border, accent, accent-soft, on-accent, success, warning, and error, each prefixed with `--dl-`.

### Notifications

`NotificationProviderProps` contains `children` and optional positive integer `historyLimit` (default 100). `useNotifications(): NotificationCenterState` exposes:

| Operation/state                        | Meaning                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `notify(input): string`                | Adds a notification and returns its center-local ID.                               |
| `items`, `toasts`, `open`              | Newest-first history, up to three active toast IDs, and history-dialog visibility. |
| `dismiss(id)`                          | Hides a toast without reading or removing history.                                 |
| `markRead(id)`, `markAllRead()`        | Acknowledge notifications.                                                         |
| `remove(id)`, `clearHistory()`         | Remove entries and related active toasts.                                          |
| `setOpen(boolean)`                     | Opens/closes history.                                                              |
| `preferences`, `setPreferences(value)` | Popup visibility and default duration.                                             |

`NotificationInput` requires a nonempty `title`, accepts a plain-text `description`, optional level info/success/warning/error, and `durationMs`. Zero means sticky; errors default to zero and other levels initially to 5000 ms. An explicit duration overrides the preference. `NotificationItem` adds readonly ID, creation timestamp, read flag, resolved level, and duration. Disabling popups clears active toasts while retaining history; re-enabling does not replay entries. `NotificationPreferences` is `{ toastsEnabled, toastDurationMs }`, with default duration restricted to 1–30 whole seconds. `NotificationButton` is exported for custom chrome.

Notification history is session state. Application text stays in the language used when delivered. React server rendering reads initial store snapshots; live notification/timer behavior is a browser concern.

### Commands

`CommandProviderProps` contains `children` and optional stable `registry`. `useCommands(): CommandControls` exposes `register`, `execute`, `canExecute`, and reactive `commands`. Register in an effect and return the disposer:

```tsx
useEffect(
  () =>
    register({
      id: 'app.greet',
      title: 'Say hello',
      shortcut: 'Mod+Enter',
      execute: () => {
        notify({ title: 'Hello!' });
      },
    }),
  [register, notify],
);
```

`CommandDefinition` contains `id`, `title`, `execute`, optional `shortcut`, `isEnabled`, and `allowInEditable`. Handlers may return promises. `execute` returns false for missing, disabled, or already-running actions. The provider reports failures to the nearest notification center; without one, errors propagate. Predicates are live; callers of `canExecute` should handle predicate errors.

`CommandRegistry(platform?)` is independent of React/browser globals. Platform is mac or other (default other). It offers `register`, `execute`, `canExecute`, `getCommands`, `subscribe`, and `matchShortcut`. Registrations reject duplicate IDs and equivalent shortcuts before mutation. Disposers are idempotent and do not delete a later replacement. Running state belongs to the registration, not only its ID. Engine execution errors always reject.

`Mod` maps to Command on macOS and Control elsewhere. Shortcuts require exact modifiers. Supported keys include letters/digits, function keys, Enter, Escape, Tab, arrows, Home/End, PageUp/PageDown, Backspace/Delete/Insert, Space, and Plus. Application shortcuts ignore editable controls by default; opt in explicitly when needed. Workbench dispatch ignores repeats, IME composition, AltGraph, handled events, and modal dialogs. Dispatch is scoped to the focused workbench. `ShortcutEvent` and `ShortcutPlatform` are public types.

Built-in IDs reserve `workbench.*`. Mod+Alt combinations are T for theme, V for View, F for Focus, H/B for individual header/footer, S/R for save/restore, 0 for reset, 1/2/3 for presets, and N for notifications. Mod+Shift+P opens the palette. Escape leaves Focus. Settings, Preferences, and configuration import/export also have registered commands.

`CommandPaletteProps` is `{ open, onClose }`. The controlled `CommandPalette` needs command and notification providers. It searches translated titles and stable IDs, supports arrows/Enter/Escape, shows unavailable actions, and keeps six recent successful choices in memory. It closes before executing an action that may open another modal.

## Plugin SDK

`WorkbenchPlugin` is `{ id, activate(api): void | PluginDisposer }`. `PluginRegistry.registerPlugin` calls synchronous activation and rolls back its registrations on failure. Its returned disposer removes contributions and calls optional cleanup; use it only before mounting. `PluginRegistry.seal()` returns one immutable `PluginContributions` snapshot; mounting calls it automatically. Registrations and disposal are rejected after sealing. Remount with a new registry to change membership.

`PluginAPI` exposes five contribution methods, each returning an idempotent `PluginDisposer`:

| Method                   | Value                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `registerPanel`          | `WorkbenchPanel`; plugin panels precede application panels.      |
| `registerCommand`        | `PluginCommand`; normal command fields, with `execute(context)`. |
| `registerMenu`           | `PluginMenu: { id, title, commandId }`; shown under Plugins.     |
| `registerStatusItem`     | `PluginItem: { id, component }`; shown in the footer.            |
| `registerMonitoringItem` | `PluginItem`; shown in monitoring.                               |

`PluginCommandContext` supplies `notify` and `executeCommand`. Commands use the workbench's existing providers, error handling, and availability. IDs must be unique within each contribution kind. `workbench.*` command IDs are reserved. Commands conflicting with the live command registry report a notification and roll back the attempted plugin-command batch; other panel contributions remain usable. Unknown menu commands display as unavailable.

`PluginContributions` exposes readonly `pluginIds`, `panels`, `commands`, `menus`, `statusItems`, and `monitoringItems`. Definitions are shallow copied/frozen; application components and handler functions remain application-owned. Registries do not sandbox or remotely load code.

`registerLocalPlugins(modules)` accepts Vite's eager glob result `{ [path]: { default: WorkbenchPlugin } }`, registers modules in sorted path order, and rolls back prior plugins if startup fails. Use the standard application entry `src/plugins/<name>/index.ts`. Plugins are compiled into the application. Development membership changes restart the mounted workbench; production changes require rebuilding.

## Languages

`I18nProviderProps` contains `children`, optional `initialLocale` (English by default), optional `languages: LanguageDefinition[]`, and optional `antdLocales`. A language definition is `{ id, label, messages }`, where `id` is a BCP 47 identifier and `messages: MessageCatalog` maps keys to strings. English/French are built in; additions merge into their catalogs or introduce languages.

`useI18n(): I18nControls` returns `locale`, readonly `locales`, `setLocale`, `assertLocale`, and `t(message, parameters?)`. `MessageParameters` maps placeholder names to strings/numbers. Missing translations fall back to English, then the literal key; missing parameters stay visible. Text is escaped by React, never interpreted as markup. Outside a provider, reading English is supported and language mutation throws. Ant Design catalogs for additional languages can be supplied through `antdLocales`.

## Configuration

`WorkbenchPreferences` contains `theme`, `motion`, `notifications`, and optional `locale` for backward compatibility. `WorkbenchConfiguration` is `{ format: 'dash-lab', version: 1, workspace, preferences }`. `workspace` is the native Dockview checkpoint plus header/footer visibility, or null for a workbench without panels. `LayoutPreset` is default, columns, or rows.

`decodeConfiguration(text, panels)` is a pure validator with a 1 MB UTF-8 byte limit. It checks format/version, preferences, workspace shape, and panel compatibility before returning data. Registered-language availability is application-specific and checked by Workbench before applying a workspace. Legacy files without a locale select English. React panel state, notification history, and recent commands are excluded.

Export captures current choices without changing an existing checkpoint. Import applies a compatible configuration and updates the explicit layout checkpoint. Disk writes to layout/preferences keys are independent; if either fails, session state remains usable and feedback reports incomplete persistence. Reset preserves the existing saved checkpoint. Popout browser windows are not restored.
