import * as fs from 'node:fs';
import * as parser from '@babel/parser';
import type { SymbolInfo, ImportInfo } from '../shared/types.js';

// @babel/traverse has CJS/ESM interop issues with TypeScript, so we handle both shapes
import _traverseModule from '@babel/traverse';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (typeof (_traverseModule as any).default === 'function'
  ? (_traverseModule as any).default
  : _traverseModule) as (ast: any, visitors: any) => void;

export function extractSymbols(filePath: string): SymbolInfo[] {
  const code = readFileSafe(filePath);
  if (!code) return [];

  const ast = parseCode(code, filePath);
  if (!ast) return [];

  const symbols: SymbolInfo[] = [];

  traverse(ast, {
    ExportNamedDeclaration(path: any) {
      const decl = path.node.declaration;
      if (!decl) {
        for (const spec of path.node.specifiers) {
          if (spec.type === 'ExportSpecifier' && spec.exported.type === 'Identifier') {
            symbols.push({
              name: spec.exported.name,
              kind: 'variable',
              line: spec.loc?.start.line ?? 0,
              exported: true,
            });
          }
        }
        return;
      }

      if (decl.type === 'FunctionDeclaration' && decl.id) {
        symbols.push({
          name: decl.id.name,
          kind: 'function',
          line: decl.loc?.start.line ?? 0,
          exported: true,
        });
      } else if (decl.type === 'ClassDeclaration' && decl.id) {
        symbols.push({
          name: decl.id.name,
          kind: 'class',
          line: decl.loc?.start.line ?? 0,
          exported: true,
        });
      } else if (decl.type === 'VariableDeclaration') {
        for (const declarator of decl.declarations) {
          if (declarator.id.type === 'Identifier') {
            symbols.push({
              name: declarator.id.name,
              kind: 'variable',
              line: declarator.loc?.start.line ?? 0,
              exported: true,
            });
          }
        }
      } else if (decl.type === 'TSTypeAliasDeclaration') {
        symbols.push({
          name: decl.id.name,
          kind: 'type',
          line: decl.loc?.start.line ?? 0,
          exported: true,
        });
      } else if (decl.type === 'TSInterfaceDeclaration') {
        symbols.push({
          name: decl.id.name,
          kind: 'interface',
          line: decl.loc?.start.line ?? 0,
          exported: true,
        });
      } else if (decl.type === 'TSEnumDeclaration') {
        symbols.push({
          name: decl.id.name,
          kind: 'enum',
          line: decl.loc?.start.line ?? 0,
          exported: true,
        });
      }
    },

    ExportDefaultDeclaration(path: any) {
      const decl = path.node.declaration;
      let name = 'default';

      if (decl.type === 'FunctionDeclaration' && decl.id) {
        name = decl.id.name;
      } else if (decl.type === 'ClassDeclaration' && decl.id) {
        name = decl.id.name;
      } else if (decl.type === 'Identifier') {
        name = decl.name;
      }

      symbols.push({
        name,
        kind: 'default',
        line: decl.loc?.start.line ?? 0,
        exported: true,
      });
    },

    FunctionDeclaration(path: any) {
      if (path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration') return;
      if (path.node.id) {
        symbols.push({
          name: path.node.id.name,
          kind: 'function',
          line: path.node.loc?.start.line ?? 0,
          exported: false,
        });
      }
    },

    ClassDeclaration(path: any) {
      if (path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration') return;
      if (path.node.id) {
        symbols.push({
          name: path.node.id.name,
          kind: 'class',
          line: path.node.loc?.start.line ?? 0,
          exported: false,
        });
      }
    },
  });

  return symbols;
}

export function extractImports(filePath: string): ImportInfo[] {
  const code = readFileSafe(filePath);
  if (!code) return [];

  const ast = parseCode(code, filePath);
  if (!ast) return [];

  const imports: ImportInfo[] = [];

  traverse(ast, {
    ImportDeclaration(path: any) {
      const source = path.node.source.value;
      const specifiers: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      for (const spec of path.node.specifiers) {
        if (spec.type === 'ImportDefaultSpecifier') {
          isDefault = true;
          specifiers.push(spec.local.name);
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          isNamespace = true;
          specifiers.push(spec.local.name);
        } else if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          specifiers.push(spec.imported.name);
        }
      }

      imports.push({ source, specifiers, isDefault, isNamespace });
    },

    CallExpression(path: any) {
      if (
        path.node.callee.type === 'Identifier' &&
        path.node.callee.name === 'require' &&
        path.node.arguments.length === 1 &&
        path.node.arguments[0].type === 'StringLiteral'
      ) {
        imports.push({
          source: path.node.arguments[0].value,
          specifiers: [],
          isDefault: true,
          isNamespace: false,
        });
      }
    },
  });

  return imports;
}

function parseCode(code: string, filePath: string) {
  const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

  const plugins: parser.ParserPlugin[] = [];
  if (isTS) plugins.push('typescript');
  if (isJSX || isTS) plugins.push('jsx');
  plugins.push('decorators-legacy', 'classProperties', 'dynamicImport');

  try {
    return parser.parse(code, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
    });
  } catch {
    return null;
  }
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
