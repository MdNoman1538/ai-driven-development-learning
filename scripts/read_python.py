"""Reads a Python repository into code facts for the learning site's code reference.

    python3 scripts/read_python.py <repo_dir> <out.json>

Uses only the standard library (`ast`): it reads the code without running it. For every
module, class and function it records the signature (parameters with annotations and
defaults), the docstring and the line range, plus the calls it can resolve *with certainty*
(same file, `self.` methods, and names imported from the project). Calls it can't resolve
are left out rather than guessed. FastAPI routes (`@app.get(...)` etc.) become endpoints.
"""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "dist", ".cache", "__pycache__", "data", ".pytest_cache", ".ruff_cache"}
HTTP_VERBS = {"get", "post", "put", "patch", "delete"}


def module_name(rel: Path) -> str:
    parts = list(rel.with_suffix("").parts)
    if parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def params(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> list[dict]:
    a = fn.args
    out = []
    positional = a.posonlyargs + a.args
    defaults = [None] * (len(positional) - len(a.defaults)) + list(a.defaults)
    for arg, d in zip(positional, defaults, strict=True):
        out.append(param(arg, d, None))
    if a.vararg:
        out.append(param(a.vararg, None, "*args"))
    for arg, d in zip(a.kwonlyargs, a.kw_defaults, strict=True):
        out.append(param(arg, d, "keyword-only"))
    if a.kwarg:
        out.append(param(a.kwarg, None, "**kwargs"))
    return [p for p in out if p["name"] not in ("self", "cls")]


def param(arg: ast.arg, default: ast.expr | None, kind: str | None) -> dict:
    p = {"name": arg.arg, "type": ast.unparse(arg.annotation) if arg.annotation else None}
    if default is not None:
        p["default"] = ast.unparse(default)
    if kind:
        p["kind"] = kind
    return p


class Reader:
    def __init__(self, root: Path):
        self.root = root
        self.files: list[dict] = []
        self.symbols: dict[str, dict] = {}
        self.endpoints: list[dict] = []
        self.modules: dict[str, str] = {}  # dotted module -> file path
        self.pending: list[tuple[str, ast.AST, dict, str | None]] = []  # (symbol id, node, imports, class)

    def read(self) -> dict:
        paths = sorted(p for p in self.root.rglob("*.py") if not SKIP_DIRS & set(p.relative_to(self.root).parts))
        trees = {}
        for path in paths:
            rel = path.relative_to(self.root)
            source = path.read_text(encoding="utf-8")
            try:
                tree = ast.parse(source)
            except SyntaxError:
                continue
            mod = module_name(rel)
            self.modules[mod] = rel.as_posix()
            trees[rel.as_posix()] = (tree, source)
        for rel, (tree, source) in trees.items():
            self.read_file(rel, tree, source)
        for sid, node, imports, cls in self.pending:
            self.symbols[sid]["calls"] = sorted(self.resolve_calls(node, imports, cls, sid))
        for sid, s in self.symbols.items():
            for target in s.get("calls", []):
                self.symbols[target].setdefault("called_by", []).append(sid)
        for s in self.symbols.values():
            s["called_by"] = sorted(set(s.get("called_by", [])))
        return {"language": "python", "files": self.files, "symbols": list(self.symbols.values()), "endpoints": self.endpoints}

    def read_file(self, rel: str, tree: ast.Module, source: str) -> None:
        imports = self.imports(tree, rel)
        # Module-level objects created from a class, e.g. `engine = SpatialRiskEngine()`:
        # a later `engine.method()` is then a certain call to that class's method.
        imports["__instances__"] = {
            t.id: node.value.func.id
            for node in tree.body
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name)
            for t in node.targets
            if isinstance(t, ast.Name)
        }
        self.files.append(
            {
                "path": rel,
                "module": module_name(Path(rel)),
                "doc": ast.get_docstring(tree),
                "loc": source.count("\n") + 1,
                "source": source,
            }
        )
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.add_function(rel, node, imports, None)
            elif isinstance(node, ast.ClassDef):
                cid = f"{rel}::{node.name}"
                self.symbols[cid] = {
                    "id": cid,
                    "kind": "class",
                    "name": node.name,
                    "file": rel,
                    "line": node.lineno,
                    "end_line": node.end_lineno,
                    "bases": [ast.unparse(b) for b in node.bases],
                    "doc": ast.get_docstring(node),
                    "fields": [
                        {"name": t.target.id, "type": ast.unparse(t.annotation), **({"default": ast.unparse(t.value)} if t.value else {})}
                        for t in node.body
                        if isinstance(t, ast.AnnAssign) and isinstance(t.target, ast.Name)
                    ],
                }
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        self.add_function(rel, item, imports, node.name)

    def add_function(self, rel: str, fn, imports: dict, cls: str | None) -> None:
        qual = f"{cls}.{fn.name}" if cls else fn.name
        sid = f"{rel}::{qual}"
        decorators = [ast.unparse(d) for d in fn.decorator_list]
        self.symbols[sid] = {
            "id": sid,
            "kind": "method" if cls else "function",
            "name": fn.name,
            "qualname": qual,
            "class": cls,
            "file": rel,
            "line": fn.lineno,
            "end_line": fn.end_lineno,
            "params": params(fn),
            "returns": ast.unparse(fn.returns) if fn.returns else None,
            "async": isinstance(fn, ast.AsyncFunctionDef),
            "decorators": decorators,
            "doc": ast.get_docstring(fn),
        }
        self.pending.append((sid, fn, imports, cls))
        for d in fn.decorator_list:  # FastAPI-style routes: @app.get("/path")
            if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in HTTP_VERBS and d.args:
                if isinstance(d.args[0], ast.Constant) and isinstance(d.args[0].value, str):
                    self.endpoints.append(
                        {"method": d.func.attr.upper(), "path": d.args[0].value, "handler": sid, "file": rel, "line": d.lineno}
                    )

    def imports(self, tree: ast.Module, rel: str) -> dict:
        """Local name -> (module, attribute or None) for imports from this project."""
        out = {}
        package = module_name(Path(rel)).rsplit(".", 1)[0] if "." in module_name(Path(rel)) else ""
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module is not None or isinstance(node, ast.ImportFrom) and node.level:
                base = node.module or ""
                if node.level:
                    parts = package.split(".") if package else []
                    parts = parts[: len(parts) - (node.level - 1)] if node.level > 1 else parts
                    base = ".".join([*parts, base] if base else parts)
                for alias in node.names:
                    out[alias.asname or alias.name] = (base, alias.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    out[alias.asname or alias.name.split(".")[0]] = (alias.name if alias.asname else alias.name.split(".")[0], None)
        return out

    def target(self, module: str, name: str | None) -> str | None:
        """The symbol id for `name` in project module `module` (following package re-exports one step)."""
        if name is None:
            return None
        if f"{module}.{name}" in self.modules:  # `from pkg import submodule`
            return None
        path = self.modules.get(module)
        if path and f"{path}::{name}" in self.symbols:
            return f"{path}::{name}"
        if path and path.endswith("__init__.py"):  # re-exported from a package's __init__
            for mod, p in self.modules.items():
                if mod.startswith(module + ".") and f"{p}::{name}" in self.symbols:
                    return f"{p}::{name}"
        return None

    def resolve_calls(self, fn, imports: dict, cls: str | None, sid: str) -> set[str]:
        rel = sid.split("::")[0]
        found = set()
        for node in ast.walk(fn):
            if not isinstance(node, ast.Call):
                continue
            f = node.func
            tid = None
            if isinstance(f, ast.Name):
                if f"{rel}::{f.id}" in self.symbols:
                    tid = f"{rel}::{f.id}"
                elif f.id in imports:
                    tid = self.target(*imports[f.id])
            elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
                if f.value.id == "self" and cls and f"{rel}::{cls}.{f.attr}" in self.symbols:
                    tid = f"{rel}::{cls}.{f.attr}"
                elif f.value.id in imports.get("__instances__", {}):
                    cls_name = imports["__instances__"][f.value.id]
                    cls_id = f"{rel}::{cls_name}" if f"{rel}::{cls_name}" in self.symbols else (
                        self.target(*imports[cls_name]) if cls_name in imports else None
                    )
                    if cls_id and f"{cls_id}.{f.attr}" in self.symbols:
                        tid = f"{cls_id}.{f.attr}"
                elif f.value.id in imports and imports[f.value.id][1] is None:
                    tid = self.target(imports[f.value.id][0], f.attr)
            if tid and tid != sid:
                found.add(tid)
        return found


def main() -> None:
    repo, out = Path(sys.argv[1]), Path(sys.argv[2])
    facts = Reader(repo).read()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(facts, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"python: {len(facts['files'])} files, {len(facts['symbols'])} symbols, {len(facts['endpoints'])} endpoints")


if __name__ == "__main__":
    main()
