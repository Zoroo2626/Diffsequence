import type { DependencyGraph, Consequence } from '../../shared/types.js';
import type { NormalizedChange } from '../../ingestion/types.js';
import { generateId } from '../../shared/utils.js';

export function traceTypeChanges(
  changes: NormalizedChange[],
  graph: DependencyGraph
): Consequence[] {
  const consequences: Consequence[] = [];

  for (const change of changes) {
    const node = graph.nodes.get(change.filePath);
    if (!node) continue;

    // find exported types/interfaces that were modified
    const modifiedTypes = node.exports.filter(
      (exp) =>
        (exp.kind === 'type' || exp.kind === 'interface' || exp.kind === 'enum') &&
        change.modifiedSymbols.includes(exp.name)
    );

    if (modifiedTypes.length === 0) continue;

    const consumers = graph.getConsumers(change.filePath);

    for (const consumer of consumers) {
      const consumerNode = graph.nodes.get(consumer);
      if (!consumerNode) continue;

      // check if this consumer actually imports any of the modified types
      const relevantImports = consumerNode.imports.filter(
        (imp) =>
          imp.resolvedPath === change.filePath &&
          imp.specifiers.some((s) => modifiedTypes.some((t) => t.name === s))
      );

      if (relevantImports.length === 0) continue;

      const affectedTypeNames = relevantImports.flatMap((imp) =>
        imp.specifiers.filter((s) => modifiedTypes.some((t) => t.name === s))
      );

      for (const typeName of affectedTypeNames) {
        consequences.push({
          id: generateId(),
          type: 'behavior_change',
          title: `Type ${typeName} changed and is used in ${basename(consumer)}`,
          description: `The type definition for ${typeName} was modified. This file uses that type, so type errors or runtime behavior changes are possible.`,
          affectedFile: consumer,
          affectedSymbol: typeName,
          sourceFile: change.filePath,
          sourceSymbol: typeName,
          causalChain: [
            { file: change.filePath, symbol: typeName, relationship: 'type definition changed' },
            { file: consumer, symbol: typeName, relationship: 'uses type' },
          ],
          riskLevel: 'medium',
          riskScore: 0,
          confidence: {
            score: 0.8,
            assumptions: [
              'Type changes propagate to all consumers',
              'If the change is additive (new optional field), risk is lower',
            ],
            missingData: ['Whether the type change is breaking or additive'],
            improvementHints: ['Comparing old vs new type shape would refine this'],
          },
          verificationSteps: [],
          reasoning: '',
        });
      }
    }
  }

  return consequences;
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
