// Finds acronyms in text and decides where to spell them out. Shared by the page plugin
// (rehype-acronyms.mjs) and the interactive components (Inline.tsx), so both behave the same.
import list from '../data/acronyms.json' with { type: 'json' };

export const ACRONYMS = Object.fromEntries(Object.entries(list).filter(([k]) => !k.startsWith('$')));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const alternation = Object.keys(ACRONYMS).sort((a, b) => b.length - a.length).map(escape).join('|');
// Whole words only (not inside other words), optional plural "s".
const PATTERN = new RegExp(`(?<![A-Za-z0-9_\\-])(${alternation})(s?)(?![A-Za-z0-9_])`, 'g');

/**
 * Splits text into plain strings and acronym parts.
 * `seen` is the set of acronyms already spelled out in this scope (a page, or a card);
 * the first use in a scope gets `expand: true` unless the text already spells it out.
 */
export function splitAcronyms(text, seen) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const [whole, short, plural] = m;
    const at = m.index;
    if (at > last) parts.push(text.slice(last, at));
    const after = text.slice(at + whole.length);
    const alreadySpelled = /^\s*\(/.test(after);
    const expand = !seen.has(short) && !alreadySpelled;
    seen.add(short);
    parts.push({ short: whole, full: ACRONYMS[short] + (plural ? 's' : ''), expand });
    last = at + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const html = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML for Astro components: <abbr> everywhere, spelled out on first use in `seen`. */
export function acronymHtml(text, seen) {
  return splitAcronyms(text, seen)
    .map((p) => (typeof p === 'string' ? html(p) : `<abbr title="${html(p.full)}">${html(p.short)}</abbr>${p.expand ? ` (${html(p.full)})` : ''}`))
    .join('');
}
