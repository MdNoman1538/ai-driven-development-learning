// Reads a TypeScript/JavaScript/Astro codebase into code facts (same shape as read_python.py).
//   node scripts/read-typescript.mjs <repo_dir> <out.json>
// Uses the TypeScript compiler's parser (no type-checking, no execution). Records functions,
// React components, classes and types with their parameters, defaults and doc comments, plus
// calls and JSX component uses it can resolve with certainty (same file or relative imports).

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, posix, relative } from 'node:path';
import ts from 'typescript';

const SKIP = new Set(['node_modules', 'dist', '.astro', '.cache', '.git', 'records', 'generated']);
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.astro']);

function walk(dir, root, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, root, out);
    else if (EXT.has(extname(name)) && !name.endsWith('.d.ts')) out.push(relative(root, p).split('\\').join('/'));
  }
  return out;
}

const text = (node, sf) => (node ? node.getText(sf).replace(/\s+/g, ' ') : null);

function docOf(node, sf) {
  const full = sf.getFullText();
  const ranges = ts.getLeadingCommentRanges(full, node.getFullStart()) ?? [];
  const lines = ranges
    .map((r) => full.slice(r.pos, r.end))
    .map((c) => c.replace(/^\/\*\*?|\*\/$/g, '').replace(/^\s*\/\/ ?/gm, '').replace(/^\s*\* ?/gm, '').trim())
    .filter(Boolean);
  return lines.length ? lines.join('\n') : null;
}

function paramsOf(fn, sf) {
  return (fn.parameters ?? []).map((p) => {
    const out = { name: text(p.name, sf), type: text(p.type, sf) };
    if (p.initializer) out.default = text(p.initializer, sf);
    if (p.dotDotDotToken) out.kind = '...rest';
    return out;
  });
}

function read(root) {
  const files = [];
  const symbols = new Map();
  const pending = [];
  const sources = {};
  for (const rel of walk(root, root).sort()) {
    if (!(rel.startsWith('src/') || rel.startsWith('scripts/') || rel === 'astro.config.mjs')) continue;
    let source = readFileSync(join(root, rel), 'utf8');
    sources[rel] = source;
    let code = source;
    let offsetLines = 0;
    if (rel.endsWith('.astro')) {
      const m = source.match(/^---\n([\s\S]*?)\n---/);
      code = m ? m[1] : '';
      offsetLines = 1;
    }
    const kind = rel.endsWith('.tsx') ? ts.ScriptKind.TSX : rel.endsWith('.astro') || rel.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, kind);
    const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 + offsetLines;
    const endLine = (n) => sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1 + offsetLines;
    const imports = {};
    files.push({ path: rel, doc: docOf(sf.statements[0] ?? sf, sf), loc: source.split('\n').length, source });

    const add = (name, node, fn, kindName, exported) => {
      const id = `${rel}::${name}`;
      symbols.set(id, {
        id,
        kind: kindName,
        name,
        qualname: name,
        file: rel,
        line: line(node),
        end_line: endLine(node),
        params: fn ? paramsOf(fn, sf) : [],
        returns: fn ? text(fn.type, sf) : null,
        async: !!fn?.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
        exported,
        doc: docOf(node, sf),
      });
      if (fn) pending.push({ id, body: fn, sf, rel, imports });
    };

    if (rel.endsWith('.astro')) {
      add(posix.basename(rel, '.astro'), sf, null, 'component', true);
      // The HTML template (after the frontmatter) uses components as <Name …/> tags.
      const template = source.replace(/^---\n[\s\S]*?\n---/, '');
      pending.push({ id: `${rel}::${posix.basename(rel, '.astro')}`, tags: [...template.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]), rel, imports });
    }
    for (const st of sf.statements) {
      const exported = !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
        const spec = st.moduleSpecifier.text;
        if (!spec.startsWith('.')) continue;
        const target = resolveImport(root, rel, spec);
        const clause = st.importClause;
        if (clause?.name) imports[clause.name.text] = { file: target, name: 'default' };
        clause?.namedBindings?.elements?.forEach((el) => (imports[el.name.text] = { file: target, name: (el.propertyName ?? el.name).text }));
      } else if (ts.isFunctionDeclaration(st) && st.name) {
        const isComponent = rel.endsWith('.tsx') && /^[A-Z]/.test(st.name.text);
        add(st.name.text, st, st, isComponent ? 'component' : 'function', exported);
        if (st.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) symbols.get(`${rel}::${st.name.text}`).default = true;
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)))
            add(d.name.text, st, d.initializer, 'function', exported);
        }
      } else if (ts.isClassDeclaration(st) && st.name) {
        add(st.name.text, st, null, 'class', exported);
      } else if ((ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) && st.name) {
        add(st.name.text, st, null, 'type', exported);
      }
    }
  }

  // Resolve calls and JSX uses: same-file functions, or names imported from project files.
  const byFile = (file, name) => {
    if (name === 'default') {
      const inFile = [...symbols.values()].filter((s) => s.file === file);
      const stem = posix.basename(file).replace(/\.[^.]+$/, '');
      return (inFile.find((s) => s.default) ?? inFile.find((s) => s.name === stem) ?? inFile.find((s) => s.kind === 'component'))?.id;
    }
    return symbols.has(`${file}::${name}`) ? `${file}::${name}` : undefined;
  };
  for (const { id, body, sf, rel, imports, tags } of pending) {
    const calls = new Set();
    for (const name of tags ?? []) {
      const target = imports[name] ? byFile(imports[name].file, imports[name].name) : undefined;
      if (target && target !== id) calls.add(target);
    }
    if (!body) {
      symbols.get(id).calls = [...calls].sort();
      continue;
    }
    const visit = (n) => {
      let name = null;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) name = n.expression.text;
      if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName)) name = n.tagName.text;
      if (name) {
        const target = symbols.has(`${rel}::${name}`) ? `${rel}::${name}` : imports[name] ? byFile(imports[name].file, imports[name].name) : undefined;
        if (target && target !== id) calls.add(target);
      }
      ts.forEachChild(n, visit);
    };
    ts.forEachChild(body, visit);
    symbols.get(id).calls = [...calls].sort();
  }
  for (const s of symbols.values()) for (const t of s.calls ?? []) (symbols.get(t).called_by ??= []).push(s.id);
  for (const s of symbols.values()) s.called_by = [...new Set(s.called_by ?? [])].sort();
  return { language: 'typescript', files, symbols: [...symbols.values()], endpoints: [] };
}

function resolveImport(root, from, spec) {
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, `${base}/index.ts`])
    if (existsSync(join(root, cand)) && statSync(join(root, cand)).isFile()) return cand;
  return base;
}

const [root, out] = process.argv.slice(2);
const facts = read(root);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(facts, null, 1) + '\n');
console.log(`typescript: ${facts.files.length} files, ${facts.symbols.length} symbols`);
