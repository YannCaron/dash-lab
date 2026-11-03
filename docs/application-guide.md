# Build an application and create plugins

This guide is sufficient to assemble an application without reading implementation source. Use [API reference](api.md) for individual signatures and [architecture](architecture.md) for maintenance boundaries.

## Decide where your code belongs

`dash-lab` is a reusable library; `demo/` is a consuming application. Put domain-specific views, commands, and plugin directories in the application. The library owns chrome, docking, theme, language, notifications, commands, configuration, and contribution contracts. A router, backend, editor, or data model remains the application's responsibility.

Use Node.js 24 LTS. The framework package also declares Node 22.13+ in the 22.x line. React and React DOM 19 are peers. Existing framework dependency versions are locked; new dependencies require the owner's approval unless explicitly requested.

## Build and evaluate the framework

From the framework repository:

```sh
npm ci
npm run dev
```

The demo runs at http://127.0.0.1:5173. A single startup process watches the library bundle and declarations and serves the application with Vite HMR. `npm run start` checks/builds everything once and previews at http://127.0.0.1:4173. Neither command requires a manual build first. Use `npm.cmd` on Windows when PowerShell blocks `npm.ps1`.

To consume a local build elsewhere:

```sh
npm pack
```

This produces `dash-lab-0.1.0.tgz` using the current package version. It contains ESM, declarations, CSS, license notices, and documentation. It does not contain the demo or require package publication.

## Create a separate Vite application

In a sibling `my-lab` directory, install the tarball and the same application stack. Adjust the tarball path for your checkout:

```sh
npm init -y
npm install ../dash-lab/dash-lab-0.1.0.tgz react@19 react-dom@19
npm install --save-dev vite@8 @vitejs/plugin-react@6 typescript@6 @types/react@19 @types/react-dom@19
```

Set `"type": "module"` and these scripts in `package.json`:

```json
{
  "dev": "vite --host 127.0.0.1",
  "check": "tsc --noEmit",
  "build": "npm run check && vite build",
  "start": "npm run build && vite preview --host 127.0.0.1 --port 4173"
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Workbench } from 'dash-lab';
import { plugins } from './plugins';
import 'dash-lab/style.css';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element.');
createRoot(root).render(
  <StrictMode>
    <Workbench title="My Lab" plugins={plugins} footer="My application" />
  </StrictMode>,
);
```

Create `src/style.css`:

```css
html,
body,
#root {
  height: 100%;
  margin: 0;
}
body {
  font-family: system-ui, sans-serif;
}
```

Create `src/plugins.ts`:

```ts
import { registerLocalPlugins } from 'dash-lab';
import type { WorkbenchPlugin } from 'dash-lab';

const modules = import.meta.glob<{ default: WorkbenchPlugin }>('./plugins/*/index.ts', { eager: true });
export const plugins = registerLocalPlugins(modules);
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
```

Add a plugin as described below, then run `npm run dev`. The application now owns discovery while the framework owns registration and rendering. Installing a new tarball updates the framework build; source changes in the separate framework checkout are not watched by this consumer.

## Plugin directory and activation

Use this structure inside the application:

```text
src/
  plugins.ts
  plugins/
    notes/
      index.ts
      NotesPanel.tsx
```

`index.ts` default-exports a `WorkbenchPlugin`; `activate(api)` runs once at application startup, synchronously. It cannot call React hooks. Components supplied as contributions can use hooks because the workbench renders them inside its providers. An activation failure rolls its registrations back. Optional activation cleanup and individual disposers can be used before the registry is sealed; runtime unloading is unsupported.

Create `src/plugins/notes/NotesPanel.tsx`:

```tsx
import { useState } from 'react';
import { useI18n, useNotifications } from 'dash-lab';

export function NotesPanel() {
  const [note, setNote] = useState('');
  const { notify } = useNotifications();
  const { t } = useI18n();
  return (
    <section style={{ padding: 24 }}>
      <h1>{t('notes.title')}</h1>
      <label>
        {t('notes.label')}
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="button" onClick={() => notify({ title: t('notes.ready'), description: note, level: 'success' })}>
        {t('notes.send')}
      </button>
    </section>
  );
}
```

## All contribution types

Create `src/plugins/notes/index.ts`:

