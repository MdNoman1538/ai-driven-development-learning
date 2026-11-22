// Static JSON per project, written at build time: the code reference loads it only when opened,
// so pages stay light even though a project's full source is several hundred KB.
import type { APIRoute, GetStaticPaths } from 'astro';
import facts from '../../generated/sources.json';

export const getStaticPaths: GetStaticPaths = () => Object.keys(facts).map((project) => ({ params: { project } }));

export const GET: APIRoute = async ({ params }) => {
  const mod = await import(`../../generated/code/${params.project}.json`);
  const data = mod.default;
  const repo = (facts as Record<string, { repo: string; commit: string }>)[params.project as string];
  return new Response(JSON.stringify({ ...data, repo: repo.repo, commit: repo.commit }), { headers: { 'Content-Type': 'application/json' } });
};
