# Features 1–3 validation

Verified locally on Windows with Node.js 24.20.0 on 2026-11-02:

- TypeScript strict checking, ESLint, Prettier, and library/demo builds pass.
- Eleven Vitest tests cover panel contracts, independent workbench/theme state, focus visibility preferences, nested provider composition, and text contrast.
- Eleven headless Edge interaction checks pass against both `npm run start` and `npm run dev`: real greeting input, chrome visibility, focus exit and keyboard focus restoration, retained panel instances, both theme integrations, and reduced motion.
- Changing reduced-motion preferences during a session keeps the same panel instances and their state. Ant Design durations change without toggling its structural motion wrapper.
- The library build watcher rebuilds after an actual palette edit; Vite serves the changed source. The probe restores the original source and output.
- The packed npm tarball installs in a separate consumer. Its public API type-checks with NodeNext resolution, imports as ESM, renders with React DOM server, and resolves its CSS export.
- The static Storybook build succeeds with light, dark, hidden-chrome, and empty-workspace examples.
- Light/dark screenshots are visually reviewed at 1440 × 1000. They are generated under the ignored `test-results/` directory by `npm run test:browser`.

Browser verification currently covers Edge only. Firefox and Safari have not been tested. Dependency audit and bundling warnings are described in [dependency notes](dependencies.md).

## Feature 4

Seventeen unit tests and sixteen browser checks pass. Layout checks cover columns/rows presets, restoration and reset with the same panel instances, preservation of the explicit checkpoint, persistence across reload, corrupt saved data, and blocked storage with an in-memory fallback. The integration test waits for Dockview's asynchronous geometry update before comparing panel positions.

## Feature 5

Twenty-three unit tests and twenty-three browser checks pass. Notification checks cover bounded history, toast dismissal without losing unread entries, automatic toast expiry, sticky errors, per-item acknowledgment/removal, marking all read, clearing history, modal keyboard focus, and Escape. Layout actions publish into the same center. Warning/error text colors satisfy the same contrast tests as the other theme text.

## Feature 6

Thirty-two unit tests and thirty-two browser checks pass. The complete browser suite runs against development (including React StrictMode) and compiled demo servers. Command tests cover registration cleanup, ID and canonical shortcut conflicts, independent platform mappings, dynamic availability, asynchronous overlap prevention, error propagation, subscriptions, text-entry and contenteditable protection, IME/repeat/AltGraph filtering, scoped keyboard dispatch, modal boundaries, and built-in actions over layouts/themes/focus/notifications. A failing asynchronous demo action creates a notification without breaking the workspace.

The packaged library is installed into a fresh consumer after Features 4–6. Public types pass strict NodeNext checking; ESM execution, explicit provider composition, and the CSS export pass. Storybook includes interactive command and notification examples. The runtime audit reports zero vulnerabilities; the dependency versions are unchanged.

## Feature 7

Thirty-five unit tests and forty-one compiled-demo browser checks pass. Palette checks cover normalized and abbreviated search, empty results, live availability, unavailable actions, keyboard selection, recent successful commands, retained panel state, Escape focus restoration, Focus mode, and transfer to the notification dialog without stacking modals. Search ranking has separate unit coverage. No dependency was added.

## Feature 8

Forty-two unit tests and fifty-six compiled-demo browser checks pass. Coverage includes the File menu entirely by keyboard, Settings focus restoration and layout saving, preference drafts and cancellation, retained panel state, independent preference persistence, popup choices, real JSON download and file-picker imports, successful restoration after reload, rejection of incompatible versions/panels without partial application, repeated file selection, and blocked browser storage. Configuration validation also covers malformed preferences, missing workspaces, byte-size limits, and unknown fields.

The full browser suite also passes against the development server with React StrictMode. The packed package installs into a fresh consumer and passes strict NodeNext type checking, ESM execution, SSR provider composition, and CSS-export checks. Storybook builds with a settings example. The runtime dependency audit reports zero vulnerabilities; no dependency was added.

## Requested UI modifications

On 2026-11-03, forty-three unit tests and sixty-six compiled-demo browser checks pass. The seven changes cover the combined View control, larger modal close controls, blue/gray light and dark palettes aligned with the supplied references, larger notification text and panels, animated modal/toast entrances and fading backdrops, backdrop dismissal, and independent panel scrolling. Palette text contrasts remain covered by independent luminance calculations.

The same sixty-six checks pass on the development server with React StrictMode. Browser checks exercise all three modal backdrops, cancellation of a preference draft, focus restoration, preservation of a drag starting inside a modal, animation disabling for reduced motion, and real wheel scrolling inside overflowing content. Storybook includes an overflowing-content example. Screenshots capture settled overlays for visual review.

## Feature 9

