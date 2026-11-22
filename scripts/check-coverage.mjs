// Fails (exit 1) when the teaching layer is missing an explanation (ADR-0003):
//   - a dependency of any project that no tool card covers
//   - an ADR of any project without a decision card (and decision cards for ADRs that don't exist)
//   - journey links to decisions or concepts that don't exist; glossary links to missing concepts
//   - a decision card whose `chosen` index points outside its options
// Run with `npm run coverage` (CI runs it on every PR).

import { existsSync, readFileSync } from 'node:fs';
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

const projects = Object.keys(facts);
const deps = projects.reduce((n, p) => n + facts[p].dependencies.length, 0);
const adrs = projects.reduce((n, p) => n + facts[p].records.decisions.length, 0);
if (problems.length) {
  console.error(`Coverage check failed: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`Coverage OK: ${deps} dependencies, ${adrs} ADRs, ${journey.length} sessions and ${glossary.length} terms across ${projects.length} projects are all explained.`);
