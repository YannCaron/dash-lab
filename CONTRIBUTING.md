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

## Git hooks and CI

Development installation runs `prepare` to install Husky for this repository. Pre-commit runs lint-staged (ESLint/Prettier on staged code; Prettier on staged documents), and commit-msg checks Conventional Commits with a 100-character header limit. CI and production installs skip hook installation. Consumers installing the published-format tarball do not need Husky.

GitHub Actions defines Linux/Windows Node 24 checks and a Linux Node 22.13 compatibility job, plus Windows Edge interactions against compiled and development servers. Pull-request commits are checked over the base/head range. The workflows have read-only repository permissions and do not publish packages or deploy.

For the same browser orchestration locally, run `npm run build`, then `npm run test:browser:ci` and `npm run test:browser:ci -- --dev`. These commands own and close their temporary servers on ports 4383 and 5383. The full script still accepts `BROWSER_PATH` when Edge is unavailable.

## Publish to npm

The npm package name is `@cyann/dash-lab`, matching `@cyann/js-parsec` and `@cyann/js-commons`. The repository and product remain named `dash-lab`. Use `@cyann/dash-lab` in imports and `@cyann/dash-lab/style.css` for styles.

First simulate publication; no npm login is required for this mode:

```sh
npm run publish:npm -- --dry-run
```

The script runs strict TypeScript, lint, formatting, Vitest, publication-script tests, and the packed-consumer check (which builds the library). It packs the resulting library into an ignored `test-results/npm-publish/` directory, then invokes [`npm publish --dry-run`](https://docs.npmjs.com/cli/v11/commands/npm-publish/). The current version stays unchanged, and uncommitted work is allowed for simulation.

For a real publication, commit the prepared release notes/version and sign in as `cyann`:

```sh
npm login --registry=https://registry.npmjs.org/
npm run publish:npm
```

Real publication requires a clean Git checkout and verifies the logged-in account using [`npm whoami`](https://docs.npmjs.com/cli/v11/commands/npm-whoami/). It runs the same checks, checks Git cleanliness again, and publishes the exact packed tarball publicly to `https://registry.npmjs.org/`. npm handles any required interactive two-factor authentication. Credentials stay in npm's normal authentication setup; the script does not embed tokens or log in on your behalf.

The script publishes the version already declared in `package.json`. For subsequent releases, update `CHANGELOG.md` and `release-node.md`, then explicitly select a new version, for example:

```sh
npm version patch -m "chore(release): %s"
npm run publish:npm -- --dry-run
npm run publish:npm
```

`npm version` updates the manifest/lockfile and normally creates a local commit and tag; commit release-note changes first. The publication script itself never changes versions, creates tags, or pushes Git commits. Stable versions use the `latest` npm tag; prerelease versions default to `next` and cannot target `latest`. Override with `npm run publish:npm -- --tag next`. npm rejects an already published name/version; choose a new version rather than overwriting it.

The script does not run browser or Storybook builds; run the existing browser/Storybook checks separately for interface changes. Use `npm.cmd` in these examples if PowerShell blocks `npm.ps1`.

## Dependencies and reports

Use the current stack and platform APIs first. Obtain approval before adding a dependency not explicitly requested by the owner. Record versions, authoritative license texts, transitive implications, Node requirements, and relevant security findings in [dependency notes](docs/dependencies.md). Do not apply forced audit downgrades or hide failures.

Bug reports should contain Node/browser versions, steps, expected and actual behavior, and a minimal reproduction. Remove private data from logs and configuration files before sharing them. Contributions are provided under the project's [MIT license](LICENSE).

Keep [release-node.md](release-node.md) current in the same commit as each feature or fix, including verified outcomes and limits. Use the [application/plugin guide](docs/application-guide.md) for complete setup recipes. Tutorial code is part of the handover contract and should compile against the public package.
