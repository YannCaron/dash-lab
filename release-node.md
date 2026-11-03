# Release notes

## Unreleased — package version 0.1.0

Implementation completed locally on 2026-11-03. No release tag, npm publication, push, or deployment has been performed. [CHANGELOG.md](CHANGELOG.md) is the concise summary; this file records the feature-level handover.

| Feature                            | Delivered behavior                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Bootstrap                      | Strict React/TypeScript library, separate Vite demo, ESM/declarations/CSS outputs, lint/format/test/build tooling, `dev` watch and one-shot `start`.                                       |
| 2 — Layout                         | Header, controls, monitoring, Dockview workspace, footer, visibility preferences, and Focus mode with keyboard focus restoration.                                                          |
| 3 — Theme                          | Light/dark palettes, shared CSS tokens, Ant Design/Dockview integration, animated transitions, and reduced-motion preferences.                                                             |
| 4 — Layout management              | Explicit versioned checkpoint, restore/reset, native presets, validated persistence, retained panel instances, and session fallback for blocked storage.                                   |
| 5 — Notifications                  | Bounded history, unread state, dismissal/acknowledgment/removal, timed and sticky popups, and centralized feedback.                                                                        |
| 6 — Commands                       | Framework-independent registry, disposable registrations, conflicts/availability/busy state, asynchronous error handling, and scoped shortcuts.                                            |
| 7 — Palette                        | Normalized/fuzzy title/ID search, keyboard navigation, unavailable actions, recent successful commands, and modal focus handoff.                                                           |
| 8 — Menus/settings                 | File menu, Settings, preference drafts, separate preference persistence, and validated JSON import/export.                                                                                 |
| 9 — Local plugins                  | Synchronous transactional startup, Vite eager directory discovery, sealed contributions, and panels/commands/menus/status/monitoring. Hello World uses the same SDK.                       |
| 10 — Languages                     | English/French UI, extensible catalogs, Ant Design locales, translated command search and panel titles, persistent language, and legacy configuration compatibility.                       |
| 11 — Quality                       | Service/store/provider regressions, real-browser interactions, and fresh packed-consumer ESM/NodeNext/SSR/CSS checks.                                                                      |
| 12 — Documentation                 | API reference, contribution guide, changelog, project handover map, architecture decisions, Storybook, and retained MIT notices.                                                           |
| 13 — GitHub readiness              | Read-only CI workflows, Windows/Linux/Node matrix, browser orchestration, Husky, lint-staged, commitlint, issue/PR templates, and ignored generated artifacts.                             |
| 14 — Tutorials and release records | Ten-minute README tutorial, complete application/plugin guide, this release record, and mandatory agent maintenance instructions. The demo's panel count follows discovered contributions. |

### Interface refinements

The seven requested refinements are included: a single View control, larger modal close controls, blue/gray reference-aligned themes, larger notifications, sliding modal/toast entrances with fading backdrops, backdrop dismissal, and independent panel scrolling. Dragging from inside a dialog to its backdrop does not dismiss it. System and explicit reduced-motion choices disable overlay animations.

Tutorial validation also updates the demo's dynamic panel count and places its application component inside the language provider, so header/footer/monitoring props and plugin status text follow the selected language.

### Compatibility and operating model

- Existing version-1 configurations without a language select English. Unknown languages are rejected before applying a workspace.
- Panel/command IDs remain stable across display-title and language changes. Incompatible panel sets reject old layouts while keeping a usable default.
- Plugins are trusted local application code compiled by Vite. Activation is synchronous; membership changes require a remount, and production changes require a rebuild.
- Layout/plugin checkpoints are explicitly saved. Preferences persist independently. Unregistered React panel contents, notification history, and recent commands are session state.
- React/React DOM 19 are peers. Node 24 is the local validation baseline; the declared Node 22.13 compatibility target is included in CI.

### Verification and limits

Seventy-four Vitest tests, seven publication-script tests, strict TypeScript, ESLint, Prettier, library/demo builds, Storybook, and packed-consumer checks pass locally. Seventy-six browser checks pass against both compiled and development demos, including plugin state restoration and French persistence. Earlier tutorial verification is recorded in [validation](docs/validation.md).

Runtime audit: zero findings. Fourteen moderate development-tooling findings remain documented in [dependencies](docs/dependencies.md), along with Vite chunk-size and Storybook directive warnings. Local browser verification covers Edge/Chromium, not Firefox or Safari. GitHub-hosted workflow execution and the Linux/Node 22.13 matrix require a repository push and have not been executed here.

### Source readability

Library, demo, tests, Storybook examples, and scripts use blank lines to separate declarations, processing steps, and results. Consecutive declarations and related assertions stay grouped. This maintenance change only adjusts source spacing and preserves runtime behavior and public contracts.

Verified locally: blank-line-only code diff, strict TypeScript, ESLint, Prettier, all 60 Vitest tests, library/demo and Storybook builds, packed-consumer compatibility, and all 72 browser checks against the compiled demo. Existing bundle-size and Storybook directive warnings remain.

### Plugin state serialization

Optional `api.registerState({ exportState, importState })` callbacks associate JSON data with the owning plugin ID. Save/Restore layout and startup reload use the existing checkpoint; configuration JSON stores plugin data once at its top level. The demo Hello World plugin opts in for its name and greeting, and Storybook includes an editable persistent note. Framework defaults and plugins without state handlers remain compatible.

Version-1 files without plugin data retain current plugin state. Missing handlers are ignored, while malformed JSON state is rejected. Domain import failures prevent layout/preferences changes and trigger reverse-order plugin rollback; incomplete rollback is reported. Handlers must synchronously validate input and accept their own exported data. The existing 1 MB limit includes plugin data. Panel-less workbenches support JSON transfer in the current session; local checkpoints require a docking workspace.

Verification includes fourteen new unit tests, state round-trips through the compiled/development demos, legacy-file import, domain-invalid import preserving live state/layout/preferences, retained panel identity, strict packed-consumer declarations, and a Storybook build. No dependencies were added.

### npm publication tooling

The npm package is named `@cyann/dash-lab`, matching the owner's existing library scopes. Demo imports, TypeScript/Vite resolution, packed-consumer checks, and documentation use this package name. The product/repository name, CSS export filename, JSON format identifier, and browser-storage keys remain unchanged.

`npm run publish:npm -- --dry-run` validates and simulates the current version. Real `npm run publish:npm` requires a clean Git checkout and the npm account `cyann`, then publishes the exact validated tarball publicly to npmjs. Stable versions use `latest`; prereleases default to `next`. The script never automatically bumps versions, tags, commits, or pushes. Version/release-note preparation remains explicit, and npm manages login/two-factor authentication.

Publication-script tests use isolated local Git fixtures and a fake npm CLI; no tests upload a package. The complete real-CLI dry run succeeds for `@cyann/dash-lab@0.1.0`, including seven script tests, seventy-four Vitest tests, formatting/lint/type checks, and installation of the scoped tarball into a fresh consumer. Live authentication and actual publication have not been exercised. Further validation is recorded in [validation](docs/validation.md). No package has been published by this implementation task.

### Future updates

Keep this Unreleased section current with each feature/fix and its validation or limits. When a real release is made, move the relevant entries under its actual version and date, retain an Unreleased section for subsequent work, and update the package version/changelog consistently. Do not describe a release as published without evidence of publication.
