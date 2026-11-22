// Shared helpers for components.

/** A link inside the site that respects the GitHub Pages base path. */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}${clean && !clean.includes('#') && !clean.endsWith('/') ? '/' : ''}`;
}

export const PROJECT_NAMES: Record<string, string> = {
  'road-risk': 'Road Risk',
  'project-viewer': 'projectViewer',
  'learning-app': 'Learning app',
};

export const LAYER_NAMES: Record<string, string> = {
  language: 'Languages',
  data: 'Data',
  backend: 'Backend',
  frontend: 'Frontend',
  testing: 'Testing',
  quality: 'Code quality',
  workflow: 'Workflow',
  delivery: 'Delivery',
  ai: 'AI',
};
