# Plugin state uses existing configuration checkpoints

## Decision

Plugins may register one synchronous `exportState`/`importState` pair during activation. The registry assigns its owning plugin ID. Plugin data joins automatic custom-layout checkpoints, explicit layout saves, restoration on startup, and JSON configuration import/export. Application stores remain plugin-owned; the framework does not serialize React components.

## Compatibility and failure handling

Version-1 files gain an optional `plugins` field. Absent entries leave live state unchanged. Unknown participants are ignored; plugin-specific schema versions remain inside their own data. Existing 1 MB limits include plugin data. Reset and layout presets preserve live plugin state.

Snapshots contain copied JSON data. Before applying plugin data and a layout, the framework captures participating stores for rollback. Failed imports restore attempted handlers in reverse order and report incomplete rollback. Callbacks must be synchronous and able to re-import their own snapshots; external side effects are outside this contract. This keeps the existing startup and mounted-panel lifecycles intact without a second persistence system.
