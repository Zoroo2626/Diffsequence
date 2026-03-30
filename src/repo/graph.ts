import * as path from 'node:path';
import type { FileNode, DependencyEdge, DependencyGraph, ImportInfo, SymbolInfo } from '../shared/types.js';
import type { DiffsequenceConfig } from '../shared/types.js';
import type { ScannedFile } from './scanner.js';
import { extractSymbols, extractImports } from './symbols.js';
import { resolveImport } from './resolver.js';
import { logger } from '../shared/logger.js';

export function buildDependencyGraph(
  files: ScannedFile[],
  rootPath: string,
  _config: DiffsequenceConfig
): DependencyGraph {
  const nodes = new Map<string, FileNode>();
  const edges: DependencyEdge[] = [];

  // first pass: build nodes with symbols and imports
  for (const file of files) {
    const absolutePath = path.resolve(rootPath, file.relativePath);

    const symbols = extractSymbols(absolutePath);
    const imports = extractImports(absolutePath);

    nodes.set(file.relativePath, {
      path: file.relativePath,
      type: file.type,
      exports: symbols.filter((s) => s.exported),
      imports,
    });
  }

  // second pass: resolve imports and build edges
  for (const [filePath, node] of nodes) {
    for (const imp of node.imports) {
      const absoluteFrom = path.resolve(rootPath, filePath);
      const resolved = resolveImport(imp.source, absoluteFrom, rootPath);

      if (resolved && nodes.has(resolved)) {
        imp.resolvedPath = resolved;

        const isTypeOnly = imp.specifiers.every((s) => {
          const targetNode = nodes.get(resolved);
          if (!targetNode) return false;
          return targetNode.exports.some(
            (e) => e.name === s && (e.kind === 'type' || e.kind === 'interface')
          );
        });

        edges.push({
          from: filePath,
          to: resolved,
          symbols: imp.specifiers,
          isTypeOnly,
        });
      }
    }
  }

  logger.debug(`Graph built: ${nodes.size} nodes, ${edges.length} edges`);

  return createGraph(nodes, edges);
}

function createGraph(nodes: Map<string, FileNode>, edges: DependencyEdge[]): DependencyGraph {
  // pre-compute adjacency for fast lookups
  const consumersOf = new Map<string, Set<string>>();
  const dependenciesOf = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!consumersOf.has(edge.to)) consumersOf.set(edge.to, new Set());
    consumersOf.get(edge.to)!.add(edge.from);

    if (!dependenciesOf.has(edge.from)) dependenciesOf.set(edge.from, new Set());
    dependenciesOf.get(edge.from)!.add(edge.to);
  }

  return {
    nodes,
    edges,

    getConsumers(filePath: string): string[] {
      return [...(consumersOf.get(filePath) ?? [])];
    },

    getDependencies(filePath: string): string[] {
      return [...(dependenciesOf.get(filePath) ?? [])];
    },

    getTransitiveConsumers(filePath: string, maxDepth = 5): string[] {
      const visited = new Set<string>();
      const queue: Array<{ file: string; depth: number }> = [{ file: filePath, depth: 0 }];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth >= maxDepth) continue;

        const consumers = consumersOf.get(current.file) ?? new Set();
        for (const consumer of consumers) {
          if (!visited.has(consumer) && consumer !== filePath) {
            visited.add(consumer);
            queue.push({ file: consumer, depth: current.depth + 1 });
          }
        }
      }

      return [...visited];
    },
  };
}
