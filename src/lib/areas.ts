// The site's areas: one per project, plus the shared "Combined knowledge".
export type AreaId = 'road-risk' | 'project-viewer' | 'learning-app' | 'knowledge';

export const AREAS: Record<AreaId, { label: string; accent: { dark: string; light: string } }> = {
  'road-risk': { label: 'Road Risk', accent: { dark: '#f59e0b', light: '#b45309' } },
  'project-viewer': { label: 'projectViewer', accent: { dark: '#a78bfa', light: '#6d28d9' } },
  'learning-app': { label: 'This learning app', accent: { dark: '#2dd4bf', light: '#0f766e' } },
  knowledge: { label: 'Combined knowledge', accent: { dark: '#60a5fa', light: '#1d4ed8' } },
};

/** Pages under these top-level folders belong to Combined knowledge. */
const KNOWLEDGE = new Set(['knowledge', 'concepts', 'glossary', 'stack', 'journey', 'start']);

export function areaOf(id: string): AreaId | null {
  const top = id.split('/')[0];
  if (top in AREAS && top !== 'knowledge') return top as AreaId;
  return KNOWLEDGE.has(top) ? 'knowledge' : null;
}
