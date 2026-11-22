import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

/** One sidebar group per project: the same sections everywhere, so you always know where to look. */
function project(label, id, extra = []) {
  return {
    label,
    collapsed: false,
    items: [
      { label: 'Overview', slug: id },
      { label: 'Architecture', slug: `${id}/architecture` },
      ...extra,
      { label: 'Decisions: you choose', slug: `${id}/decisions` },
      { label: 'Tech stack', slug: `${id}/stack` },
      { label: 'Journey', slug: `${id}/journey` },
      {
        label: 'Original records',
        collapsed: true,
        items: [
          { label: 'All records', slug: `${id}/records` },
          { label: 'Decisions (ADRs)', collapsed: true, items: [{ autogenerate: { directory: `${id}/records/decisions` } }] },
          { label: 'Development log', collapsed: true, items: [{ autogenerate: { directory: `${id}/records/devlog` } }] },
        ],
      },
    ],
  };
}

export default defineConfig({
  site: 'https://mdnoman1538.github.io',
  base: '/ai-driven-development-learning',
  integrations: [
    starlight({
      title: 'AI Driven Development Learning',
      description: 'Learn AI-driven development through real projects: the reasoning, architecture and decisions behind them.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/MdNoman1538/ai-driven-development-learning' }],
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'How to learn here', slug: 'start/how-to-learn' },
            { label: 'What is AI-driven development?', slug: 'start/ai-driven-development' },
            { label: 'How this site stays current', slug: 'start/how-this-site-stays-current' },
          ],
        },
        project('Road Risk', 'road-risk', [{ label: 'A crash’s journey', slug: 'road-risk/data-journey' }]),
        project('projectViewer', 'project-viewer'),
        project('This learning app', 'learning-app'),
        {
          label: 'Across all projects',
          items: [
            { label: 'Concept library', slug: 'concepts' },
            { label: 'Whole tech stack', slug: 'stack' },
            { label: 'The full journey', slug: 'journey' },
            { label: 'Glossary', slug: 'glossary' },
          ],
        },
        { label: 'Concepts', collapsed: true, items: [{ autogenerate: { directory: 'concepts' } }] },
      ],
    }),
    react(),
  ],
});
