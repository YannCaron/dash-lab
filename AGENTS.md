# Engineering Charter — AGENTS.md

## Mission

Build software that is **correct, simple, elegant, and easy for a human to take over**.
Optimize for human comprehension and long-term ownership, not for the amount of code generated or the speed of the first implementation.

**Decision rule:** every new line, abstraction, dependency, layer, and document must earn its place.

## 1. Autonomy and approval

Work independently on routine implementation, local refactoring, documentation, and safe build/test/lint commands within the project workspace. Do not interrupt for ordinary choices that respect this charter.

**Ask the project owner before:**
- Adding any external dependency, including development or test dependencies.
- Introducing a framework or changing the project's technology stack. Do not select a new framework by default.
- Making a breaking change to a public API, a core contract, or a significant architectural decision.
- Performing destructive operations, publishing or deploying, accessing secrets, or sending project data to an external service.

For decisions requiring approval, explain the need, realistic alternatives, trade-offs, and your recommendation. Never interpret silence as approval. This file does not override the execution environment's permission and security controls.

## 2. Prefer less code

- First understand the existing code and reuse what already solves the problem.
- Do not implement speculative features, generic infrastructure, or abstractions for hypothetical future requirements (**YAGNI**).
- Prefer the simplest solution that preserves correctness and foreseeable evolution; avoid cleverness and boilerplate.
- Remove unnecessary complexity when it is safely in scope, but avoid unrelated refactoring.
- A small, explicit implementation often beats an elaborate architecture.

## 3. Write code humans can read

- **Keep code visually airy**, Spacing out code blocks vertically (separating variable declarations, processing, and return statements with blank lines) would make it even easier for humans to review the code.
- Avoid excessive line wrapping. Keep method signatures, expressions, and short statements on a single line whenever reasonably readable, as the output will be viewed on a wide screen.
- Give classes, functions, parameters, and variables **precise, intention-revealing names**.
- Prefer short, cohesive functions and classes with one clear reason to change; do not impose arbitrary line limits.
- Separate meaningful logical steps, loops, and conditionals with blank lines. Keep code visually airy and consistently formatted.
- Prefer expressive code over comments. Comments should be rare, concise, **in English**, and explain *why* a non-obvious constraint exists—not narrate *what* the code does.
- Put substantial explanations in Markdown documentation, not large in-code comment blocks.
- Favor well-defined object-oriented abstractions when appropriate to the domain, without wrapping trivial behavior in needless classes.
- Follow the repository's established naming and formatting conventions unless explicitly asked to change them.
- Add line space between logic blocks of codes, separate blocks as **variable declarations**, different **logic parts of code** and **results** with line space.
- Limite usage of comments as minimum
- Write the comments in English

## 4. Compose components; keep architecture light

- Organize packages/modules around **cohesive capabilities or components** with clear responsibilities and minimal public surfaces.
- Use a small number of meaningful architectural layers when the application needs them (for example, domain, data/model, and presentation).
- Keep dependencies directional and acyclic: higher-level consumers may use lower-level services; lower-level components must not know their concrete higher-level consumers.
- Communicate upward through returned values, events, callbacks, or contracts defined at the appropriate boundary—not hidden reverse dependencies.
- Keep the domain engine independent of UI and infrastructure details; replacing the UI must not require rewriting the engine.
- Apply **SOLID**, composition, substitutable contracts, and design patterns (Composite, Strategy, Interpreter, Template Method, etc.) **when they genuinely improve clarity or extension**.
- Do not introduce interfaces, factories, adapters, or extra layers solely to satisfy a pattern. A package need not be a separately deployable module.
- MVC and similar UI patterns are tools for separating responsibilities, not mandatory templates for every feature.

## 5. Own external dependencies

**Default: use the language/platform and existing project libraries.** Keep the dependency graph small. Prefer focused, lightweight libraries to broad frameworks; do not add a new framework without explicit approval.

Before *proposing* a new library, provide a concise assessment of:
1. What problem it solves and why existing/native code is insufficient.
2. Alternatives and architectural impact, including transitive dependencies.
3. Maintenance status, version stability, known security issues, and resource cost where relevant.
4. **Licensing:** inspect the authoritative license text and relevant transitive licenses; identify attribution, source-disclosure, redistribution, SaaS/network-use, and commercial/on-premise implications as applicable. Flag uncertainty rather than asserting legal certainty.

**Do not install or add the dependency until the owner approves it.**

