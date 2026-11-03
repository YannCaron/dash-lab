# dash-lab

npm package name: `@cyann/dash-lab`.

Build once. Create many.

A reusable React workbench for desktop applications: dockable panels, light/dark themes, saved layouts, commands and shortcuts, notifications, settings, local plugins, and English/French interfaces. The Hello World demo consumes the same public API as an application.

## Run the demo

Use Node.js 24 LTS, or Node.js 22.13+ in the 22.x series. From this repository directory:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Development runs the library build with `--watch`, watches TypeScript declarations, and serves the demo with hot reload. Ctrl+C closes the watchers and server.

```sh
npm run start
```

This checks types, builds the library and demo once, and previews at http://127.0.0.1:4173. It does not watch files or require a prior build. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Ten-minute tutorial: your first plugin

### 1. Start the workspace — two minutes

Run the commands above. Try dragging a tab, switching themes, and opening Commands with Ctrl/⌘+Shift+P. View hides the header and footer together; Focus hides all chrome and Escape restores it.

### 2. Add a component — three minutes

Create `demo/src/plugins/counter/Counter.tsx`:

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <section style={{ padding: 24 }}>
      <h1>Counter</h1>
      <p>
        Value: <output aria-label="Counter value">{count}</output>
      </p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
    </section>
  );
}
```

### 3. Register the plugin — two minutes

Create `demo/src/plugins/counter/index.ts`:

```ts
import type { WorkbenchPlugin } from '@cyann/dash-lab';
import { Counter } from './Counter';

const plugin: WorkbenchPlugin = {
  id: 'counter',
  activate(api) {
    api.registerPanel({ id: 'counter.panel', title: 'Counter', component: Counter });
    api.registerCommand({
      id: 'counter.notify',
      title: 'Counter: send a notification',
      execute: ({ notify }) => {
        notify({ title: 'The counter plugin is ready.', level: 'success' });
      },
    });
    api.registerMenu({ id: 'counter.menu', title: 'Counter notification', commandId: 'counter.notify' });
  },
};

export default plugin;
```

The demo already discovers `src/plugins/*/index.ts` with Vite. Its plugin boundary reloads when membership changes. If the old saved layout has a different panel set, it is rejected and the default layout stays usable; a new custom checkpoint is saved automatically after arranging your panels.

### 4. Use it — two minutes

Select Counter, click Increment, and switch tabs or enter/leave Focus. The counter value remains. Open Plugins → Counter notification, or search `counter.notify` in Commands, to run the registered action. No additional entry in the demo component is required.

Activation is synchronous. IDs must be unique; `workbench.*` command IDs are reserved. Plugin panels are registered before application panels, and references must point to earlier panels. A panel without a position uses Dockview's default placement. Plugins are trusted application code bundled with the app; production membership changes require a rebuild.

### 5. Verify and continue — one minute

```sh
npm run check
npm test
npm run build
```

Save a layout, change Preferences → Language, and try JSON export/import from File. Plugins can opt in with `api.registerState({ exportState, importState })`; the Hello World demo saves its name and greeting with the layout and configuration. For a fresh consuming application, all six plugin contributions, state handlers, language catalogs, and troubleshooting, follow the [application and plugin guide](docs/application-guide.md). The [API reference](docs/api.md) covers individual contracts.

## Use the library

```sh
npm install @cyann/dash-lab
```

Maintainers can prepare publication with `npm run publish:npm -- --dry-run`, then publish a committed release with `npm run publish:npm`. See [the publication guide](CONTRIBUTING.md#publish-to-npm) for account setup, versioning, and prerelease tags.

Build a local tarball with `npm pack` and install it in a consuming application. No npm publication is assumed. React and React DOM are peers; import the stylesheet explicitly and give the workbench a parent with a height:

```tsx
import { Workbench } from '@cyann/dash-lab';
import '@cyann/dash-lab/style.css';

export function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Workbench title="My Lab">Ready</Workbench>
    </div>
  );
}
```

Use an optional surrounding router for application routes. Workbench supplies isolated theme, notification, command, and language providers, or reuses explicit ancestors. Its stable panels retain React state and scroll independently.

## Development and checks

```sh
npm run check
npm run lint
npm run format:check
npm test
npm run build
npm run test:package
npm run build:storybook
npm run test:browser:ci
npm run test:browser:ci -- --dev
```

Browser checks use installed Microsoft Edge on Windows. Set `BROWSER_PATH` for another Chromium executable. `npm run test:browser -- http://127.0.0.1:5173` tests an already running demo. The CI runner owns its temporary server. Screenshots, profiles, and packed consumers stay in ignored `test-results/`.

`npm run storybook` opens the interactive examples. Husky installs local hooks during development installation: staged ESLint/Prettier checks and Conventional Commits. CI/production installs skip hook setup. GitHub Actions includes Windows/Linux checks and does not publish or deploy.

## Documentation

- [Application and plugin guide](docs/application-guide.md): complete setup and contribution recipes for humans and agents.
- [Public API](docs/api.md): props, providers, hooks, services, and persisted-format contracts.
- [Architecture and decisions](docs/architecture.md): ownership and dependency direction.
- [Contributing](CONTRIBUTING.md) and [agent instructions](AGENTS.md): implementation and validation rules.
- [Release notes](release-node.md) and [changelog](CHANGELOG.md): completed features and release status.
- [Validation](docs/validation.md) and [dependencies/licenses](docs/dependencies.md): evidence and known limits.

Desktop workstations are the supported target. Browser verification currently covers Chromium/Edge; Firefox and Safari are not verified. Runtime audit and remaining tooling/bundle warnings are documented in the dependency notes.

## License

[MIT](LICENSE), with retained [third-party notices](THIRD_PARTY_NOTICES.md).
