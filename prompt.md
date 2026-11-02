# dash-lab - Master Prompt

You are a senior software architect and lead engineer.

Create an open-source-ready framework named `dash-lab`.

## Vision
Build once. Create many.

The framework must provide a reusable workbench for future applications such as meteo-lab, geo-lab, grammar-lab, kids-lab and SkyMet.

## General Requirements
- NodeJS
- Vite
- React
- TypeScript (strict)
- Ant Design
- DockView
- Zustand
- React Router
- Storybook
- Vitest
- ESLint
- Prettier
- JSDoc on all public APIs
- English by default
- Internationalization support
- GitHub ready
- npm ready
- Open source ready
- MIT license
- Desktop workstation UI; mobile and tablet layouts are outside the scope of this version

---

# Feature 1 - Project Bootstrap
Create repository structure, tooling, linting, formatting and build pipeline.

Demo startup:
- Run the following commands from the `dash-lab` project root after `npm install`.
- `npm run dev` starts the Hello World demo in watch mode, using `--watch` for the build process, with automatic rebuilds and browser updates when source files change.
- `npm run start` builds the required assets once and serves the Hello World demo without watching source files.
- Both commands must work without a prior manual build and display the workbench with the Hello World plugin loaded.

Commit:
feat(core): bootstrap dash-lab foundation

---

# Feature 2 - Workbench Layout
Implement:
- Hideable Header
- Control Bar
- Monitoring Bar
- DockView Workspace
- Hideable Footer
- Focus Mode

Commit:
feat(layout): implement workbench shell

---

# Feature 3 - Theme Engine
Implement:
- Light Theme
- Dark Theme
- Animated transitions
- CSS Tokens
- AntD integration
- DockView integration

Commit:
feat(theme): implement theme engine

---

# Feature 4 - Layout Management
Implement:
- Save Layout
- Restore Layout
- Reset Layout
- Icon based layout selection
- Persistence

Commit:
feat(layout): add persistence and presets

---

# Feature 5 - Notifications
Implement notification center with history.

Commit:
feat(notification): add centralized notification center

---

# Feature 6 - Commands and Shortcuts
Implement command registry and keyboard shortcuts.

Commit:
feat(commands): add command and shortcut system

---

# Feature 7 - Command Palette
VSCode-like command palette.

Commit:
feat(commands): add command palette

---

# Feature 8 - Menus and Settings
Hamburger menu.
File > Settings
File > Preferences
Import/Export configuration.

Commit:
feat(menu): add settings and preferences

---

# Feature 9 - Plugin SDK
Implement a minimal plugin architecture using directories local to the consuming application.

Plugin loading:
- Store each plugin in its own directory under `src/plugins/` in the application.
- Use `index.ts` as the standard entry point for each plugin.
- Discover plugin entry points through Vite during development and build, then register the plugins at application startup.
- Bundle plugins with the application. Adding or removing a plugin in production requires rebuilding the application.
- Keep the SDK focused on the contribution interfaces below.

Interfaces:
- registerPlugin
- registerPanel
- registerCommand
- registerMenu
- registerStatusItem
- registerMonitoringItem

Commit:
feat(plugin): introduce plugin sdk

---

# Feature 10 - Internationalization
English default.
French support.
Extensible language system.

Commit:
feat(i18n): add multilingual support

---

# Feature 11 - Quality
Vitest tests for services, hooks and stores.

Commit:
test(core): add non regression coverage

---

# Feature 12 - Documentation
Generate:
- README.md
- AGENTS.md
- CONTRIBUTING.md
- CHANGELOG.md
- LICENSE containing the MIT license text
- Storybook
- API docs

Document dependency installation and both Hello World demo startup commands in the README.

Commit:
docs: complete framework documentation

---

# Feature 13 - GitHub Readiness
Add:
- GitHub Actions
- Husky
- lint-staged
- commitlint
- Issue templates
- PR template
- optimized .gitignore including .history

Commit:
chore(github): add automation and workflows

---

# Final Deliverables
Provide a production-ready framework named dash-lab under the MIT license, with examples and a sample Hello World plugin loaded through the same local-directory discovery mechanism.
