import type { Consequence, ConsequenceType, RiskLevel } from '../shared/types.js';

interface ClassificationRule {
  type: ConsequenceType;
  riskAdjustment: number;
  test: (c: Consequence) => boolean;
}

const rules: ClassificationRule[] = [
  {
    type: 'test_coverage_gap',
    riskAdjustment: 15,
    test: (c) => {
      // if the affected file has no corresponding test file noted, it's a gap
      return !c.affectedFile.includes('.test.') && !c.affectedFile.includes('.spec.');
    },
  },
  {
    type: 'deployment_risk',
    riskAdjustment: 20,
    test: (c) => {
      const configIndicators = ['config', '.env', 'docker', 'package.json', 'ci', 'deploy'];
      return configIndicators.some((indicator) => c.sourceFile.toLowerCase().includes(indicator));
    },
  },
  {
    type: 'performance_impact',
    riskAdjustment: 10,
    test: (c) => {
      const perfKeywords = ['cache', 'memo', 'throttle', 'debounce', 'lazy', 'buffer', 'pool', 'batch'];
      const title = c.title.toLowerCase();
      const desc = c.description.toLowerCase();
      return perfKeywords.some((kw) => title.includes(kw) || desc.includes(kw));
    },
  },
  {
    type: 'reliability_risk',
    riskAdjustment: 15,
    test: (c) => {
      const reliabilityKeywords = ['error', 'catch', 'retry', 'fallback', 'timeout', 'health', 'monitor'];
      const src = c.sourceFile.toLowerCase();
      return reliabilityKeywords.some((kw) => src.includes(kw));
    },
  },
];

export function classifyConsequences(consequences: Consequence[]): Consequence[] {
  return consequences.map((consequence) => {
    let additionalTypes: ConsequenceType[] = [];
    let riskBoost = 0;

    for (const rule of rules) {
      if (rule.test(consequence)) {
        if (!additionalTypes.includes(rule.type) && rule.type !== consequence.type) {
          additionalTypes.push(rule.type);
        }
        riskBoost += rule.riskAdjustment;
      }
    }

    return {
      ...consequence,
      riskScore: Math.min(100, consequence.riskScore + riskBoost),
    };
  });
}

export function determineRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
