# Local plugin startup and language catalogs

Status: accepted, 2026-11-03.

## Context

The framework must remain reusable while application plugins live in local directories and are compiled by Vite. Workbench panels already use stable startup definitions and persist native layouts by identity. English/French interfaces and future languages must preserve those identities and component state.

## Decision

Use Vite's eager glob in the consuming application, a synchronous transactional registry in the library, and a sealed contribution snapshot on mount. Connect contributions to existing commands/notifications and render status/monitoring components inside existing providers. Runtime membership changes require a remount; production changes require a build.

Use a small isolated catalog store and React provider with English fallback, plain-text placeholders, and Ant Design locale integration. Displayed titles can change while command/panel IDs remain stable. Keep locale optional in version-1 configuration and validate registered-language availability before importing a workspace.

## Alternatives and consequences

Runtime filesystem scanning and remote script loaders add deployment/security/lifecycle concerns outside the requested scope. Dynamic panel mutation would require reconciling saved layouts and mounted state. A full external translation framework would add a dependency for a small catalog requirement. The selected design uses the approved stack, makes startup deterministic, and leaves application services/content outside the core. Plugins remain trusted code, and language catalogs stay plain text.
