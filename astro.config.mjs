import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://mdnoman1538.github.io',
  base: '/ai-driven-development-learning',
  integrations: [starlight({ title: 'AI Driven Development Learning' }), react()],
});
