import * as fs from 'node:fs';
import * as path from 'node:path';
import * as parser from '@babel/parser';
import type { DependencyGraph, Consequence } from '../../shared/types.js';
import type { NormalizedChange } from '../../ingestion/types.js';
import { generateId } from '../../shared/utils.js';

import _traverseModule from '@babel/traverse';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (typeof (_traverseModule as any).default === 'function'
  ? (_traverseModule as any).default
  : _traverseModule) as (ast: any, visitors: any) => void;

export function traceCallSites(
  changes: NormalizedChange[],
  graph: DependencyGraph,
  rootPath: string
): Consequence[] {
  const consequences: Consequence[] = [];

  for (const change of changes) {
    if (change.modifiedSymbols.length === 0) continue;

    const consumers = graph.getConsumers(change.filePath);

    for (const consumer of consumers) {
      const consumerPath = path.resolve(rootPath, consumer);
      const callSites = findCallSites(consumerPath, change.modifiedSymbols);

      for (const site of callSites) {
        consequences.push({
          id: generateId(),
          type: 'direct_impact',
          title: `${site.symbolName}() is called in ${basename(consumer)} at line ${site.line}`,
          description: `The function ${site.symbolName} was modified and is called in this file. The call site at line ${site.line} may behave differently after this change.`,
          affectedFile: consumer,
          affectedSymbol: site.symbolName,
          sourceFile: change.filePath,
          sourceSymbol: site.symbolName,
          causalChain: [
            { file: change.filePath, symbol: site.symbolName, relationship: 'function modified' },
            { file: consumer, symbol: site.symbolName, relationship: 'calls' },
          ],
          riskLevel: 'high',
          riskScore: 0,
          confidence: {
            score: 0.85,
            assumptions: [
              'The symbol name in the consumer matches the modified export',
              'Static analysis found the call site, but runtime binding could differ',
            ],
            missingData: ['Whether the call site exercises the changed code path'],
            improvementHints: ['Runtime tracing or test coverage data would confirm this'],
          },
          verificationSteps: [],
          reasoning: '',
        });
      }
    }
  }

  return consequences;
}

interface CallSite {
  symbolName: string;
  line: number;
}

function findCallSites(filePath: string, symbolNames: string[]): CallSite[] {
  let code: string;
  try {
    code = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const plugins: parser.ParserPlugin[] = [];
  if (isTS) plugins.push('typescript');
  plugins.push('jsx', 'decorators-legacy', 'classProperties', 'dynamicImport');

  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins, errorRecovery: true });
  } catch {
    return [];
  }

  const sites: CallSite[] = [];
  const nameSet = new Set(symbolNames);

  traverse(ast, {
    CallExpression(nodePath: any) {
      let calleeName: string | null = null;

      if (nodePath.node.callee.type === 'Identifier') {
        calleeName = nodePath.node.callee.name;
      } else if (
        nodePath.node.callee.type === 'MemberExpression' &&
        nodePath.node.callee.property.type === 'Identifier'
      ) {
        calleeName = nodePath.node.callee.property.name;
      }

      if (calleeName && nameSet.has(calleeName)) {
        sites.push({
          symbolName: calleeName,
          line: nodePath.node.loc?.start.line ?? 0,
        });
      }
    },
  });

  return sites;
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
