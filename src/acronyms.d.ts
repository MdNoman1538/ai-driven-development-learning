declare module '*/acronyms.mjs' {
  export const ACRONYMS: Record<string, string>;
  export function splitAcronyms(text: string, seen: Set<string>): (string | { short: string; full: string; expand: boolean })[];
  export function acronymHtml(text: string, seen: Set<string>): string;
}
