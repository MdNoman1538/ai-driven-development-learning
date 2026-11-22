import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import rehypeAcronyms from './src/lib/rehype-acronyms.mjs';

const page = (label, slug) => ({ label, slug });

/** Every project has the same sections, grouped the way an architect reads a system:
 *  understand it → look inside the code → see the decisions → learn from its history. */
function project(label, id, { dataJourney = false, api = true } = {}) {
  return {
    label,
    items: [
      {
        label: 'Understand the system',
        items: [
          page('Overview', id),
          page('Quality attributes', `${id}/quality`),
          page('Architecture (C4 levels)', `${id}/architecture`),
          ...(dataJourney ? [page('A crash’s journey', `${id}/data-journey`)] : []),
        ],
      },
      {
        label: 'Inside the code',
        items: [
          page('Walkthroughs', `${id}/walkthroughs`),
          page('Code reference', `${id}/code`),
          ...(api ? [page('API reference', `${id}/api`)] : []),
          page('Algorithms & data science', `${id}/algorithms`),
          page('Design patterns', `${id}/patterns`),
        ],
      },
      {
        label: 'Decisions',
        items: [
          page('Decisions: you choose', `${id}/decisions`),
          page('Trade-offs: why this, not that', `${id}/tradeoffs`),
          page('Tech stack', `${id}/stack`),
        ],
      },
      {
        label: 'Learn & history',
        items: [
          page('Concepts in this project', `${id}/concepts`),
          page('Journey', `${id}/journey`),
          {
            label: 'Original records',
            collapsed: true,
            items: [
              page('All records', `${id}/records`),
              { label: 'Architecture Decision Records', collapsed: true, items: [{ autogenerate: { directory: `${id}/records/decisions` } }] },
              { label: 'Development log', collapsed: true, items: [{ autogenerate: { directory: `${id}/records/devlog` } }] },
            ],
          },
        ],
      },
    ],
  };
}

export default defineConfig({
  site: 'https://mdnoman1538.github.io',
  base: '/ai-driven-development-learning',
  markdown: { rehypePlugins: [rehypeAcronyms] },
  integrations: [
    starlight({
      title: 'AI Driven Development Learning',
      description: 'Learn software architecture and AI-driven development through real projects: the reasoning, the code and the decisions behind them.',
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/MdNoman1538/ai-driven-development-learning' }],
      customCss: ['./src/styles/custom.css'],
      routeMiddleware: './src/routeData.ts',
      lastUpdated: true,
      sidebar: [
        project('Road Risk', 'road-risk', { dataJourney: true }),
        project('projectViewer', 'project-viewer'),
        project('This learning app', 'learning-app', { api: false }),
        {
          label: 'Combined knowledge',
          items: [
            page('Overview', 'knowledge'),
            {
              label: 'Start here',
              items: [
                page('How to learn here', 'start/how-to-learn'),
                page('What is AI-driven development?', 'start/ai-driven-development'),
                page('How this site stays current', 'start/how-this-site-stays-current'),
              ],
            },
            {
              label: 'Architecture knowledge',
              items: [
                page('Architect’s competency map', 'knowledge/competencies'),
                page('Architecture styles', 'knowledge/styles'),
                page('Design pattern catalogue', 'knowledge/patterns'),
                page('Trade-off library', 'knowledge/tradeoffs'),
                page('Algorithms & data science', 'knowledge/algorithms'),
              ],
            },
            {
              label: 'Concepts',
              items: [page('Concept library', 'concepts'), { label: 'All concepts', collapsed: true, items: [{ autogenerate: { directory: 'concepts' } }] }],
            },
            {
              label: 'Across all projects',
              items: [page('Whole tech stack', 'stack'), page('The full journey', 'journey'), page('Glossary', 'glossary')],
            },
          ],
        },
      ],
    }),
    react(),
  ],
});
