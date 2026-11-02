# dash-lab

Build once. Create many.

A reusable React workbench and a separate Hello World demo. Features 1–2 provide the foundation and dockable workbench shell; the remaining features are tracked in [prompt.md](prompt.md).

## Run the demo

Use Node.js 22.13+ (24 LTS recommended). From this directory:

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

Give the workbench a parent with an explicit height. React and React DOM are peer dependencies. See [architecture](docs/architecture.md) for component boundaries and [dependency notes](docs/dependencies.md) for versions and licensing.

## Workbench shell

Supply `panels` with unique IDs, titles and React components. Optional positions reference panels listed earlier. Keep the initial panel collection stable for the lifetime of a workbench. The library exposes `WorkbenchPanel` for TypeScript consumers and `onWorkspaceReady` for access to the Dockview API.

Use the `headerActions`, `controlBar`, `monitoringBar`, and `footer` slots for application content. The control bar toggles header/footer visibility and enters Focus mode. Escape or the visible exit button leaves Focus mode and restores the previous visibility preferences. The docked workspace stays mounted throughout, preserving component state. Default tabs stay open; layout restoration and panel management are deferred to Feature 4.

## License

[MIT](LICENSE).
