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

For modal changes, also run `npm run test:firefox` after a build and `npm run test:firefox -- --dev`. This targeted WebDriver BiDi regression starts/closes its own server and an isolated headless Firefox profile. Windows defaults to `C:/Program Files/Mozilla Firefox/firefox.exe`; set `FIREFOX_PATH` for another installation. It checks notification exit on button/Escape/backdrop dismissal, focus restoration, rapid reopening, command handoff, and reduced motion without adding a browser automation dependency.

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

The script runs strict TypeScript, lint, formatting, Vitest, publication-script tests, and the packed-consumer check (which builds the library). It packs the resulting library into an ignored `test-results/npm-publish/` directory, then invokes [`npm publish --dry-run`](https://docs.npmjs.com/cli/v11/commands/npm-publish/). The current version stays unchanged, no Git tag is created, and uncommitted work is allowed for simulation.

For a real publication, commit the prepared release notes/version and sign in as `cyann`:

```sh
npm login --registry=https://registry.npmjs.org/
npm run publish:npm
```

Real publication requires a clean Git checkout and verifies the logged-in account using [`npm whoami`](https://docs.npmjs.com/cli/v11/commands/npm-whoami/). It records the release commit, runs the same checks, and verifies that Git stays clean and HEAD unchanged before packing. It publishes the exact packed tarball publicly to `https://registry.npmjs.org/`, then creates an annotated local Git tag `version-<version>` on the recorded commit only after npm succeeds. npm handles any required interactive two-factor authentication. Credentials stay in npm's normal authentication setup; the script does not embed tokens or log in on your behalf.

An existing tag on the release commit is reused unchanged. A tag pointing to another commit blocks publication before contacting npm; it is never overwritten. Git committer identity is checked before publishing. If npm succeeds but Git tagging fails (for example, signing fails), the command reports partial success and exits with an error: repair the local tag on the reported commit manually, without republishing that npm version. Tags and commits are never pushed automatically.

The script publishes the version already declared in `package.json`. For subsequent releases, update `CHANGELOG.md` and `release-node.md`, then explicitly select a new version, for example:

```sh
npm version patch --no-git-tag-version
git add package.json package-lock.json CHANGELOG.md release-node.md
git commit -m "chore(release): prepare next version"
npm run publish:npm -- --dry-run
npm run publish:npm
```

`npm version --no-git-tag-version` updates the manifest/lockfile without creating a premature release tag. Commit those files with the release notes before publishing; the publication script creates the tag after success. It never changes versions or creates commits. Stable versions use the `latest` npm distribution tag; prerelease versions default to `next` and cannot target `latest`. Override with `npm run publish:npm -- --tag next`. This npm tag is separate from the Git version tag, such as `version-0.2.0-rc.1`. npm rejects an already published name/version; choose a new version rather than overwriting it.

The script does not run browser or Storybook builds; run the existing browser/Storybook checks separately for interface changes. Use `npm.cmd` in these examples if PowerShell blocks `npm.ps1`.

## Dependencies and reports

Use the current stack and platform APIs first. Obtain approval before adding a dependency not explicitly requested by the owner. Record versions, authoritative license texts, transitive implications, Node requirements, and relevant security findings in [dependency notes](docs/dependencies.md). Do not apply forced audit downgrades or hide failures.

Bug reports should contain Node/browser versions, steps, expected and actual behavior, and a minimal reproduction. Remove private data from logs and configuration files before sharing them. Contributions are provided under the project's [MIT license](LICENSE).

Keep [release-node.md](release-node.md) current in the same commit as each feature or fix, including verified outcomes and limits. Use the [application/plugin guide](docs/application-guide.md) for complete setup recipes. Tutorial code is part of the handover contract and should compile against the public package.
