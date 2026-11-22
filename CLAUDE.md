# CLAUDE.md

Rules for AI coding agents working on **AI Driven Development Learning**, a public, interactive site for learning the reasoning behind real projects. The owner learns **reasoning, architecture and decision-making, not code**: explain the why, and keep the site accurate.

## How the site works

- **Records** (ADRs, devlogs, roadmaps, status) are imported unchanged by `npm run sync` from the public repos in `sources.config.json`. Never edit files under `src/content/docs/*/records/`; fix the source repo and re-sync.
- **Facts** (dependencies, CI jobs, history) are generated into `src/generated/sources.json`. Never edit by hand.
- **The teaching layer** is in `src/data/*.yaml` (schemas in `src/content.config.ts`) and `src/content/docs/` (pages, concepts).
- **The coverage check** (`npm run coverage`) fails if a dependency has no tool card, an ADR has no decision card, or a link points at nothing.

## Keeping it current (Definition of Done for every project)

When a tracked project adds or changes a tool, a decision (ADR) or a significant concept:
1. Merge the change in that project, then run `npm run sync` here.
2. Add or update the tool card, decision card (`chosen` = 0-based index), architecture node, concept page and journey entry.
3. `npm run check && npm run build` must pass.
4. Add a devlog entry in `docs/devlog/` for changes to this site itself; an ADR in `docs/decisions/` for significant decisions.

## Public content rules (ADR-0004)

Only public repositories. Never publish personal data, email addresses, local paths, secrets, or details of private tools beyond their own public records. The sync's privacy guard enforces part of this; review the rest.

## Workflow

GitHub Flow, as in the other projects: branch `<type>/<description>`, Conventional Commits with a `Changes:` section, a PR with green CI, merge commits. Never commit to `main` (the only exception was the initial scaffold). Exact dependency versions, each at least two weeks old.

## Commands

```bash
npm ci              # install exact versions
npm run sync        # import records and facts from the project repos
npm run dev         # http://localhost:4321/ai-driven-development-learning/
npm run check       # type check + coverage check
npm run build       # static site in dist/
```