Updates of **existing** dependencies are encouraged when justified. Preserve reproducible versions/lockfiles, review release notes and breaking changes, run relevant unit **and integration** tests, and add regression tests where needed. Never assume mocked tests prove real-library compatibility. Escalate changes that break public contracts or require major redesign.

## 6. Test behavior and invariants

- Prefer a TDD-style loop where practical: define expected behavior, implement, then refactor.
- For a bug, first add a failing regression test that reproduces it whenever feasible.
- Test public contracts, invariants, boundary values, error paths, equivalence cases, and important component interactions.
- Include integration tests at boundaries with real libraries or services when mocks would conceal compatibility failures.
- Keep tests deterministic, readable, independent, and proportionate to risk. Do not write tests only to inflate coverage numbers.
- Run the relevant tests after each meaningful change; run a wider suite for dependency updates, migrations, and structural refactors.
- Never weaken assertions, delete meaningful tests, or conceal failures simply to make a suite pass.

## 7. Document for human handover

Maintain just enough **Markdown** documentation that a new developer can locate the main components, understand their interactions, and safely make a change.

- Keep a short README with setup, build/test commands, and pointers to architecture documentation.
- Describe major components, dependency direction, key workflows, public contracts, invariants, and known constraints.
- Record consequential architectural decisions as brief **ADRs**: context, options, chosen approach, and *why*.
- Use **Mermaid diagrams** when a diagram explains structure or flow better than prose.
- Update affected documentation alongside code. Avoid redundant or automatically generated essays that become stale.

## 8. UI/UX for web applications

When building an interface, treat usability as a first-class acceptance criterion:

- Make domain concepts easy to discover, understand, and manipulate; do not leak internal engine complexity into the UI.
- Maintain consistent visual hierarchy, spacing, navigation, terminology, and interaction patterns.
- Provide clear feedback and deliberate empty, loading, success, and error states.
- Support keyboard use, semantic HTML, accessible labels, sensible contrast.
- Keep interactions responsive; measure before adding rendering complexity or optimizations.
- Respect the existing design language and component conventions; do not introduce a UI framework or component library without approval.

## 9. Finish with a self-review and concise handover

Before marking work complete, check:

- **Necessity:** could any code, dependency, abstraction, or layer be removed?
- **Clarity:** can another developer understand names, control flow, and component boundaries?
- **Architecture:** are responsibilities cohesive, dependencies directional, and contracts preserved?
- **Safety:** are licenses/approvals respected and errors handled rather than hidden?
- **Evidence:** are appropriate tests passing and architecture docs current?

End with a short report: **what changed; noteworthy decisions; tests run and results; documentation updated; remaining risks or approvals needed.** State clearly what was *not* verified. Do not claim tests or checks were run if they were not.

## 10. Commit your modifications

When developpment is finished, commit it in the local repository.

- DO NOT push it automatically to the repository. A human check is necessary and a manual intervension is needed.
- Create per feature commits if necessary
- Commit with idiomatic and concise message
- Every commit must be atomic and must be able to compile and perform tests without any error

## 11. Project handover map

Public library exports live in `src/index.ts`; implementation is organized by capability under `src/`. The consuming application is under `demo/src/`, with plugins discovered only from its local `plugins/*/index.ts` entry points. Keep plugin activation synchronous, registrations transactional, and mounted panel identities stable. Read `docs/api.md` and `docs/architecture.md` before changing public contracts.

Use Node.js 24 LTS. Run the relevant strict type, Vitest, lint/format, build, browser, and packed-consumer checks described in `CONTRIBUTING.md`. Update public JSDoc, English/French labels, affected Markdown, Storybook examples, and `CHANGELOG.md` with each feature. Generated `dist/`, demo builds, profiles, and test artifacts are ignored and must not be edited as sources.

## 12. Maintain release notes automatically

For every implemented feature, fix, public-contract change, or release, update `release-node.md` as part of the same work and commit. Do this without waiting for a separate documentation request. Record concrete resulting behavior, compatibility implications, verification, and remaining limits; keep the shorter `CHANGELOG.md` consistent. Move entries to an actual version/date only when a release is made. Never claim a package was published, deployed, or remotely verified without evidence.

For application/plugin work, read `docs/application-guide.md` and `docs/api.md` first. Keep the README's ten-minute tutorial executable, including its file paths, discovery pattern, commands, and examples.

---

**North star:** an agent's best contribution is not code that merely works today, but a system its human owner can confidently understand, maintain, and evolve tomorrow.
