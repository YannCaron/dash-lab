# Release notes

## Unreleased — package version 0.1.0

### Issue #2 — Compact mode

The layout command strip now offers a persistent Compact mode switch. It reduces shell and Ant Design controls, tab height and text size, and hides monitoring/secondary labels. Applications and plugins opt optional content into `dl-compact-optional` or read `useCompactMode()`. Existing panels remain mounted; Focus and presets keep their own behavior. Version-1 preferences without `compact` use normal density. Verification covers strict types, Vitest, lint/format, builds, packed consumer, Storybook, and compiled/development browser interactions.

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

Seventy-four Vitest tests, twelve publication-script tests, strict TypeScript, ESLint, Prettier, library/demo builds, Storybook, and packed-consumer checks pass locally. Eighty-seven browser checks pass against both compiled and development demos, including modal entry/exit, plugin state restoration, and French persistence. Earlier tutorial verification is recorded in [validation](docs/validation.md).

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

`npm run publish:npm -- --dry-run` validates and simulates the current version. Real `npm run publish:npm` requires a clean Git checkout and the npm account `cyann`, then publishes the exact validated tarball publicly to npmjs. Stable versions use `latest`; prereleases default to `next`. After successful publication, the script creates an annotated local `version-<version>` Git tag on the validated commit. It never automatically bumps versions, commits, or pushes. Version/release-note preparation remains explicit, and npm manages login/two-factor authentication.

Publication-script tests use isolated local Git fixtures and a fake npm CLI; no tests upload a package. The complete real-CLI dry run succeeds for `@cyann/dash-lab@0.1.0`, including twelve script tests, seventy-four Vitest tests, formatting/lint/type checks, and installation of the scoped tarball into a fresh consumer. Live authentication and actual publication have not been exercised. Further validation is recorded in [validation](docs/validation.md). No package has been published by this implementation task.

### Git release tags

Publication records HEAD, checks tag compatibility and committer identity before contacting npm, and verifies that validation did not change the release commit. A successful npm publish is followed by annotated tag creation on that recorded commit. Existing tags on the same commit are reused; conflicting tags are never overwritten. Dry runs and failed npm publication create no Git tag. No tag is pushed automatically.

If Git tagging fails after npm success, the script reports that publication succeeded and asks for manual tag repair rather than another publish. Version preparation now recommends `npm version patch --no-git-tag-version` followed by a release commit, allowing the publication script to create the tag at the correct time. Actual npm publication is not performed by this development task; tag behavior is tested in isolated local repositories with a fake npm CLI.

Twelve script integration tests cover tag timing, annotated tag identity, prerelease tags, preservation of an existing tag, conflicting targets, npm failure, Git signing failure after npm success, and a concurrent HEAD change. Simulation leaves the repository's release tags untouched.

### Modal exit animations

Commands, Settings/Preferences, and notification history now slide and fade when closed; their backdrops fade out too. CSS transitions handle both directions, with a shared closure helper for browsers lacking native exit support. Escape, backdrop dismissal, close buttons, Cancel, and Apply share this behavior. Reopening cancels pending closure, and command-palette actions wait until native closure before opening another modal.

Preferences retains its title/form during exit and notification history keeps its column layout. System and explicit reduced-motion choices disable all modal entry/exit motion. Browsers without discrete display/overlay support wait for the visual exit before native closure and focus restoration. No dependency or public API was added. Storybook includes an interactive dialog-motion example.

Initial verification: seventy-four Vitest tests, strict TypeScript, lint/format, library/demo and Storybook builds, packed-consumer checks, and eighty-seven Edge checks against both compiled and development demos passed. Exit checks paused real transitions halfway to inspect dialog/backdrop opacity, slide direction, retained top-layer rendering/content, then finished them and verified hiding. Screenshots were visually inspected. Firefox coverage was subsequently added after the reported compatibility failure, as described below; Safari remains untested.

### Firefox modal closure correction

Reproduced on Firefox 159: notification history became `display: none` immediately after closure because Firefox lacks the native overlay transition used by the previous implementation. Shared capability detection now selects a transition-waiting fallback. It keeps the dialog in the top layer until its own fade/slide finishes, then closes and restores focus. Reopening cancels pending work; reduced-motion closure is immediate. Escape is handled before the browser default, including non-cancelable native cancel requests after programmatic opening.

The targeted `npm run test:firefox` regression uses the installed browser through WebDriver BiDi and an isolated temporary profile, with no new dependency. It covers real notification button/Escape/backdrop closure, natural animation completion and focus, rapid reopening, palette-to-Settings handoff, and reduced motion. No publication or version change is performed by this fix.

