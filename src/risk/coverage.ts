import type { Consequence, DependencyGraph } from '../shared/types.js';
import type { NormalizedChange } from '../ingestion/types.js';
import { isTestFile } from '../shared/utils.js';
import { generateId } from '../shared/utils.js';

export function detectCoverageGaps(
  changes: NormalizedChange[],
  graph: DependencyGraph
): Consequence[] {
  const consequences: Consequence[] = [];

  for (const change of changes) {
    if (isTestFile(change.filePath)) continue;

    const hasTests = checkForTests(change.filePath, graph);

    if (!hasTests) {
      consequences.push({
        id: generateId(),
        type: 'test_coverage_gap',
        title: `${basename(change.filePath)} has no associated tests`,
        description: `This file was modified but no matching test file could be found. Changes here aren't verified by any test in the project.`,
        affectedFile: change.filePath,
        sourceFile: change.filePath,
        causalChain: [{ file: change.filePath, relationship: 'no test file found' }],
        riskLevel: 'medium',
        riskScore: 30,
        confidence: {
          score: 0.65,
          assumptions: [
            'Test file detection is based on naming conventions (.test., .spec.) and directory patterns (__tests__)',
            'The file might be tested indirectly through integration tests',
          ],
          missingData: [
            'Actual test coverage data from a coverage tool would be more accurate',
          ],
          improvementHints: [
            'Run a coverage report and pass it to Diffsequence for precise gap detection',
          ],
        },
        verificationSteps: [],
        reasoning: '',
      });
    }
  }

  return consequences;
}

function checkForTests(filePath: string, graph: DependencyGraph): boolean {
  // check if any test file in the graph imports from this file
  for (const [path, node] of graph.nodes) {
    if (!isTestFile(path)) continue;

    for (const imp of node.imports) {
      if (imp.resolvedPath === filePath) {
        return true;
      }
    }
  }

  // check by naming convention
  const baseName = filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
  const testPatterns = [
    `${baseName}.test.`,
    `${baseName}.spec.`,
  ];

  for (const testPath of graph.nodes.keys()) {
    if (testPatterns.some((p) => testPath.includes(p))) {
      return true;
    }
  }

  return false;
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
