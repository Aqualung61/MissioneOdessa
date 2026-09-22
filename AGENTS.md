# AGENTS.md — MissioneOdessa

**Status:** Approved by Mauro Giorgi — 22 September 2026  
**Prepared against:** `Aqualung61/MissioneOdessa` · `main` · `0477ad17595e832ab1184d1235bd5d3a35f09cc3`

## Repository identity

- Purpose: public Node.js/Express text adventure with a static browser frontend, REST APIs, static JSON game data, and in-memory per-session game state.
- Authoritative remote: `https://github.com/Aqualung61/MissioneOdessa`
- Default branch: `main`
- Project Risk Tier: **Tier 2 — Managed** because the application is public, deployed, multi-session, and exposes stateful APIs.
- Current production URL documented by the repository: `https://www.missioneodessa.it`.
- Issue and milestone tracking: GitHub Issues and Milestones are the operational source of truth.

Before material work, verify the remote, current branch, HEAD SHA, working tree, and whether the local clone is aligned with the authoritative remote. The commit above is the preparation baseline, not a permanent pin.

## Instruction and evidence precedence

Apply, in order:

1. the current task and explicit authorization;
2. approved requirements, specifications, and accepted ADRs in the repository;
3. this file and any more specific nested `AGENTS.md`;
4. current code, tests, configuration, and CI evidence;
5. `README.md` and current operational documentation;
6. dated snapshots and historical documents.

If documentation conflicts with current code or tests, do not silently select one. Report the conflict and determine whether it is stale documentation, a regression, or an unresolved decision.

Known baseline caveat: `docs/20260108_architettura_applicativa_01.md` describes an earlier singleton game state. The current implementation includes per-session isolation in `src/middleware/sessionContext.js`, related engine routes, and multi-session tests. Use `docs/20260115_Multi_session_architecture_01.md` together with current code and tests for session-related work.

## Required reading

Always read before material work:

1. `README.md`;
2. the current GitHub issue or approved specification for the task;
3. `package.json` and `.github/workflows/ci.yml`;
4. the relevant code and tests.

Read conditionally:

- architecture or API/engine work: `docs/20260108_architettura_applicativa_01.md` and, for sessions, `docs/20260115_Multi_session_architecture_01.md`;
- roadmap or planning: current GitHub Issues/Milestones first, then `docs/ROADMAP.md` and `docs/20260113_nextsteps.md` as dated summaries;
- security, configuration, or public-release work: `.env.example`, the security sections of `README.md`, and `docs/20260118_issue_62_release_readiness_prepublic_checklist.md`;
- release work: `RELEASE_NOTES.md` and `docs/release-notes/Unreleased.md`.

Do not treat files under `docs/obsolete/` as current requirements.

## Repository map

- `src/server.js` — Express entry point, middleware, API and static frontend hosting.
- `src/api/` — REST routers and API contracts.
- `src/logic/` — parser, engine, messages, scoring, and turn effects.
- `src/middleware/` — authentication, validation, rate limiting, error handling, and session context.
- `src/data-internal/` — authoritative static JSON game and localization data loaded at startup.
- `web/` — static browser frontend.
- `tests/` — primary Vitest unit, integration, API-contract, and regression suite.
- `docs/` — current and historical technical documentation; check status and date before relying on it.
- `.github/workflows/ci.yml` — CI checks on supported Node versions.
- `RELEASE_NOTES.md` — release summary.

## Environment and commands

- Preferred local Node version: Node `20`, from `.nvmrc` / `.node-version`.
- CI compatibility: Node `18.20.x` and `20.x`.
- Install reproducibly: `npm ci`.
- Run development server: `npm run dev`.
- Run production entry point locally: `npm start`.
- Build: `npm run build`.
- Typecheck without emit: `npm run typecheck`.
- Full tests: `npm test`.
- Lint: `npm run lint`.
- Format check: `npm run format:check`.
- Navigation vocabulary check: `npm run check:nav`.
- API version smoke check, with the local server already running: `curl -s http://localhost:3001/api/version`.

Do not invent substitute commands when a documented command fails. Capture the failure, inspect the repository and environment, and report `FAIL` or `BLOCKED`.

## Project invariants

