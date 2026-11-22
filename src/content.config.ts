// The content model (ADR-0002). Every teaching entry has a fixed shape, checked at build
// time: a concept without a "why" or a decision without options fails the build, the same
// way a type error fails a program.
import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

const projectId = z.enum(['road-risk', 'project-viewer', 'learning-app']);

const projects = defineCollection({
  loader: file('src/data/projects.yaml'),
  schema: z.object({
    id: projectId,
    order: z.number(),
    name: z.string(),
    tagline: z.string(),
    kind: z.string(),
    status: z.string(),
    problem: z.string(),
    goal: z.string(),
    learn: z.array(z.string()).min(1),
    phases: z.array(z.object({ name: z.string(), state: z.enum(['done', 'active', 'next', 'later']), summary: z.string() })),
  }),
});

const tools = defineCollection({
  loader: file('src/data/tools.yaml'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    layer: z.enum(['language', 'data', 'backend', 'frontend', 'testing', 'quality', 'workflow', 'delivery', 'ai']),
    what: z.string(),
    why: z.string(),
    analogy: z.string().optional(),
    alternatives: z.array(z.object({ name: z.string(), why_not: z.string() })),
    packages: z.array(z.string()).default([]), // package names matched by the coverage check
    used_in: z.array(z.object({ project: projectId, where: z.string(), how: z.string() })).min(1),
  }),
});

const decisions = defineCollection({
  loader: file('src/data/decisions.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    ref: z.string().regex(/^ADR-\d{4}$/),
    title: z.string(),
    date: z.string(),
    status: z.string(),
    question: z.string(),
    context: z.string(),
    options: z.array(z.object({ name: z.string(), summary: z.string(), pros: z.array(z.string()), cons: z.array(z.string()) })).min(2),
    chosen: z.number().int().min(0),
    why: z.array(z.string()).min(1),
    consequences: z.array(z.string()).min(1),
    revisit: z.string(),
    lesson: z.string(),
  }),
});

const node = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  col: z.number(),
  row: z.number(),
  what: z.string(),
  why: z.string(),
  where: z.string(),
});
const architecture = defineCollection({
  loader: file('src/data/architecture.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    label: z.string(),
    description: z.string(),
    groups: z.array(z.object({ id: z.string(), label: z.string() })),
    nodes: z.array(node).min(2),
    edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional(), style: z.enum(['solid', 'dashed']).default('solid') })),
  }),
});

const journey = defineCollection({
  loader: file('src/data/journey.yaml'),
  schema: z.object({
    id: z.string(),
    date: z.string(),
    projects: z.array(projectId).min(1),
    title: z.string(),
    summary: z.string(),
    did: z.array(z.string()),
    decided: z.array(z.string()).default([]), // decision ids
    concepts: z.array(z.string()).default([]), // concept page slugs
    lesson: z.string(),
  }),
});

const glossary = defineCollection({
  loader: file('src/data/glossary.yaml'),
  schema: z.object({ id: z.string(), term: z.string(), definition: z.string(), concept: z.string().optional() }),
});

const steps = defineCollection({
  loader: file('src/data/data-journey.yaml'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    stage: z.string(),
    happens: z.string(),
    why: z.string(),
    where: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
  }),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Set by scripts/sync-sources.mjs on imported records.
        record: z.object({ project: z.string(), kind: z.string(), source: z.string().url(), commit: z.string() }).optional(),
        // Set on concept pages: shown in the concept library.
        concept: z
          .object({ summary: z.string(), projects: z.array(projectId).min(1), level: z.enum(['foundation', 'core', 'advanced']) })
          .optional(),
      }),
    }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  projects,
  tools,
  decisions,
  architecture,
  journey,
  glossary,
  steps,
};
