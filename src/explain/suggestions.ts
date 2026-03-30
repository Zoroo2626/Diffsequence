import type { Consequence } from '../shared/types.js';
import { isTestFile } from '../shared/utils.js';

export function generateVerificationSteps(consequences: Consequence[]): Consequence[] {
  return consequences.map((c) => ({
    ...c,
    verificationSteps: buildVerificationSteps(c),
  }));
}

function buildVerificationSteps(c: Consequence): string[] {
  const steps: string[] = [];

  switch (c.type) {
    case 'direct_impact':
      steps.push(`Review ${basename(c.affectedFile)} to confirm it handles the change correctly`);
      if (c.affectedSymbol) {
        steps.push(`Check all usages of ${c.affectedSymbol} in the affected file`);
      }
      addTestStep(steps, c.affectedFile);
      break;

    case 'indirect_impact':
      steps.push(`Trace the dependency chain to understand how the change propagates`);
      steps.push(`Verify ${basename(c.affectedFile)} still works as expected via integration tests`);
      break;

    case 'behavior_change':
      if (c.affectedSymbol) {
        steps.push(`Check that ${basename(c.affectedFile)} is compatible with the new shape of ${c.affectedSymbol}`);
      }
      steps.push(`Run the TypeScript compiler to catch type errors`);
      addTestStep(steps, c.affectedFile);
      break;

    case 'test_coverage_gap':
      steps.push(`Consider adding tests for ${basename(c.affectedFile)}`);
      steps.push(`Run existing integration or e2e tests that might cover this code path`);
      break;

    case 'deployment_risk':
      steps.push(`Verify the configuration change works in a staging environment before deploying`);
      steps.push(`Check if any CI/CD pipelines depend on the changed values`);
      break;

    case 'reliability_risk':
      steps.push(`Test the error handling path manually`);
      steps.push(`Verify that failure modes are graceful and logged properly`);
      break;

    case 'performance_impact':
      steps.push(`Run performance benchmarks if available`);
      steps.push(`Monitor latency and resource usage after deploying this change`);
      break;

    default:
      steps.push(`Review ${basename(c.affectedFile)} to verify it still behaves correctly`);
  }

  return steps;
}

function addTestStep(steps: string[], filePath: string) {
  if (isTestFile(filePath)) return;

  const base = filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
  steps.push(`Run tests: look for ${basename(base)}.test.* or ${basename(base)}.spec.*`);
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
