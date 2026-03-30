import * as path from 'node:path';
import * as fs from 'node:fs';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export function resolveImport(importSource: string, fromFile: string, rootPath: string): string | null {
  // skip bare specifiers (node_modules packages)
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const absolute = path.resolve(fromDir, importSource);

  // try exact path first
  if (hasExtension(importSource)) {
    const normalized = path.resolve(fromDir, importSource);
    if (fs.existsSync(normalized)) {
      return toRelative(normalized, rootPath);
    }

    // NodeNext: .js imports might map to .ts files
    const ext = path.extname(importSource);
    if (ext === '.js' || ext === '.jsx') {
      const tsEquivalents = ext === '.js' ? ['.ts', '.tsx'] : ['.tsx', '.ts'];
      const base = normalized.slice(0, -ext.length);
      for (const tsExt of tsEquivalents) {
        if (fs.existsSync(base + tsExt)) {
          return toRelative(base + tsExt, rootPath);
        }
      }
    }

    // also try stripping the extension and searching fresh
    const withoutExt = absolute.slice(0, -ext.length);
    for (const tryExt of SOURCE_EXTENSIONS) {
      if (fs.existsSync(withoutExt + tryExt)) {
        return toRelative(withoutExt + tryExt, rootPath);
      }
    }

    return null;
  }

  // try adding extensions
  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = absolute + ext;
    if (fs.existsSync(withExt)) {
      return toRelative(withExt, rootPath);
    }
  }

  // try as directory with index file
  for (const ext of SOURCE_EXTENSIONS) {
    const indexFile = path.join(absolute, `index${ext}`);
    if (fs.existsSync(indexFile)) {
      return toRelative(indexFile, rootPath);
    }
  }

  return null;
}

function hasExtension(importSource: string): boolean {
  const ext = path.extname(importSource);
  return SOURCE_EXTENSIONS.includes(ext);
}

function toRelative(absolutePath: string, rootPath: string): string {
  return path.relative(rootPath, absolutePath).replace(/\\/g, '/');
}
