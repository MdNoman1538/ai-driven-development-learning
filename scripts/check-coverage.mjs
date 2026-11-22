// Fails (exit 1) when the teaching layer is missing an explanation (ADR-0003):
//   - a dependency of any project that no tool card covers
//   - an ADR of any project without a decision card (and decision cards for ADRs that don't exist)
//   - journey links to decisions or concepts that don't exist; glossary links to missing concepts
//   - a decision card whose `chosen` index points outside its options
// Run with `npm run coverage` (CI runs it on every PR).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => YAML.parse(readFileSync(join(ROOT, p), 'utf8'));
const facts = JSON.parse(readFileSync(join(ROOT, 'src/generated/sources.json'), 'utf8'));
const tools = read('src/data/tools.yaml');
const decisions = read('src/data/decisions.yaml');
const journey = read('src/data/journey.yaml');
const glossary = read('src/data/glossary.yaml');
const conceptExists = (slug) => existsSync(join(ROOT, 'src/content/docs/concepts', `${slug}.mdx`));

const problems = [];
const explained = new Set(tools.flatMap((t) => t.packages ?? []));

for (const [project, f] of Object.entries(facts)) {
  for (const dep of f.dependencies)
    if (!explained.has(dep.name)) problems.push(`${project}: dependency "${dep.name}" (${dep.file}) has no tool card. Add it to a card's packages in src/data/tools.yaml.`);

  const refs = new Set(decisions.filter((d) => d.project === project).map((d) => d.ref));
  for (const adr of f.records.decisions) {
    const ref = `ADR-${String(adr.number).padStart(4, '0')}`;
    if (!refs.has(ref)) problems.push(`${project}: ${ref} "${adr.title}" has no decision card in src/data/decisions.yaml.`);
  }
  const real = new Set(f.records.decisions.map((a) => `ADR-${String(a.number).padStart(4, '0')}`));
  for (const ref of refs) if (!real.has(ref)) problems.push(`${project}: decision card ${ref} has no matching ADR in the project.`);
}

for (const d of decisions)
  if (d.chosen >= d.options.length) problems.push(`decision ${d.id}: chosen=${d.chosen} but only ${d.options.length} options.`);

const decisionIds = new Set(decisions.map((d) => d.id));
for (const s of journey) {
  for (const id of s.decided ?? []) if (!decisionIds.has(id)) problems.push(`journey ${s.id}: unknown decision "${id}".`);
  for (const c of s.concepts ?? []) if (!conceptExists(c)) problems.push(`journey ${s.id}: unknown concept "${c}".`);
}
for (const g of glossary) if (g.concept && !conceptExists(g.concept)) problems.push(`glossary ${g.id}: unknown concept "${g.concept}".`);

// ---------------------------------------------------------------- code-level checks (L2)
const code = Object.fromEntries(
  Object.keys(facts).map((id) => [id, JSON.parse(readFileSync(join(ROOT, 'src/generated/code', `${id}.json`), 'utf8'))]),
);
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const fileSource = (project, path) => code[project]?.files.find((f) => f.path === path)?.source ?? (project === 'learning-app' && existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : null);
function refExists(project, ref) {
  if (ref.includes('::')) return code[project]?.symbols.some((s) => s.id === ref);
  return fileSource(project, ref) !== null;
}
const read2 = (p) => read(p);
const projectsData = read2('src/data/projects.yaml');
const phases = Object.fromEntries(projectsData.map((p) => [p.id, new Set(p.phases.map((ph) => ph.id))]));
const stageOk = (project, stage, what) => {
  if (!phases[project]?.has(stage)) problems.push(`${what}: stage "${stage}" is not a phase of ${project}.`);
};
const checkRef = (project, ref, what) => {
  if (!refExists(project, ref)) problems.push(`${what}: "${ref}" doesn't exist in ${project}'s code. Renamed or removed? Update the reference.`);
};

for (const d of decisions) stageOk(d.project, d.stage, `decision ${d.id}`);
for (const q of read2('src/data/quality.yaml')) stageOk(q.project, q.stage, `quality ${q.id}`);

const styles = read2('src/data/styles.yaml');
const styleIds = new Set(styles.map((s) => s.id));
for (const p of projectsData) {
  for (const st of p.styles ?? []) if (!styleIds.has(st)) problems.push(`project ${p.id}: unknown style "${st}".`);
  for (const ph of p.phases) for (const c of ph.prepare ?? []) if (!conceptExists(c)) problems.push(`project ${p.id} phase ${ph.id}: unknown concept "${c}" to prepare.`);
  if (p.status_match && facts[p.id]?.status && !facts[p.id].status.includes(p.status_match))
    problems.push(`project ${p.id}: its status file says "${facts[p.id].status.slice(0, 80)}…", which no longer contains "${p.status_match}". The project has moved on: update its phases here.`);
}

