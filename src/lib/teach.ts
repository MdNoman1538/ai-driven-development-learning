// Build-time helpers shared by the project pages.
import { getCollection } from 'astro:content';
import { href } from './site';

export const codeHref = (project: string, where: string) => href(`${project}/code#${encodeURIComponent(where)}`);

export async function stageNames(project: string): Promise<Record<string, string>> {
  const p = (await getCollection('projects')).find((e) => e.data.id === project)!.data;
  return Object.fromEntries(p.phases.map((ph) => [ph.id, ph.name]));
}

/** symbol id → the teaching pages that explain it ("Explained in" on the code reference). */
export async function taughtIndex(project: string) {
  const out: Record<string, { label: string; href: string }[]> = {};
  const add = (where: string, label: string, link: string) => (out[where] ??= []).push({ label, href: link });
  for (const { data: w } of await getCollection('walkthroughs')) {
    if (w.project !== project) continue;
    const steps = new Map<string, number[]>();
    w.steps.forEach((s, i) => steps.set(s.where, [...(steps.get(s.where) ?? []), i + 1]));
    for (const [where, nums] of steps) add(where, `Walkthrough: ${w.title} (step${nums.length > 1 ? 's' : ''} ${nums.join(', ')})`, href(`${project}/walkthroughs#${w.id}`));
  }
  for (const { data: p } of await getCollection('patterns'))
    for (const u of p.uses) if (u.project === project) add(u.where, `Pattern: ${p.name}`, href(`${project}/patterns#${p.id}`));
  for (const { data: a } of await getCollection('algorithms'))
    for (const u of a.uses) if (u.project === project) add(u.where, `Algorithm: ${a.name}${u.status === 'planned' ? ' (planned, will replace this)' : ''}`, href(`${project}/algorithms#${a.id}`));
  for (const { data: t } of await getCollection('tradeoffs'))
    if (t.project === project) for (const w of t.where) add(w, `Trade-off: ${t.question}`, href(`${project}/tradeoffs#${t.id}`));
  return out;
}

/** 1-based line where a snippet starts in a file (for exact GitHub links). */
export function lineOf(source: string, snippet: string): number | undefined {
  const first = snippet.trim().split('\n')[0].trim();
  const i = source.split('\n').findIndex((l) => l.includes(first));
  return i >= 0 ? i + 1 : undefined;
}
