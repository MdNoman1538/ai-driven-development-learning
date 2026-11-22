// Where each kind of teaching item lives on the site, so any reference can become a link.
import { href } from './site';

export function refLink(ref: string, projectOf: (kind: string, id: string) => string | undefined): { href: string; label: string } | null {
  const [kind, id] = ref.split(':');
  const project = projectOf(kind, id);
  switch (kind) {
    case 'concept': return { href: href(`concepts/${id}`), label: id };
    case 'pattern': return { href: href(`knowledge/patterns#${id}`), label: id };
    case 'algorithm': return { href: href(`knowledge/algorithms#${id}`), label: id };
    case 'style': return { href: href(`knowledge/styles#${id}`), label: id };
    case 'decision': return project ? { href: href(`${project}/decisions#${id}`), label: id } : null;
    case 'tradeoff': return project ? { href: href(`${project}/tradeoffs#${id}`), label: id } : null;
    case 'quality': return project ? { href: href(`${project}/quality#${id}`), label: id } : null;
    case 'walkthrough': return project ? { href: href(`${project}/walkthroughs#${id}`), label: id } : null;
    default: return null;
  }
}

/** GitHub link to a code reference "file::Name" (line from the code facts when known). */
export function githubLink(repo: string, file: string, line?: number): string {
  return `${repo}/blob/main/${file}${line ? `#L${line}` : ''}`;
}