Verification: all six Firefox 159 checks pass in compiled and development modes, as do the eighty-seven existing Edge checks in both modes, seventy-four unit tests, strict types, lint/format, library/demo and Storybook builds, and the packed-consumer check. The Firefox regression first failed against the previous implementation before passing with the correction. Safari was not tested.

### Version-prefixed Git tags

Successful npm publication now creates the annotated local tag `version-<version>`, for example `version-0.1.0` or `version-0.2.0-rc.1`. Existing-tag reuse and conflict checks use that same format. Dry runs and failed publication still create no tag, and no tag is pushed automatically. Existing historical tags are left unchanged.

Validation: all twelve publication-script tests, ESLint, formatting, and whitespace checks pass. Tests verify the exact version-prefixed tag in isolated Git repositories with a fake npm CLI; no actual publication or release tag is created in this project during validation.

### Future updates

Keep this Unreleased section current with each feature/fix and its validation or limits. When a real release is made, move the relevant entries under its actual version and date, retain an Unreleased section for subsequent work, and update the package version/changelog consistently. Do not describe a release as published without evidence of publication.

## Theme families (unreleased)

Azure preserves the existing blue palette; High Contrast, Emerald and Umber add light/dark variants. The hamburger Theme submenu and Preferences select the family independently of the existing mode switch. Presentation styling increases typography/control sizes and strengthens borders; contrast tests cover all eight palettes and the presentation text/border targets. Application panel content remains responsible for using the shared tokens. Optional `initialFamily`, `ThemeFamily`, `family`/`setFamily` and JSON `themeFamily` are additive; legacy preferences default to Azure. Selected families persist automatically alongside existing preferences. Verification: 81 Vitest tests, strict types, lint/format, library/demo and Storybook builds, packed-consumer validation, and compiled/development Edge browser checks pass. No publication was performed.

## Automatic custom layout (unreleased)

Manual panel movement, resizing and tab activation update the custom layout after 200 ms of inactivity. Pending changes flush before switching arrangements and on page hide/unmount. The toolbar's disk, restore and reset controls are replaced by one Custom layout button alongside Application/Columns/Rows; built-in presets preserve the custom arrangement. Programmatic restoration, host resizing, Focus and language/theme changes do not replace it. Header/footer settings persist immediately against that custom snapshot, while existing preference persistence includes theme family/mode, language, motion and notification settings. Storage errors retain usable session state and report a deduplicated warning. Existing version-1 storage keys, native panel reuse, plugin checkpoint behavior and Save/Restore/Reset commands remain compatible. Plugin-only edits do not trigger layout autosave; JSON export and the legacy Save command capture them explicitly. Verification: 81 Vitest tests, strict types, lint/format, library/demo and Storybook builds, packed-consumer validation, 100 Edge checks against each compiled/development demo, and six real Firefox modal regressions pass. No publication was performed.

## Notification popup exits (unreleased)

Popups now slide right and fade out before their visual snapshots unmount, including dismissal, expiry, history removal/clearing, popup disabling and overflow replacement. Departing popups keep their stack positions during exit, stop their expiry timers, become inert and leave assistive-technology live regions immediately. Store operations and history/unread semantics remain synchronous and unchanged. A bounded fallback and effect cleanup prevent retained snapshots from lingering; system and explicit reduced motion remove popups immediately. Storybook includes a short-lived notification for manual review. Verification: 81 Vitest tests, strict types, lint/format, library/demo and Storybook builds, packed-consumer validation, compiled/development Edge browser suites and nine real Firefox checks pass. No new dependency, public API change or publication.

## Application workspace initialization (unreleased)

Optional `onWorkspaceInitialize(api)` runs once after panel creation and before baseline capture or saved-layout restoration. Applications can size complex nested layouts and choose initial tabs without owning a separate layout manager. The Application preset preserves that initialized layout; saved custom checkpoints still take precedence at startup, and `onWorkspaceReady` remains after restoration. This is additive and does not change existing applications. Verification: 81 Vitest tests, strict types, lint and packed-consumer checks pass. Real Grammar Lab compiled/development integration verifies initial dimensions, preset restoration, retained Monaco models, configuration reload and theme state. No publication or push.

## Slower theme transitions (unreleased)

Light/dark and palette color transitions now last 500 ms instead of 180 ms. Overlay timing is independent at 270 ms, preserving dialog and toast entry/exit behavior. System and explicit reduced-motion choices continue to disable animations. Verification: strict types, library/demo build, lint/format, 81 Vitest tests and the compiled Edge browser suite pass, including the new color-transition duration, reduced motion and existing overlay exits. No API or persistence change.
