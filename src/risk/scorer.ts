import type { Consequence, DependencyGraph } from '../shared/types.js';
import { isTestFile, isConfigFile } from '../shared/utils.js';

export function calculateRiskScores(
  consequences: Consequence[],
  graph: DependencyGraph
): Consequence[] {
  return consequences.map((c) => {
    let score = getBaseScore(c);

    // files with many consumers are riskier to change
    const consumerCount = graph.getConsumers(c.sourceFile).length;
    if (consumerCount > 10) score += 20;
    else if (consumerCount > 5) score += 10;
    else if (consumerCount > 2) score += 5;

    // deeper dependency chains are harder to reason about
    if (c.causalChain.length > 3) score += 10;
    if (c.causalChain.length > 5) score += 10;

    // changes to shared/common/utils files tend to be far-reaching
    const sharedPatterns = ['shared', 'common', 'utils', 'helpers', 'lib', 'core'];
    if (sharedPatterns.some((p) => c.sourceFile.toLowerCase().includes(p))) {
      score += 15;
    }

    // API routes and handlers are user-facing
    const apiPatterns = ['api', 'route', 'handler', 'controller', 'endpoint'];
    if (apiPatterns.some((p) => c.sourceFile.toLowerCase().includes(p))) {
      score += 10;
    }

    // test files being affected is lower risk
    if (isTestFile(c.affectedFile)) {
      score = Math.max(10, score - 30);
    }

    // config changes get a boost
    if (isConfigFile(c.sourceFile)) {
      score += 10;
    }

    // scale by confidence: lower confidence = slightly higher risk (we're less sure it's safe)
    score = Math.round(score * (1 + (1 - c.confidence.score) * 0.2));

    return { ...c, riskScore: clamp(score, 0, 100) };
  });
}

function getBaseScore(c: Consequence): number {
  switch (c.type) {
    case 'direct_impact':
      return 35;
    case 'indirect_impact':
      return 20;
    case 'behavior_change':
      return 40;
    case 'deployment_risk':
      return 45;
    case 'test_coverage_gap':
      return 30;
    case 'latent_risk':
      return 25;
    case 'performance_impact':
      return 30;
    case 'reliability_risk':
      return 40;
    case 'documentation_drift':
      return 10;
    default:
      return 20;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
