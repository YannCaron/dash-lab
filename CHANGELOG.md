# Changelog

## Unreleased

The package currently declares version `0.1.0`. No publication or release tag is created by the implementation workflow.

### Added

- Per-tab maximize/restore controls with full application space, Escape recovery, retained panels, and persistent maximization independent of the saved arrangement (#4).

- Visible tabs menu and tab close buttons that hide/reopen panels without losing mounted state, with visibility included in layout checkpoints and JSON (#3). All interface icons use Ant Design Icons.

- Compact mode toggle with smaller controls/tabs, optional-information hiding, persisted density, and the public `useCompactMode` hook (#2).

- Slower 500 ms light/dark color transitions; dialog and notification motion retain their 270 ms duration and reduced-motion support.

- Optional `Workbench.onWorkspaceInitialize` callback to configure initial panel dimensions/selection before capturing the Application preset and restoring a saved layout.

- Notification popups slide/fade out on dismissal, expiry, history removal, disabling popups or stack replacement, with immediate logical updates and reduced-motion support.

- Automatic custom-layout checkpoints and immediate header/footer persistence, with a Custom layout preset replacing the toolbar save/restore/reset buttons. Built-in presets preserve the custom arrangement; existing commands and storage keys remain compatible.

- Azure, High Contrast, Emerald and Umber themes, each in light/dark, selected in the hamburger menu and automatically persisted with preferences.

- Validated npm publication script with simulation, account verification for `cyann`, public scoped publication, and prerelease tags.
- Optional `PluginAPI.registerState` callbacks for centralized JSON export/import and layout checkpoints, including plugin rollback, legacy-file compatibility, and a stateful Hello World demo.
- Reusable React/TypeScript library and a separate Vite Hello World demo, with watch and one-shot startup commands.
- Dockview panels, chrome slots, Focus mode, and a combined View control.
- Light/dark CSS tokens, Ant Design integration, reduced-motion support, and blue/gray themes.
- Versioned explicit layout saves, restore/reset, and application/columns/rows presets.
- Bounded notification history, unread state, configurable popups, and larger readable controls.
- Command registry, scoped keyboard shortcuts, and a searchable command palette with recent selections.
- File menu, Settings, Preferences, and validated JSON configuration import/export.
- Modal entrance/backdrop animations, backdrop dismissal, and independent panel scrolling.
- Local-directory plugin SDK covering panels, commands, menus, status, and monitoring; the demo uses Vite discovery.
- English/French interfaces, language persistence, extensible catalogs, and translated command search.
- Vitest service/store/provider contracts, real-browser interactions, Storybook, and a packed-consumer compatibility check.
- API, architecture, contribution, dependency/license, and validation documentation under MIT.
- GitHub Actions quality/browser workflows, Husky, staged lint/format checks, Conventional Commits, and issue/PR templates.
- Ten-minute plugin tutorial, complete application/plugin guide, detailed [release notes](release-node.md), and agent instructions to maintain release records with future work.
- Demo panel counts derived from discovered plugin contributions, with application chrome and plugin status following the selected language.

### Fixed

- Firefox notification dialogs now animate before native closure, with the same fallback shared by Settings and Commands. Reopening cancels pending closure, Escape follows the animated path, and reduced motion stays immediate.

### Changed

- Modal dialogs and backdrops animate on closure as well as opening, preserving native focus handoff, rapid reopening, Preferences content, and reduced-motion choices.
- Successful npm publication creates an annotated local `version-<version>` Git tag on the validated release commit. Simulation and failed publication create no tag; conflicting tags block publication and existing tags on the same commit are retained.
- Package name and consumer imports now use `@cyann/dash-lab`, following the existing `@cyann/js-parsec` and `@cyann/js-commons` convention. JSON configuration identifiers and browser-storage keys remain compatible.
- Airier vertical spacing across library, demo, tests, Storybook examples, and scripts, separating declarations, processing steps, and results.

### Compatibility

- Version-1 configuration files without a language continue to import as English.
- Plugins are synchronous trusted startup code bundled with the consuming application; membership changes require a remount/rebuild.
- Desktop workstations are the supported interface target. Cross-browser coverage and tooling audit limits are recorded in [validation](docs/validation.md) and [dependencies](docs/dependencies.md).
