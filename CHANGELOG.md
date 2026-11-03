# Changelog

## Unreleased

The package currently declares version `0.1.0`. No publication or release tag is created by the implementation workflow.

### Added

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

### Changed

- Package name and consumer imports now use `@cyann/dash-lab`, following the existing `@cyann/js-parsec` and `@cyann/js-commons` convention. JSON configuration identifiers and browser-storage keys remain compatible.
- Airier vertical spacing across library, demo, tests, Storybook examples, and scripts, separating declarations, processing steps, and results.

### Compatibility

- Version-1 configuration files without a language continue to import as English.
- Plugins are synchronous trusted startup code bundled with the consuming application; membership changes require a remount/rebuild.
- Desktop workstations are the supported interface target. Cross-browser coverage and tooling audit limits are recorded in [validation](docs/validation.md) and [dependencies](docs/dependencies.md).
