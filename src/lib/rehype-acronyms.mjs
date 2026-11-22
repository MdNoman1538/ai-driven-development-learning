// Build-time plugin for every Markdown/MDX page, including imported records:
// wraps acronyms in <abbr title="full form"> and spells out the first use on each page.
import { splitAcronyms } from './acronyms.mjs';

const SKIP = new Set(['code', 'pre', 'kbd', 'samp', 'abbr', 'script', 'style', 'svg', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export default function rehypeAcronyms() {
  return (tree) => {
    const seen = new Set();
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === 'text') {
          for (const p of splitAcronyms(child.value, seen)) {
            if (typeof p === 'string') out.push({ type: 'text', value: p });
            else {
              out.push({ type: 'element', tagName: 'abbr', properties: { title: p.full }, children: [{ type: 'text', value: p.short }] });
              if (p.expand) out.push({ type: 'text', value: ` (${p.full})` });
            }
          }
        } else {
          // Skip code, headings and embedded components (they handle acronyms themselves).
          if (!(child.type === 'element' && SKIP.has(child.tagName)) && !String(child.type).startsWith('mdxJsx')) walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}
