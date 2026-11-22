// Scoped navigation: inside a project you see only that project; the shared material lives in
// "Combined knowledge". The full sidebar is defined once in astro.config.mjs; this middleware
// keeps only the current area's group, and limits previous/next links to that area.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { AREAS, areaOf } from './lib/areas';

type Entry = { type: 'link' | 'group'; label: string; href?: string; isCurrent?: boolean; entries?: Entry[] };

function flatten(entries: Entry[]): Entry[] {
  return entries.flatMap((e) => (e.type === 'group' ? flatten(e.entries ?? []) : [e]));
}

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const area = areaOf(route.id);
  if (!area) return;
  const group = (route.sidebar as Entry[]).find((e) => e.type === 'group' && e.label === AREAS[area].label);
  if (!group) return;

  const home: Entry = { type: 'link', label: 'All projects', href: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`, isCurrent: false };
  route.sidebar = [
    { ...home, badge: undefined, attrs: { class: 'lx-nav-home' } },
    ...(group.entries ?? []),
  ] as typeof route.sidebar;

  const pages = flatten(group.entries ?? []);
  const i = pages.findIndex((p) => p.isCurrent);
  route.pagination = {
    prev: i > 0 ? (pages[i - 1] as never) : undefined,
    next: i >= 0 && i < pages.length - 1 ? (pages[i + 1] as never) : undefined,
  };

  // Each area has its own accent colour, so you always know where you are.
  const { dark, light } = AREAS[area].accent;
  route.head.push({
    tag: 'style',
    attrs: {},
    content: `html:root:root, html:root[data-theme='dark']{--sl-color-accent:${dark};--lx-area:${dark}} html:root[data-theme='light']{--sl-color-accent:${light};--lx-area:${light}}`,
  });
});
