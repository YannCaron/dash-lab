# dash-lab

Build once. Create many.

A reusable React workbench and a separate Hello World demo. This first increment implements the project foundation; the remaining features are tracked in [prompt.md](prompt.md).

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

The package is ESM with TypeScript declarations and a separate stylesheet:

```tsx
import { Workbench } from 'dash-lab';
import 'dash-lab/style.css';

export function Application() {
  return <Workbench title="My Lab">Application content</Workbench>;
}
```

Give the workbench a parent with an explicit height. React and React DOM are peer dependencies. See [architecture](docs/architecture.md) for component boundaries and [dependency notes](docs/dependencies.md) for versions and licensing.

## License

[MIT](LICENSE).
