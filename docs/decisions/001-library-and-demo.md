# 001 — Separate the reusable workbench from its demo

The framework must support future applications while providing an immediately runnable Hello World example.

Keep one npm package with library source in `src/` and an application in `demo/`. Build them separately. The application imports the package's public API; only development resolves that API to source for hot reload. React stays a peer dependency, and Ant Design/Dockview/Zustand remain external in the ESM library. Ship CSS as an explicit stylesheet export.

A single application would make package reuse difficult to verify. A multi-package workspace would add release and development coordination before a second package is needed. The chosen structure keeps library consumption testable without that infrastructure.

Each workbench and theme provider owns its state. Shared global stores would couple multiple embedded applications; provider-scoped stores allow independent themes and visibility settings.
