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
    styles: z.array(z.string()).default([]), // architecture style ids (styles.yaml)
    status_match: z.string().optional(), // text the project's own status line must contain while this is the active phase
    phases: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        state: z.enum(['done', 'active', 'next', 'later']),
        summary: z.string(),
        prepare: z.array(z.string()).default([]), // concept slugs to learn before (or while) building this phase
      }),
    ),
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
    stage: z.string(),
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
    level: z.enum(['context', 'container', 'component', 'target']),
    order: z.number(),
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


// "file::Qualified.name" or a file path; checked against the generated code facts.
const codeRef = z.string();
const use = z.object({ project: projectId, where: codeRef, what: z.string(), why: z.string(), stage: z.string(), status: z.enum(['used', 'planned']).default('used') });

const quality = defineCollection({
  loader: file('src/data/quality.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    attribute: z.string(),
    why_it_matters: z.string(),
    scenario: z.object({ stimulus: z.string(), environment: z.string(), response: z.string(), measure: z.string() }),
    status: z.enum(['met', 'partly', 'planned']),
    evidence: z.string(),
    tactics: z.array(z.string()).min(1),
    stage: z.string(),
  }),
});

const styles = defineCollection({
  loader: file('src/data/styles.yaml'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    what: z.string(),
    when: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    uses: z.array(z.object({ project: projectId, where: z.string(), how: z.string() })),
  }),
});

const patterns = defineCollection({
  loader: file('src/data/patterns.yaml'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    aka: z.string().optional(),
    category: z.enum(['creational', 'structural', 'behavioural', 'concurrency', 'data', 'reliability', 'integration', 'security', 'ui', 'testing', 'architecture']),
    problem: z.string(),
    solution: z.string(),
    uses: z.array(use).min(1),
    tradeoff: z.string(),
    when_not: z.string(),
  }),
});

const tradeoffs = defineCollection({
  loader: file('src/data/tradeoffs.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    stage: z.string(),
    question: z.string(),
    chose: z.string(),
    over: z.array(z.object({ option: z.string(), why_not: z.string() })).min(1),
    because: z.array(z.string()).min(1),
    cost: z.string(),
    where: z.array(codeRef).default([]),
    evidence: z.string().optional(),
  }),
});

const algorithms = defineCollection({
  loader: file('src/data/algorithms.yaml'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['data structure', 'search', 'geometry', 'hashing', 'statistics', 'machine learning', 'graph', 'layout', 'text', 'signal processing', 'parsing']),
    problem: z.string(),
    intuition: z.string(),
    formula: z.string().optional(),
    symbols: z.array(z.object({ symbol: z.string(), meaning: z.string() })).default([]),
    complexity: z.string(),
    tradeoffs: z.string(),
    alternatives: z.array(z.object({ name: z.string(), why_not: z.string() })).default([]),
    uses: z.array(use).min(1),
    playground: z.string().optional(),
  }),
});

const walkthroughs = defineCollection({
  loader: file('src/data/walkthroughs.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    order: z.number(),
    stage: z.string(),
    title: z.string(),
    question: z.string(),
    summary: z.string(),
    steps: z
      .array(
        z.object({
          title: z.string(),
          where: codeRef,
          code: z.string(), // must appear verbatim (whitespace-normalised) in the file: checked by the coverage step
          explain: z.string(),
          params: z.array(z.object({ name: z.string(), value: z.string(), why: z.string() })).default([]),
          choice: z.string().optional(), // "why this, not that" in one or two sentences
        }),
      )
      .min(2),
  }),
});

const api = defineCollection({
  loader: file('src/data/api.yaml'),
  schema: z.object({
    id: z.string(),
    project: projectId,
    method: z.string(),
    path: z.string(),
    handler: codeRef,
    purpose: z.string(),
    params: z.array(z.object({ name: z.string(), in: z.enum(['query', 'body', 'path', 'header']), type: z.string(), rule: z.string(), why: z.string() })).default([]),
    responses: z.array(z.object({ status: z.string(), when: z.string() })).min(1),
    notes: z.string().optional(),
  }),
});

const competencies = defineCollection({
  loader: file('src/data/competencies.yaml'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    name: z.string(),
    why: z.string(),
    topics: z.array(
      z.object({
        name: z.string(),
        what: z.string(),
        status: z.enum(['strong', 'partial', 'gap']),
        evidence: z.array(z.string()).default([]), // refs: concept:slug, decision:id, pattern:id, tradeoff:id, algorithm:id, quality:id, walkthrough:id, style:id
        gap: z.string().optional(),
      }),
    ),
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
          .object({
            summary: z.string(),
            projects: z.array(projectId).min(1),
            level: z.enum(['foundation', 'core', 'advanced']),
            // How each project uses this idea, and at which stage: shown inside that project only.
            uses: z.record(projectId, z.object({ how: z.string(), stage: z.string() })).default({}),
          })
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
  quality,
  styles,
  patterns,
  tradeoffs,
  algorithms,
  walkthroughs,
  api,
  competencies,
};
