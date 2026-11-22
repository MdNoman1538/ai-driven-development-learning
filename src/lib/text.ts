// Server-side rendering of the small Markdown subset used in data files, with acronym expansion.
// Pass one `seen` set per card/section: the first use of an acronym in it is spelled out.
import { acronymHtml } from './acronyms.mjs';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function md(text: string, seen: Set<string> = new Set()): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    const at = m.index ?? 0;
    out += acronymHtml(text.slice(last, at), seen);
    const t = m[0];
    if (t.startsWith('`')) out += `<code>${esc(t.slice(1, -1))}</code>`;
    else if (t.startsWith('**')) out += `<strong>${acronymHtml(t.slice(2, -2), seen)}</strong>`;
    else out += `<em>${acronymHtml(t.slice(1, -1), seen)}</em>`;
    last = at + t.length;
  }
  return out + acronymHtml(text.slice(last), seen);
}
