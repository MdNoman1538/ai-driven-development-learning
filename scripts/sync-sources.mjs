// Imports the "records" (ADRs, devlogs, roadmap, status) and the facts (dependencies, CI jobs,
// history) of every project in sources.config.json. Run with `npm run sync`.
//
// Why: the site must never disagree with the projects it teaches. Records are copied, not
// retyped, and facts are read from the projects' own files (ADR-0002, ADR-0003).
// Output is deterministic (no timestamps), so a sync that changes nothing produces no diff.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from 'smol-toml';
import YAML from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'sources');
const DOCS = join(ROOT, 'src', 'content', 'docs');
const FACTS = join(ROOT, 'src', 'generated', 'sources.json');

// The site is public. Nothing private may pass through it (ADR-0004).
const FORBIDDEN = [
  [/\/Users\/[^/\s)`'"]+/g, 'a local home-directory path'],
  [/(?<![\w.`])[\w.%+-]+@(?!anthropic\.com\b)[\w-]+(\.[\w-]+)*\.[a-z]{2,}\b/gi, 'an email address'],
];

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function checkout(source) {
  if (source.self) return ROOT;
  const dir = join(CACHE, source.id);
  if (existsSync(join(dir, '.git'))) {
    git(dir, 'fetch', '--quiet', 'origin', 'main');
    git(dir, 'reset', '--quiet', '--hard', 'origin/main');
  } else {
    mkdirSync(CACHE, { recursive: true });
    // Full history (for commit counts) but file contents only on demand: small and fast.
    execFileSync('git', ['clone', '--quiet', '--filter=blob:none', `${source.repo}.git`, dir]);
  }
  return dir;
}

function guard(text, where) {
  for (const [pattern, what] of FORBIDDEN) {
    const hit = text.match(pattern);
    if (hit) throw new Error(`${where} contains ${what} (${hit[0]}). Fix it in the source repo first.`);
  }
  return text;
}

function rewriteLinks(body, source, repoDir, fileRel) {
  // Relative links point into the source repo; on this site they must point at GitHub.
  return body.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
    if (/^(https?:|mailto:|#)/.test(target)) return match;
    const [path, hash = ''] = target.split('#');
    const resolved = posix.normalize(posix.join(posix.dirname(fileRel), path));
    const abs = join(repoDir, resolved);
    const kind = existsSync(abs) && statSync(abs).isDirectory() ? 'tree' : 'blob';
    return `](${source.repo}/${kind}/main/${resolved}${hash ? `#${hash}` : ''})`;
  });
}

function recordFiles(repoDir, entry) {
  const abs = join(repoDir, entry);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [entry];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.md') && !['template.md', 'README.md'].includes(f))
    .sort()
    .map((f) => posix.join(entry, f));
}

