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
