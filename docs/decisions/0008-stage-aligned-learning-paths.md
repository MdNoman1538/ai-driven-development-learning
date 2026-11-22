# ADR-0008: Learning aligned with each project's development stages

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The owner wants the learning to grow with the projects: "in stage 0 we needed some things and the app will teach me those … for every stage of development, the learning will develop itself." Learning everything up front is overwhelming; learning after the fact doesn't stick.

## Options considered

1. **A fixed curriculum**, independent of the projects. Complete, but disconnected from what is being built.
2. **Content tagged by stage, with a per-project learning path.** Just-in-time: learn what the current stage needs, and prepare for the next.

## Decision

Option 2:
- Every phase has an id, and every teaching item (decision, walkthrough, pattern use, trade-off, algorithm use, quality attribute, concept use) carries the `stage` it belongs to.
- Each project overview shows a **learning path**: done stages, the current stage (open), and the next stage with the concepts to **prepare**. Planned methods are marked *planned* and become "used" when their code arrives.
- The sync records each project's own status line. The coverage check fails if that line no longer matches the phase this site marks as active, which means the project has moved on and the site must follow. It also fails on unknown stage ids.
- Rule (CLAUDE.md): finishing a stage in a project includes updating its learning content here.

## Consequences

- The site's structure follows the roadmaps; a roadmap change is a content change here.
- **Revisit when** quizzes and katas arrive (L3). They will use the same stage tags.