- Runtime game content is loaded from versioned JSON under `src/data-internal/`; no runtime database is part of the current architecture.
- Static datasets shared through `global.odessaData` must not be mutated by per-user operations.
- Game state must remain isolated per session/tab through `X-Session-Id` and `X-Game-Id`; reset, save, and load must not affect another session.
- `POST /api/engine/execute` is the target input pipeline. Legacy parser or state-changing endpoints must not be revived or expanded without an approved decision.
- Invalid user input must not expose stack traces, internal paths, or unhandled 500 responses.
- User-facing behavior and data must remain aligned in Italian and English when the affected feature is localized.
- Security behavior controlled by authentication, validation, rate limiting, error sanitization, CORS, proxy, payload-limit, and legacy-endpoint settings must not be weakened implicitly.
- Narrative content, original-game material, images, attribution, and licensing statements must not be changed outside explicit scope and authorization.

## Track and specification requirements

- **Fast Track:** issue/task, acceptance criteria, implementation, relevant tests, and diff review.
- **Standard Track:** approved Requirement and Technical Design, Codex Work Breakdown, issue/task, tests, review, and release evidence when released.
- **Architecture Track:** approved Requirements, HLD, ADR, Technical Design, Work Breakdown, issues, tests, review, and release evidence.

Use `docs/` for approved technical specifications until another repository path is explicitly adopted. Mark status and date clearly. Use GitHub Issues for executable work; do not duplicate an entire specification in an issue.

For Standard and Architecture work, stop after the Work Breakdown until Mauro gives the Execution Gate, unless the current task explicitly includes it.

## Implementation rules

- Keep the diff minimal and preserve unrelated working-tree changes.
- Follow existing ESM, Express, Vitest, ESLint, and Prettier conventions.
- Update or add targeted tests whenever behavior changes.
- For API changes, cover contract, validation, error handling, session isolation, and security implications as applicable.
- For changes to `src/data-internal/*.json`, preserve schema, identifiers, referential integrity, and IT/EN consistency; run relevant schema, i18n, navigation, and regression checks.
- Do not add or upgrade production dependencies without explicit rationale and approval.
- Do not use `npm run lint:fix`, `npm run format`, or another repository-wide rewrite unless explicitly authorized and reviewed for scope.
- Do not edit generated or ignored artifacts such as `node_modules/`, `dist/`, `deploy/`, `backup/`, or `test-results/`.
- Never commit `.env`, credentials, tokens, production secrets, or realistic secret-like examples.

## Verification expectations

Run the smallest relevant checks first. Before declaring an implementation complete, normally run the CI-equivalent baseline:

1. targeted Vitest tests for the changed behavior;
2. `npm run lint`;
3. `npm run build`;
4. `npm test`.

Also run `npm run typecheck`, `npm run format:check`, `npm run check:nav`, API smoke checks, cross-browser checks, or production validation when relevant to the change and authorized.

Report every expected check as `PASS`, `FAIL`, `NOT RUN`, or `BLOCKED`. Never infer success from unchanged code or from an earlier run.

## Git, pull requests, and release

- Work from a task branch, not directly on `main`.
- Preferred branch pattern from current project documentation: `issue-<number>/<sprint-or-short-slug>`.
- Use a pull request into `main` even though branch protection is not currently enabled.
- Use `Part of #<number>` for intermediate work and `Fixes #<number>` only when all issue acceptance criteria are satisfied.
- Follow the existing concise commit style and reference the issue when useful; no conventional-commit policy is currently enforced.
- Update release notes when behavior, configuration, operations, security, or user-visible functionality changes.
- Verify the actual deployment target and procedure at Release Gate; do not infer them solely from dated Railway notes.

Do not commit, push, open or update a pull request, merge, tag, release, migrate, or deploy without explicit authorization in the current task.

## Protected and high-impact operations

- Do not run `update-preprod.ps1` without an explicit Release Gate. It recursively clears the local `deploy/` directory before repopulating it and starts the application.
- Do not modify production configuration, DNS, hosting, environment variables, or live data without an explicit target, rollback plan, and Release Gate.
- Do not weaken tests or security controls merely to make checks pass.
- Do not silently resolve conflicts between code, tests, approved specifications, and runtime evidence.

## Definition of Done

- Acceptance criteria are satisfied and traceable to the issue/specification.
- Relevant targeted and regression checks have explicit results.
- The final diff has been reviewed for regressions, security, scope creep, and accidental changes.
- Documentation, configuration examples, and release notes are coherent with changed behavior.
- No secrets, unrelated modifications, or generated artifacts were introduced.
- Residual risks, skipped checks, and unperformed release operations are explicit.
- The next required Human Gate is stated.