```ts
import type { WorkbenchPlugin } from 'dash-lab';
import { NotesPanel } from './NotesPanel';

const plugin: WorkbenchPlugin = {
  id: 'notes',
  activate(api) {
    api.registerPanel({ id: 'notes.panel', title: 'notes.title', component: NotesPanel });
    api.registerCommand({
      id: 'notes.notify',
      title: 'notes.command',
      shortcut: 'Mod+Alt+G',
      execute: ({ notify }) => {
        notify({ title: 'The notes plugin is ready.', level: 'info' });
      },
    });
    api.registerMenu({ id: 'notes.menu', title: 'notes.command', commandId: 'notes.notify' });
    api.registerStatusItem({ id: 'notes.status', component: () => 'Notes ready' });
    api.registerMonitoringItem({ id: 'notes.monitoring', component: () => 'Notes plugin active' });
  },
};
export default plugin;
```

Plugin commands receive live `notify` and `executeCommand` services; handlers may return promises. Notification text is application-owned and retained as delivered. For localized notifications or access to current component state, register an application command in a React component with `useCommands()` and return the registration cleanup from an effect; use `useI18n()` in that component. Avoid registering the same command from both activation and a component.

IDs are unique within each contribution kind. Keep them stable across versions, display-title changes, and languages. `workbench.*` command IDs are reserved. Menu command IDs can reference plugin or built-in commands; unavailable actions stay disabled. Do not conflict with built-in shortcuts or an application's registrations.

## Add application and plugin translations

Update `src/main.tsx` to import `I18nProvider` from `dash-lab` and wrap Workbench with this provider:

```tsx
<I18nProvider
  languages={[
    {
      id: 'en',
      label: 'English',
      messages: {
        'notes.title': 'Notes',
        'notes.label': 'Your note',
        'notes.ready': 'Note ready',
        'notes.send': 'Send note',
        'notes.command': 'Notes: notify',
      },
    },
    {
      id: 'fr',
      label: 'Français',
      messages: {
        'notes.title': 'Notes',
        'notes.label': 'Votre note',
        'notes.ready': 'Note prête',
        'notes.send': 'Envoyer la note',
        'notes.command': 'Notes : notifier',
      },
    },
  ]}
>
  <Workbench title="My Lab" plugins={plugins} footer="My application" />
</I18nProvider>
```

English/French workbench catalogs are already included; these entries extend them. Set `initialLocale="fr"` to select French on first mount. A saved preference takes precedence. Add another `{ id, label, messages }` definition to extend the selector. `antdLocales` can supply that language's Ant Design catalog. `t` interpolates `{name}` parameters as plain text; missing translations fall back to English, then the key.

If a parent application component uses `useI18n()` to construct chrome props, wrap that component itself with `I18nProvider`. The automatic provider inside Workbench supplies its descendants, so it cannot translate values already constructed by its parent. Status and monitoring contributions can use `useI18n` directly in their React components.

## Position panels and preserve state

For two panels in one plugin, register the reference first:

```ts
api.registerPanel({ id: 'notes.primary', title: 'Notes', component: NotesPanel });
api.registerPanel({
  id: 'notes.secondary',
  title: 'Second notes',
  component: NotesPanel,
  position: { referencePanel: 'notes.primary', direction: 'right' },
  initialWidth: 360,
});
```

The example is an alternative to the single `notes.panel` registration. Directions are left, right, above, below, or within. Vite modules activate in sorted path order, and application panels follow plugin panels. Cross-plugin references therefore require explicit, predictable directory order; leaving placement unspecified is the simplest default. Mounted panel collections are stable. Changing plugin membership requires a remount; the supplied HMR boundary reloads during development. Production requires rebuilding.

Each panel scrolls when its content exceeds the tab height. An editor/canvas may keep its own internal scroll behavior. Focus, View, theme, language, preset changes, and restore reuse existing panel instances. Reset restores initial layout/visibility and preserves the saved checkpoint.

## Save and transfer configuration

Use explicit Save layout, Settings, or Mod+Alt+S for a checkpoint. Unsaved rearrangements are not automatically persisted. Preferences persist independently, including theme, language, motion, popup visibility, and default popup duration.

Choose stable application-specific `layoutStorageKey` and `preferencesStorageKey` values, or false for session-only behavior. Default keys derive from the workbench title; keep the title/keys stable when language changes. JSON export captures current layout, preferences, and opted-in plugin data; import validates the whole file, version, panel identities, and registered language before applying it. History and unregistered React panel content are excluded. A storage failure retains usable session state and reports incomplete persistence.