Forty-nine unit tests cover plugin startup, all contribution kinds, copied/frozen definitions, transactional rollback, cleanup, stale APIs, duplicate IDs/shortcuts, reserved commands, deterministic module order, and sealing. The compiled demo discovers Hello World through Vite's eager directory glob. Browser checks exercise its panel, footer and monitoring items, and execute the contributed command from both its menu and the palette.

## Feature 10

Fifty-four unit tests and seventy-two compiled-demo browser checks pass. Language checks cover English defaults, French, catalog extension, fallback, plain-text interpolation, isolated providers, real Ant Design locale context, legacy preferences, and rejection of an unregistered language before applying a layout. The browser changes language without replacing the Hello World panel or its input, searches and executes a translated command, receives French feedback, and restores French menus/preferences after reload.

## Feature 11

Sixty Vitest tests pass, including public hook/provider contracts, nearest-provider isolation, missing-provider messages, independent stores, legacy language configuration, and a regression ensuring standalone English stays read-only during server rendering. Server snapshots use Zustand's initial state; browser interaction tests cover live updates and effect lifecycles.

`npm run test:package` builds and packs the library, rejects source/demo/test leakage, installs the tarball offline into a fresh application using npm's populated cache, type-checks its public API under strict NodeNext resolution, then executes real ESM/React server rendering, plugin status, French, legacy configuration, and CSS-export checks. Artifacts stay under ignored `test-results/`. The runtime install uses normal npm lifecycle handling, so package hook mistakes are observable.

## Feature 12

The API reference documents every public export group and its contracts. Contribution instructions, a changelog, project-specific agent guidance, and the plugin/language architecture decision accompany it. Storybook builds with plugin and language examples as well as the existing layout/theme/notification/command examples. The MIT license and third-party notices remain included in the package.

## Feature 13

CI and issue-form YAML structures are parsed locally; Conventional Commits validation accepts a valid message and rejects an invalid one. Husky is installed locally, with staged checks and commit-message validation enabled. The browser CI runner starts/closes its own server and passes all seventy-two checks against both compiled and development demos. Packed-consumer verification also passes with normal install lifecycle handling after hook setup.

GitHub-hosted workflow execution and the Linux/Node 22.13 matrix have not been run locally. They require pushing the repository; no push, deployment, package publication, or GitHub-side mutation is performed here.

## Feature 14

The README's Counter plugin and the complete application's Notes plugin, discovery module, language catalogs, HTML/CSS, and Vite/TypeScript configuration are extracted from their Markdown examples into a fresh packed-library consumer. They pass strict type checking and a real Vite build. Three additional browser checks verify local discovery, Counter state through View/theme changes, and its command's notification without state reset. The settled screenshot is `test-results/tutorial-counter.png`.

Documentation links resolve locally. `release-node.md` records all fourteen features, compatibility, verification, and publication status; AGENTS.md requires agents to update it in the same work/commit as future changes. Package contents include the guide, API docs, contribution/agent instructions, changelog, and release notes. The demo monitoring count derives from actual plugin/application panels rather than a fixed number.

Final visual review and the French browser regression also cover translated application-constructed header/footer/monitoring content and plugin status, with all toolbar controls remaining inside the desktop viewport.

## Plugin state serialization

On 2026-11-03, seventy-four Vitest tests pass. New tests cover optional/scoped registration and disposal, copied JSON snapshots, unsupported exports, missing/unknown IDs, null values, legacy configuration/checkpoints, domain failure rollback including a partially mutated failing plugin, incomplete rollback reporting, and rollback when native layout application fails. Strict TypeScript and ESLint pass.

All seventy-six Edge checks pass against both the compiled demo and the development server with React StrictMode. They verify explicit plugin checkpoint restoration, startup reload, export without duplicated state, import into the existing mounted panel, imported state surviving reload, rejected plugin versions leaving state/layout/preferences intact, and legacy JSON leaving live plugin data untouched. The demo's Hello World state uses the same registration mechanism as external plugins.

Library/demo and Storybook builds pass, as does the fresh packed-consumer check with the new public state handler/configuration types. Existing bundle-size and Storybook directive warnings remain. Modified files pass Prettier and `git diff --check`; the global format command flags the unrelated pre-existing `reviews/review-flash-2026-11-03-0938.md`, which is left unchanged. No dependency was added.

## Scoped package and npm publication script

The package is named `@cyann/dash-lab`, consistent with the adjacent libraries' manifests. Source imports, TypeScript/Vite aliases, documentation, and the packed-consumer fixtures use that name. Configuration JSON identifiers and browser-storage keys stay `dash-lab` for compatibility.

