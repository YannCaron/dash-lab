# Architecture

`src/` is the reusable library. `demo/` consumes its public API and contains application-specific content. The library must not import the demo.

```mermaid
flowchart LR
  Demo[Hello World application] --> API[Public library exports]
  Stories[Storybook] --> API
  API --> Layout[Workbench]
  API --> Theme[Scoped theme provider]
  Theme --> AntD[Ant Design ConfigProvider]
  Theme --> Tokens[CSS tokens and Dockview theme]
  Layout --> Visibility[Instance-local visibility store]
  Layout --> Docking[Dockview workspace]
```

Vite builds the ESM package into `dist/`. TypeScript emits declarations there independently. The demo build consumes the built package and writes to `demo-dist/`. In development, Vite resolves the demo's library imports to source for hot reload while a separate Vite build watcher and TypeScript watcher keep package outputs current. Both watchers and the demo server run in one Node process and close on Ctrl+C.

The demo discovers `src/plugins/*/index.ts` with Vite's eager `import.meta.glob`. `registerLocalPlugins` activates default exports in path order. The registry rolls back failed activations and freezes its contribution collections when Workbench mounts. Plugins are trusted application code bundled at build time; no remote loading or runtime filesystem scanning occurs. Adding/removing a plugin requires restarting the mounted workbench; the demo's HMR boundary reloads on plugin module changes.

Plugin panels precede application panels, which may position themselves relative to a plugin panel. Commands are connected to the existing command/notification providers; menus invoke command IDs, and status/monitoring components render inside those same providers. The SDK model does not import the workbench UI. Runtime command conflicts report one notification and remove the attempted plugin-command batch, leaving panels usable. Plugin activation itself must be synchronous.

Storybook and Vitest run independently of the demo. Distribution includes only library artifacts, documentation, and license notices.

Each workbench owns a separate Zustand visibility store. Focus mode suppresses chrome without changing header/footer preferences or unmounting Dockview. Focus returns to the trigger when leaving focus mode. Keyboard dispatch, including Escape, is scoped to the focused workbench.

Panel definitions are validated before Dockview receives them. Application components are passed through stable renderers, and Dockview's `always` renderer retains inactive panel state. The demo uses only the MIT edition's docking features.

Each stable panel renderer includes its own full-height scroll container. Overflow scrolls within that panel, and tab changes retain its scroll position. View toggles header and footer together; individual visibility preferences and existing commands remain available.

Layout management captures the initial native Dockview layout before loading a saved checkpoint. Versioned checkpoints contain the native layout, header/footer preferences, and optional plugin data. Loading validates panel identities, components, group membership, grid structure, and JSON state before calling plugin importers and then `fromJSON` with `reuseExistingPanels`. Explicit saves persist per application; a failed browser write keeps an in-memory checkpoint. Reset and presets reuse existing panels, preserve current plugin data, and do not replace the saved checkpoint. Popout browser windows are not restored.

ThemeProvider owns another instance-local Zustand store. A single palette supplies CSS tokens and Ant Design tokens; Dockview keeps its native light/dark theme with CSS-variable overrides. A workbench inherits the nearest provider or creates a light provider automatically. Native controls and popup containers follow the local color scheme. Theme changes never recreate the workspace or its panels. The workbench configuration integration persists preferences separately from layout checkpoints.

Reduced-motion preferences are observed with a media query, including changes during a session. CSS transitions and Ant Design motion durations become zero. Ant Design's boolean motion flag stays stable because changing it can insert provider wrappers and remount the application subtree. Contrast tests independently compute luminance for primary, secondary, and primary-button text in both palettes.

NotificationProvider owns a bounded Zustand history, unread flags, and the active toast IDs. Dismissing a toast never removes or acknowledges its history entry. Toast components own and clean up their timers. A native modal dialog supplies keyboard focus containment and Escape handling for the history. Layout feedback is published once per action into the same center; the library does not have a second feedback system. Each workbench creates a provider unless an application supplies one.

CommandRegistry is independent of React and browser globals. It stores action definitions, checks canonical shortcut conflicts, blocks overlapping runs of the same registration, and provides disposable registrations and external-store snapshots. React's CommandProvider adapts it to notification error feedback. The workbench integration registers built-in actions over the existing theme, visibility, notification, and layout operations, and handles keyboard events at the workbench boundary. No lower-level service imports Workbench. Application actions follow the same lifecycle, demonstrated by the Playground commands.

CommandPalette consumes that registry without duplicating actions. A pure search function ranks title/ID matches and recent successful selections. The controlled native dialog keeps focus in a combobox, exposes a listbox with its active descendant, skips unavailable commands during keyboard navigation, and closes before executing an action that may open another dialog. Recent selections are local session state.

The Ant Design hamburger menu invokes registered commands to open Settings, Preferences, or the configuration file controls. The native settings dialog reuses the existing visibility and layout operations. Preferences keeps a draft until Apply. Theme and notification stores own their respective choices; neither imports the settings UI or the workbench.

Shared overlay styles slide and fade native dialogs on both entry and exit, fade their backdrops, and slide notifications from the right. CSS `@starting-style` defines entry values. When discrete `display` and `overlay` transitions work, native `close()` releases modal state and restores focus immediately while CSS retains the exit rendering. See [native top-layer transitions](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/animate-to-from-top-layer).

`dialogMotion` checks overlay support and probes real discrete-display behavior once per document. On browsers such as Firefox without that support, it marks the still-open dialog as closing, waits for its own transitions to settle, then calls native `close()` and restores focus. A bounded fallback handles stalled animations. Reopening cancels pending closure, and the palette awaits closure before executing a command that can open another modal. System and explicit reduced-motion choices close immediately when there is no animation to wait for.

Settings preserves its last displayed page during exit, and notification history retains its column layout. Shared dismissal handling routes backdrop clicks, cancel requests, and Escape through the same logic. Escape is intercepted before the browser's default action because Firefox can emit a non-cancelable `cancel` event after programmatic opening. IME composition and already handled keys are preserved. A backdrop click must start and end outside the dialog, preserving drags begun inside its content.

The pure configuration decoder validates the complete versioned JSON file before the workbench applies it. Optional `registerState` handlers own synchronous domain validation and live store updates; the framework owns JSON copying, plugin-ID scoping, and checkpoint orchestration. Plugin states are stored once at the JSON configuration's top level and alongside the layout in browser checkpoints. Before import, participating handlers export independent rollback snapshots. Failed imports restore attempted handlers in reverse order; native layout restoration reuses panels and rolls back a Dockview failure. Imports then apply validated preferences and explicitly save a layout/plugin checkpoint. Storage writes to the layout and preference keys are independent; if either fails, the imported configuration stays usable in memory and notification feedback states that persistence was incomplete. Export reads live layout/plugin data without changing the saved checkpoint. Data stays in the browser and local JSON files. See [the state checkpoint decision](decisions/003-plugin-state-checkpoints.md).

I18nProvider owns isolated Zustand language state, extensible message catalogs, plain-text interpolation, the subtree's language attribute, and Ant Design's locale provider. Workbench supplies it automatically when absent. English source messages serve as built-in keys; application catalogs can also use stable symbolic keys. Command/panel identities remain unchanged when their displayed titles are translated. The configuration codec accepts legacy files without a locale; the workbench checks registered-language availability before importing a layout. Notification history retains delivered content rather than translating user messages retrospectively.
