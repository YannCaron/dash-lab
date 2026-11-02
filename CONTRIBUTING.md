# Contributing

Use Node.js 24 LTS, Git, and npm. Read [AGENTS.md](AGENTS.md) before changing the project; it defines dependency approval, architecture, validation, and local-commit rules.

```sh
npm ci
npm run dev
```

The demo opens at http://127.0.0.1:5173. `dev` watches the library, declarations, and application. `npm run start` builds once and previews at http://127.0.0.1:4173. Use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Scope and structure

- `src/`: reusable library, public exports in `src/index.ts`.
- `demo/src/`: consuming application, including local plugins discovered by Vite.
- `src/**/*.test.*`: Vitest contracts, stores, and provider tests.
- `src/**/*.stories.tsx`: interactive component examples.
- `scripts/`: startup, browser interactions, and packed-consumer verification.
- `docs/`: architecture, decisions, API reference, dependencies, and validation evidence.

Keep library dependencies directed toward services and contracts. Application-specific code belongs in the demo or another consumer. Public APIs need English JSDoc, examples, and backward compatibility. New runtime-visible labels need English and French support; application/plugin catalogs remain application-owned.

## Before committing

```sh
npm run check
npm run lint
npm run format:check
npm test
npm run build
npm run test:package
npm run build:storybook
```

`test:package` uses the npm cache populated by installation to install the produced tarball offline into a fresh consumer. Keep `test-results/` for diagnostics; do not commit generated builds, caches, or screenshots.

For an interface or effect-lifecycle change, start the demo and run `npm run test:browser` in another terminal. It uses an installed Chromium browser, with Microsoft Edge as the Windows default. Set `BROWSER_PATH` for another executable. To test development directly, use `npm run test:browser -- http://127.0.0.1:5173`. Screenshots and isolated profiles stay in `test-results/`. Tests must preserve actual panel instances, focus behavior, and meaningful assertions.

Use focused commits such as `feat(plugin): add an application contribution`, `fix(layout): preserve a saved checkpoint`, or `docs: clarify plugin startup`. Make one coherent feature or fix per commit. Do not publish or push automatically. Update the affected documentation and [CHANGELOG.md](CHANGELOG.md), including verification and any remaining limits.

## Dependencies and reports

Use the current stack and platform APIs first. Obtain approval before adding a dependency not explicitly requested by the owner. Record versions, authoritative license texts, transitive implications, Node requirements, and relevant security findings in [dependency notes](docs/dependencies.md). Do not apply forced audit downgrades or hide failures.

Bug reports should contain Node/browser versions, steps, expected and actual behavior, and a minimal reproduction. Remove private data from logs and configuration files before sharing them. Contributions are provided under the project's [MIT license](LICENSE).