`npm run publish:npm -- --dry-run` succeeds with the real npm CLI. It runs strict TypeScript, ESLint, global Prettier, all seventy-four Vitest tests, seven script integration tests, and the packed-consumer check. It then packs `cyann-dash-lab-0.1.0.tgz` and successfully simulates publishing that exact artifact to npmjs with public access and the `latest` tag. Nothing is uploaded. The earlier review-format warning has been resolved by the intervening documentation commit; the global check now passes.

The seven script tests use temporary local Git repositories and a fake npm executable. They cover dirty-checkout rejection, account mismatch, early stop on failed validation, simulation without authentication, selection of the exact tarball, prerelease tags, invalid arguments, and package identity restrictions. Live account authentication and real publication remain untested; no account credentials are requested by these tests. No dependency was added.

Library/demo and Storybook builds also pass after the package rename. All seventy-six Edge checks pass against both compiled and development demos, confirming public package resolution, plugin state, configuration compatibility, and localization with the scoped imports.

## Git tags after npm publication

Twelve publication-script integration tests pass using real temporary Git repositories and a fake npm CLI. They verify annotated `version-<version>` tags on the validated commit, no tag before npm success or after npm failure, no Git tag during dry runs, unchanged reuse of existing tags, rejection of conflicting tags before npm contact, prerelease tag names, refusal when HEAD moves during checks, and explicit partial-success reporting when Git signing fails after publication.

The full real-npm dry-run pipeline passes with all seventy-four Vitest tests, the twelve script tests, strict TypeScript, ESLint, Prettier, library build, and packed-consumer validation. No actual npm publication or tag creation in the project repository is performed. Browser/Storybook checks are unchanged from the preceding package-scope verification; this change affects publication tooling only.

## Modal exit animations

Seventy-four Vitest tests, strict TypeScript, ESLint, Prettier, library/demo and Storybook builds, and packed-consumer validation pass. Eighty-seven Edge checks pass against both compiled and development demos, including eleven new checks for animated modal closure, focus handoff, rapid reopening, and immediate closure under system/explicit reduced motion.

Browser checks wait for entry to finish, trigger real dismissal, pause actual exit transitions halfway, and inspect opacity, slide direction, top-layer retention, backdrop fading, and the retained Preferences title. They finish the transitions and verify `display: none`. Escape, backdrop clicks, close buttons, Cancel, and Apply are exercised. Visual review of `test-results/demo-modal-exit.png` and `test-results/demo-notifications-exit.png` confirms the exit appearance and retained notification column layout. The palette still hands focus to Settings without stacking open modal dialogs.

The first browser run exposed the old entry keyframes masking exit opacity; replacing modal/backdrop entry keyframes with shared native CSS transitions resolved it on Edge. Toast entry remains unchanged. That initial verification did not include Firefox or Safari; the subsequently reported Firefox failure and its correction are recorded below. Existing build-size/Storybook warnings remain. No dependency or public API was added.

## Firefox notification exit regression

Reproduced on installed Firefox 159 using its actual WebDriver BiDi protocol and an isolated profile. The original notification dialog became `display: none` immediately after the close button, with no intermediate opacity or position. Firefox reports no native CSS overlay support. The new shared helper keeps the modal open during its fade/slide and calls `close()` only after its own transitions settle. Escape is intercepted before the browser default to cover non-cancelable cancel events after programmatic opening.

Six Firefox regressions pass against both the compiled demo and the development server: close-button motion with natural completion and focus restoration, real keyboard Escape, real pointer backdrop clicks, rapid reopening without delayed closure, palette-to-Settings handoff with only one open modal, and immediate closure with reduced motion. The tests observe intermediate opacity/position and backdrop opacity without advancing animation clocks. Run `npm run test:firefox` after building, or `npm run test:firefox -- --dev`; `FIREFOX_PATH` selects another installed executable.

The existing eighty-seven Edge checks pass in both compiled and development modes, retaining its native CSS exit path. Seventy-four Vitest tests, strict TypeScript, ESLint, formatting, library/demo and Storybook builds, and packed-consumer checks pass. No dependency or public API was added. Safari remains untested.

## Theme families and automatic custom layout

81 Vitest tests cover all eight palettes, independent family/mode/provider state, high-contrast text and border targets, additive preference round-trips, legacy compatibility and unknown-family rejection. Strict TypeScript, ESLint, Prettier, library/demo and Storybook builds, and packed-consumer validation pass.

100 Edge checks pass against each compiled and development demo. New interactions exercise each family in both modes without remounting panels, theme-family persistence and JSON export, real pointer-driven sash resizing, automatic custom/chrome persistence, restoring the exact custom width after trying presets, preserving the custom checkpoint during theme and host-window resizing, and storage failure fallback. Existing stateful plugin checkpoint, import rollback, localization, keyboard and overlay checks still pass. Six native Firefox modal regressions also pass against the compiled demo. No remote publication was performed.