function importRecord(source, repoDir, fileRel, commit) {
  const raw = guard(readFileSync(join(repoDir, fileRel), 'utf8'), `${source.id}:${fileRel}`);
  const name = basename(fileRel, '.md');
  const kind = fileRel.includes('/decisions/') ? 'decisions' : fileRel.includes('/devlog/') ? 'devlog' : 'overview';
  const heading = raw.match(/^# (.+)$/m)?.[1]?.trim() ?? name;
  const body = rewriteLinks(raw.replace(/^# .+\n/m, ''), source, repoDir, fileRel);

  const meta = { kind, slug: `${source.id}/records/${kind === 'overview' ? name : `${kind}/${name}`}` };
  let order = 1;
  if (kind === 'decisions') {
    meta.number = Number(name.slice(0, 4));
    meta.status = raw.match(/^- \*\*Status:\*\*\s*(.+)$/m)?.[1]?.trim() ?? 'Unknown';
    meta.date = raw.match(/^- \*\*Date:\*\*\s*(\S+)/m)?.[1] ?? null;
    order = meta.number;
  } else if (kind === 'devlog') {
    meta.date = name.slice(0, 10);
    order = Number(meta.date.replaceAll('-', ''));
  } else {
    order = ['roadmap', 'project-status', 'architecture'].indexOf(name) + 1;
  }
  meta.title = heading;

  const sourceUrl = `${source.repo}/blob/main/${fileRel}`;
  const frontmatter = {
    title: heading,
    sidebar: { order, label: kind === 'decisions' ? heading.replace(/^ADR-(\d+):\s*/, '$1 · ') : heading },
    record: { project: source.id, kind, source: sourceUrl, commit },
  };
  const note = `:::note[Original record]\nImported unchanged from [\`${fileRel}\`](${sourceUrl}) at commit \`${commit}\`. It is the project's own record; the teaching pages explain it.\n:::\n`;
  const out = join(DOCS, `${meta.slug}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `---\n${YAML.stringify(frontmatter)}---\n\n${note}\n${body.trim()}\n`);
  return meta;
}

const depName = (spec) => spec.split(/[<>=!~\s[;]/)[0].trim().toLowerCase();

function pythonDeps(repoDir, files) {
  const deps = [];
  let requires = null;
  for (const f of files) {
    const toml = parseToml(readFileSync(join(repoDir, f), 'utf8'));
    requires ??= toml.project?.['requires-python'] ?? null;
    for (const spec of toml.project?.dependencies ?? []) deps.push({ name: depName(spec), spec, group: 'runtime', file: f });
    for (const [group, specs] of Object.entries(toml['dependency-groups'] ?? {}))
      for (const spec of specs) if (typeof spec === 'string') deps.push({ name: depName(spec), spec, group, file: f });
  }
  return { requires, deps };
}

function nodeDeps(repoDir, files) {
  const deps = [];
  for (const f of files) {
    const pkg = JSON.parse(readFileSync(join(repoDir, f), 'utf8'));
    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) deps.push({ name, version, group: 'runtime', file: f });
    for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) deps.push({ name, version, group: 'dev', file: f });
  }
  return deps;
}

function workflows(repoDir, files) {
  return files
    .filter((f) => existsSync(join(repoDir, f)))
    .map((f) => {
      const wf = YAML.parse(readFileSync(join(repoDir, f), 'utf8'));
      const jobs = Object.entries(wf.jobs ?? {}).map(([id, job]) => job.name ?? id);
      const actions = [...readFileSync(join(repoDir, f), 'utf8').matchAll(/uses:\s*([\w./-]+)@([\w.-]+)/g)].map((m) => `${m[1]}@${m[2]}`);
      return { file: f, name: wf.name ?? f, jobs, actions: [...new Set(actions)].sort() };
    });
}

function history(repoDir) {
  const subjects = git(repoDir, 'log', '--format=%s').split('\n').filter(Boolean);
  const dates = git(repoDir, 'log', '--format=%cs').split('\n').filter(Boolean);
  return {
    commits: subjects.length,
    mergedPullRequests: subjects.filter((s) => /^Merge pull request #\d+/.test(s)).length,
    firstCommit: dates.at(-1) ?? null,
    lastCommit: dates[0] ?? null,
  };
}

const config = JSON.parse(readFileSync(join(ROOT, 'sources.config.json'), 'utf8'));
const facts = {};
for (const source of config.sources) {
  const repoDir = checkout(source);
  const commit = git(repoDir, 'rev-parse', '--short', 'HEAD');
  rmSync(join(DOCS, source.id, 'records'), { recursive: true, force: true });
  const records = { decisions: [], devlog: [], overview: [] };
  for (const entry of source.records)
    for (const fileRel of recordFiles(repoDir, entry)) {
      const meta = importRecord(source, repoDir, fileRel, commit);
      records[meta.kind].push(meta);
    }
  const py = pythonDeps(repoDir, source.python);
  facts[source.id] = {
    repo: source.repo,
    commit,
    ...history(repoDir),
    python: py.requires,
    dependencies: [...py.deps.map((d) => ({ ...d, ecosystem: 'python' })), ...nodeDeps(repoDir, source.node).map((d) => ({ ...d, ecosystem: 'node' }))],
    workflows: workflows(repoDir, source.workflows),
    records,
  };
  const n = records.decisions.length + records.devlog.length + records.overview.length;
  console.log(`${source.id.padEnd(15)} ${commit}  ${n} records, ${facts[source.id].dependencies.length} dependencies, ${facts[source.id].commits} commits`);
}
mkdirSync(dirname(FACTS), { recursive: true });
writeFileSync(FACTS, JSON.stringify(facts, null, 2) + '\n');
console.log(`wrote ${FACTS.replace(ROOT + '/', '')}`);