Adding/removing or renaming panel IDs makes old checkpoints incompatible. Keep IDs stable when only renaming a tab. An incompatible checkpoint is rejected and the default workspace remains usable. Version-1 configurations without a locale remain valid and select English. Files are limited to 1 MB, and popout windows are not restored.

### Persist a plugin's data

Register one optional handler from `activate(api)`. It is automatically keyed by your plugin's stable ID:

```ts
api.registerState({
  exportState: () => ({ version: 1, ...notesStore.getState() }),
  importState(value) {
    if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('text' in value) || typeof value.text !== 'string') {
      throw new Error('Unsupported notes state.');
    }

    notesStore.setState({ text: value.text });
  },
});
```

Here `notesStore` is your application's observable store; components must subscribe to it for restored data to appear. The existing Notes example uses component-local `useState`, which remains session-only until you move that data into such a store. See the complete, working implementation in [`demo/src/plugins/hello-world/state.ts`](../demo/src/plugins/hello-world/state.ts), its registration in `index.ts`, and its subscribed `HelloWorld` component. No additional persistence layer is needed inside a plugin.

Both callbacks are synchronous. Export only plain JSON values; import receives untrusted data and must validate its shape and plugin-specific version before mutation. The framework copies snapshots. A handler must be able to import its own exported data for rollback. Do not use these callbacks for asynchronous requests or external side effects.

Save layout now captures participating plugin data too; Restore layout and the next startup load that same checkpoint. Preferences continue to save independently, and Reset/presets leave current plugin data alone. JSON export uses a top-level `plugins` object, for example `"plugins": { "notes": { "version": 1, "text": "Draft" } }`, without duplicating it inside `workspace`. JSON import also updates the local checkpoint when there is a docking workspace. Without panels, JSON transfer applies plugin data for the current session.

Old files without `plugins` leave plugin data untouched. Missing plugin entries do the same; unknown/nonparticipating plugin IDs are ignored and not retained on the next export. A failed importer triggers rollback of attempted plugins and prevents layout/preferences changes. A failed rollback is reported rather than treated as a successful import. The existing 1 MB file/checkpoint limits include plugin data.

## Validate and maintain

Framework checks are `npm run check`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run test:package`, and `npm run build:storybook`. Browser CI checks run with `npm run test:browser:ci` and `npm run test:browser:ci -- --dev` after a build. The package check uses a fresh consumer and normal npm lifecycle handling. A separate consumer should also type-check/build its own application.

Update public JSDoc and [API reference](api.md) when contracts change. Update [release-node.md](../release-node.md), [CHANGELOG.md](../CHANGELOG.md), examples, and relevant architecture/validation notes. Keep the MIT license and required third-party notices. Commit each coherent feature; do not push or publish automatically.

## Troubleshooting

| Symptom                                  | Check                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Blank or tiny docking area               | Import `dash-lab/style.css` and give html/body/root and the workbench parent a height.                                   |
| Plugin absent                            | The entry must match `src/plugins/*/index.ts`, default-export a plugin, and be included in the application's eager glob. |
| Registration closed                      | Finish registration before mounting; create a new registry and remount to change membership.                             |
| Panel reference error                    | Register the referenced ID first; consider sorted plugin path order.                                                     |
| Command unavailable                      | Inspect ID/shortcut conflicts, `isEnabled`, overlapping execution, and notification history.                             |
| Shortcut does nothing in a textarea      | Application shortcuts protect editable controls unless `allowInEditable` is explicitly enabled.                          |
| Translation displays its key             | Add that key to an application/plugin catalog for the active language or English fallback.                               |
| Hook provider error                      | Call hooks from a component inside Workbench or the matching explicit provider, never during activation.                 |
| Old saved layout rejected                | The current panel identity set differs, or data is corrupt; use the default layout and save a fresh checkpoint.          |
| Preferences/layout do not survive reload | Check the configured storage keys and notification feedback; browser storage may be blocked/full.                        |
| Port already used                        | Stop your existing server or choose another port for your separate application; framework defaults are strict.           |
| PowerShell refuses npm                   | Use `npm.cmd`.                                                                                                           |