const patterns = read2('src/data/patterns.yaml');
for (const pt of patterns) for (const u of pt.uses) { stageOk(u.project, u.stage, `pattern ${pt.id}`); checkRef(u.project, u.where, `pattern ${pt.id}`); }
const algorithms = read2('src/data/algorithms.yaml');
for (const a of algorithms) for (const u of a.uses) { stageOk(u.project, u.stage, `algorithm ${a.id}`); checkRef(u.project, u.where, `algorithm ${a.id}`); }
const tradeoffs = read2('src/data/tradeoffs.yaml');
for (const t of tradeoffs) { stageOk(t.project, t.stage, `trade-off ${t.id}`); for (const w of t.where ?? []) checkRef(t.project, w, `trade-off ${t.id}`); }

// Walkthrough snippets must still be in the code, word for word (whitespace aside).
const walkthroughs = read2('src/data/walkthroughs.yaml');
let snippets = 0;
for (const w of walkthroughs) {
  stageOk(w.project, w.stage, `walkthrough ${w.id}`);
  w.steps.forEach((step, i) => {
    checkRef(w.project, step.where, `walkthrough ${w.id} step ${i + 1}`);
    const src = fileSource(w.project, step.where.split('::')[0]);
    snippets++;
    if (src !== null && !norm(src).includes(norm(step.code)))
      problems.push(`walkthrough ${w.id} step ${i + 1}: the code snippet is no longer in ${step.where.split('::')[0]}:\n      ${norm(step.code).slice(0, 100)}`);
  });
}

// API: every Road Risk endpoint documented; every documented projectViewer route really served.
const api = read2('src/data/api.yaml');
for (const e of api) checkRef(e.project, e.handler, `api ${e.id}`);
for (const ep of code['road-risk'].endpoints)
  if (!api.some((a) => a.project === 'road-risk' && a.method === ep.method && a.path === ep.path)) problems.push(`road-risk: endpoint ${ep.method} ${ep.path} has no entry in src/data/api.yaml.`);
for (const a of api.filter((x) => x.project === 'road-risk'))
  if (!code['road-risk'].endpoints.some((ep) => ep.method === a.method && ep.path === a.path)) problems.push(`api ${a.id}: ${a.method} ${a.path} is not an endpoint in the code.`);
const pvServer = norm(fileSource('project-viewer', 'src/projectviewer/server.py') ?? '');
for (const a of api.filter((x) => x.project === 'project-viewer'))
  if (!pvServer.includes(`${a.method} ${a.path}`)) problems.push(`api ${a.id}: "${a.method} ${a.path}" isn't in projectViewer's route list (server.py).`);

// Concept uses and competency evidence.
const conceptFiles = readdirSync(join(ROOT, 'src/content/docs/concepts')).filter((f) => f.endsWith('.mdx'));
for (const f of conceptFiles) {
  const fm = YAML.parse(readFileSync(join(ROOT, 'src/content/docs/concepts', f), 'utf8').split('---')[1]);
  for (const [project, u] of Object.entries(fm.concept?.uses ?? {})) stageOk(project, u.stage, `concept ${f}`);
}
const refSets = {
  concept: (id) => conceptExists(id),
  decision: (id) => decisionIds.has(id),
  pattern: (id) => patterns.some((p) => p.id === id),
  tradeoff: (id) => tradeoffs.some((t) => t.id === id),
  algorithm: (id) => algorithms.some((a) => a.id === id),
  quality: (id) => read2('src/data/quality.yaml').some((q) => q.id === id),
  walkthrough: (id) => walkthroughs.some((w) => w.id === id),
  style: (id) => styleIds.has(id),
};
for (const area of read2('src/data/competencies.yaml'))
  for (const t of area.topics)
    for (const ev of t.evidence ?? []) {
      const [kind, id] = ev.split(':');
      if (!refSets[kind]?.(id)) problems.push(`competency ${area.id} / ${t.name}: unknown evidence "${ev}".`);
    }

// The playground must use the engine's real constants.
const model = JSON.parse(readFileSync(join(ROOT, 'src/data/risk-model.json'), 'utf8'));
const engineSrc = norm(fileSource('road-risk', model.file) ?? '');
for (const frag of model.source) if (!engineSrc.includes(norm(frag))) problems.push(`risk playground: "${frag}" is no longer in ${model.file}. Update src/data/risk-model.json.`);

const projects = Object.keys(facts);
const deps = projects.reduce((n, p) => n + facts[p].dependencies.length, 0);
const adrs = projects.reduce((n, p) => n + facts[p].records.decisions.length, 0);
if (problems.length) {
  console.error(`Coverage check failed: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`Coverage OK across ${projects.length} projects: ${deps} dependencies, ${adrs} ADRs, ${api.length} API entries, ${walkthroughs.length} walkthroughs (${snippets} verified snippets), ${patterns.length} patterns, ${tradeoffs.length} trade-offs, ${algorithms.length} algorithms, ${journey.length} sessions, ${glossary.length} terms.`);
