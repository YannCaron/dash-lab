# Dependencies

The stack follows the libraries explicitly selected in `prompt.md`. Versions are exact and the npm lockfile is committed. No additional UI framework, icon package, process manager, or test DOM is required.

| Role               | Packages                                    | License         |
| ------------------ | ------------------------------------------- | --------------- |
| UI peers           | React, React DOM                            | MIT             |
| Workbench          | Ant Design, Dockview React, Zustand         | MIT             |
| Demo routing       | React Router                                | MIT             |
| Build              | Vite, its official React plugin             | MIT             |
| Types              | TypeScript; Node/React declarations         | Apache-2.0; MIT |
| Quality            | ESLint, typescript-eslint, Prettier, Vitest | MIT             |
| Component examples | Storybook, React/Vite integration           | MIT             |

TypeScript 6.0.3 is selected because typescript-eslint 8.72.1 declares support below 6.1; the current TypeScript 7 release is outside that range. Node.js 22.13+ satisfies the tooling engines; Node 24 LTS is the development baseline.

Runtime dependencies stay external in the library's JavaScript bundle; the demo bundles what it uses. The distribution must retain dependency copyright/license notices for bundled assets. Installed license files and transitive package metadata are checked as part of dependency validation. Security findings are reported from `npm audit`, independently of the license inventory.

The installed transitive inventory also includes ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0, CC-BY-4.0, and MPL-2.0 packages. Their own license texts and notices continue to apply when redistributing their code or data.

The non-MIT development dependencies include caniuse-lite data (CC-BY-4.0), glob/minimatch and their cache helpers (BlueOak-1.0.0), and Lightning CSS binaries (MPL-2.0). Their authoritative license files are included with the installed packages; these tools are not bundled into the library runtime. Dockview's installed `LICENCE.md` is reproduced in `THIRD_PARTY_NOTICES.md` because its CSS is bundled. Enterprise-only Dockview packages are not used.

On 2026-11-02, `npm audit --omit=dev` reports no runtime vulnerabilities. The full audit reports 14 moderate findings in development tooling, originating from glob and minimatch and propagated to ESLint/Storybook. npm proposes incompatible downgrades; no forced major override is applied. These findings remain a tooling limitation to revisit when upstream dependencies update.

The demo's bundled JavaScript is about 311 kB gzip with the current UI libraries. Vite reports its uncompressed chunk-size warning. Storybook also reports Ant Design's `use client` directive warnings while producing its browser-only preview; the build succeeds. Neither build is an assertion of React Server Component support.

## Git automation tools

Feature 13 explicitly requests Husky, lint-staged, and commitlint. Installed versions are Husky 9.1.7, lint-staged 16.4.0, and `@commitlint/cli`/`@commitlint/config-conventional` 21.2.4, all MIT. Their installed authoritative license files were inspected, alongside the [Husky license](https://github.com/typicode/husky/blob/main/LICENSE), [lint-staged license](https://github.com/lint-staged/lint-staged/blob/main/LICENSE), and [commitlint license](https://github.com/conventional-changelog/commitlint/blob/master/license.md). These are development tools and are not bundled into the framework runtime.

lint-staged 17 requires Node 22.22.1; 16.4.0 supports Node 20.17+ and preserves this package's advertised Node 22.13 minimum. The added tool dependencies include 75 MIT, ten ISC, one BSD-3-Clause (`fast-uri`), and one Python-2.0 (`argparse`) package. Their original notices remain in installed packages; the Python-derived license includes retention and change-summary conditions when redistributing modified derivatives. The framework does not modify or bundle these tool sources. Installed authoritative license texts were inspected for the non-MIT additions as well.

After installation on 2026-11-03, the runtime audit still reports zero findings. The full audit retains the previously documented 14 moderate development-tooling findings. The lockfile records exact resolutions. Hook setup follows [Husky](https://typicode.github.io/husky/get-started.html) and [commitlint](https://commitlint.js.org/guides/local-setup.html); GitHub workflow action versions follow the official [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) repositories.
