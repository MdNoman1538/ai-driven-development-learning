---
title: "ADR-0007: The crash database is a versioned GitHub Release asset, pinned
  by a lock file"
sidebar:
  order: 7
  label: 0007 · The crash database is a versioned GitHub Release asset, pinned by
    a lock file
record:
  project: road-risk
  kind: decisions
  source: https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0007-database-as-versioned-release-asset.md
  commit: 1df8e5a
---

:::note[Original record]
Imported unchanged from [`docs/decisions/0007-database-as-versioned-release-asset.md`](https://github.com/MdNoman1538/Finland-Road-Risk-Intelligence/blob/main/docs/decisions/0007-database-as-versioned-release-asset.md) at commit `1df8e5a`. It is the project's own record; the teaching pages explain it.
:::

- **Status:** Accepted
- **Date:** 2026-11-22
- **Phase:** 0

## Context

`data/processed/road_risk.duckdb` (38.8 MB) was committed to git (known issue #8). Git keeps every version of a file forever, so each re-ingest would add another ~38 MB to every clone. Data versions also had no names: you couldn't tell which data a deployment or a test result used.

Render builds from the repository. The raw CSVs (`data/raw/`) are git-ignored, so Render can't rebuild the database: it has to get the finished file from somewhere.

## Options considered

1. **Keep it in git.** Zero work. But the repo grows by the full file size on every data change, and there's still no data version name.
2. **Git LFS.** Git stores a pointer and the file lives in LFS storage. Transparent to `git clone`, but GitHub's free LFS quota is small (bandwidth-limited), and each Render build and CI run would spend it. It also needs `git lfs` installed on every machine and builder.
3. **GitHub Release asset + lock file.** Each data version is uploaded to a Release with its own tag. `data/road_risk.lock.json` pins its URL and SHA-256, and a small standard-library downloader fetches and verifies it at build time.
4. **Object storage** (S3, R2 and the like). The industry choice at larger scale, but it needs an account, credentials and a bill. Too much for one 38 MB file today.

## Decision

Option 3. The database is published as a Release asset (tag `data-YYYY-MM-DD`). `data/road_risk.lock.json` pins it, and `python -m src.core.dataset` fetches it, verifies it, and never overwrites a different local file without `--force`. Render's build and CI both run that command; CI caches the file under the lock file's hash.

## Reasoning

- **It's the same pattern as `uv.lock`**, applied to data. The code says exactly which bytes it expects, and the checksum proves it got them. A corrupted or tampered download fails loudly instead of being served.
- **Data versions get names.** A tag says which data a deployment used. That matters for the roadmap: model training (Phase 4) and over-the-air tile updates (Phase 8) both need versioned data artifacts.
- **No new accounts, tools or quotas.** Release assets on a public repository are free, up to 2 GB per file.
- **Safe for developers.** A re-ingested local DB is never silently replaced. `lock <tag>` pins it for publishing.

## Consequences

- **Easier:** clones stay small from now on; every data version is named and verifiable; CI and Render get the exact same file.
- **Harder:** publishing new data takes one extra step (`lock <tag>`, then `gh release create`, then commit the lock file). A build needs the network to reach GitHub, which Render and CI always have.
- **Not undone:** the 38 MB already in git history stays there. Removing it would mean rewriting the public history (force-push), which breaks every existing clone and fork. Not worth it for 38 MB.
- **Revisit when:** data versions grow past a few hundred MB, need access control, or need to be served to cars (Phase 8). Then move to object storage behind the same lock-file interface.
