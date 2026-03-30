import type { DependencyGraph } from '../../shared/types.js';
import type { NormalizedChange } from '../../ingestion/types.js';
import type { Consequence, CausalStep } from '../../shared/types.js';
import { generateId } from '../../shared/utils.js';

export function traceImportChains(
  changes: NormalizedChange[],
  graph: DependencyGraph,
  maxDepth: number
): Consequence[] {
  const consequences: Consequence[] = [];

  for (const change of changes) {
    const directConsumers = graph.getConsumers(change.filePath);

    for (const consumer of directConsumers) {
      const chain: CausalStep[] = [
        { file: change.filePath, relationship: 'changed' },
        { file: consumer, relationship: 'imports from' },
      ];

      consequences.push({
        id: generateId(),
        type: 'direct_impact',
        title: `${basename(consumer)} directly imports from ${basename(change.filePath)}`,
        description: `This file imports from the changed module. Any modifications to exported symbols could affect its behavior.`,
        affectedFile: consumer,
        sourceFile: change.filePath,
        sourceSymbol: change.modifiedSymbols[0],
        causalChain: chain,
        riskLevel: 'medium',
        riskScore: 0,
        confidence: {
          score: 0.9,
          assumptions: ['The import relationship exists based on static analysis'],
          missingData: [],
          improvementHints: [],
        },
        verificationSteps: [],
        reasoning: '',
      });
    }

    // walk deeper for indirect impacts
    const transitiveConsumers = graph.getTransitiveConsumers(change.filePath, maxDepth);
    const indirectConsumers = transitiveConsumers.filter((c) => !directConsumers.includes(c));

    for (const indirect of indirectConsumers) {
      const chain = buildCausalChain(change.filePath, indirect, graph);

      consequences.push({
        id: generateId(),
        type: 'indirect_impact',
        title: `${basename(indirect)} is indirectly affected through the import chain`,
        description: `This file doesn't import from the changed module directly, but it depends on something that does. Changes could propagate through the chain.`,
        affectedFile: indirect,
        sourceFile: change.filePath,
        causalChain: chain,
        riskLevel: 'low',
        riskScore: 0,
        confidence: {
          score: 0.6,
          assumptions: [
            'Indirect dependencies carry propagation risk',
            'The actual runtime behavior depends on what exactly changed',
          ],
          missingData: ['Exact symbol usage at each step in the chain'],
          improvementHints: ['Narrowing down which specific exports are consumed would refine this'],
        },
        verificationSteps: [],
        reasoning: '',
      });
    }
  }

  return consequences;
}

function buildCausalChain(from: string, to: string, graph: DependencyGraph): CausalStep[] {
  // BFS to find the shortest path
  const visited = new Set<string>();
  const parentMap = new Map<string, string>();
  const queue = [from];
  visited.add(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) break;

    const consumers = graph.getConsumers(current);
    for (const consumer of consumers) {
      if (!visited.has(consumer)) {
        visited.add(consumer);
        parentMap.set(consumer, current);
        queue.push(consumer);
      }
    }
  }

  const chain: CausalStep[] = [];
  let cursor = to;

  while (cursor && cursor !== from) {
    const parent = parentMap.get(cursor);
    if (!parent) break;
    chain.unshift({ file: cursor, relationship: 'imports from' });
    cursor = parent;
  }

  chain.unshift({ file: from, relationship: 'changed' });

  return chain;
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
