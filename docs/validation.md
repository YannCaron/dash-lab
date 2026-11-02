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
