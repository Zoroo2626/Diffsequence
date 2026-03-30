import type { DependencyGraph, Consequence, AnalysisResult, AnalysisSummary, AnalysisMetadata, DiffsequenceConfig } from '../shared/types.js';
import type { NormalizedChange } from '../ingestion/types.js';
import { traceImportChains } from './tracers/import.js';
import { traceCallSites } from './tracers/callsite.js';
import { traceTypeChanges } from './tracers/type.js';
import { traceConfigChanges } from './tracers/config.js';
import { classifyConsequences, determineRiskLevel } from './classifier.js';
import { calculateRiskScores } from '../risk/scorer.js';
import { detectCoverageGaps } from '../risk/coverage.js';
import { generateExplanations } from '../explain/narrator.js';
import { generateVerificationSteps } from '../explain/suggestions.js';
import { logger } from '../shared/logger.js';

export async function runAnalysis(
  changes: NormalizedChange[],
  graph: DependencyGraph,
  rootPath: string,
  branch: string,
  config: DiffsequenceConfig
): Promise<AnalysisResult> {
  const startTime = Date.now();

  logger.debug(`Analyzing ${changes.length} changed files`);

  // run all tracers
  const importConsequences = traceImportChains(changes, graph, config.maxDepth);
  const callSiteConsequences = traceCallSites(changes, graph, rootPath);
  const typeConsequences = traceTypeChanges(changes, graph);
  const configConsequences = traceConfigChanges(changes);

  let allConsequences = [
    ...importConsequences,
    ...callSiteConsequences,
    ...typeConsequences,
    ...configConsequences,
  ];

  // deduplicate by affected file + source file + type
  allConsequences = deduplicateConsequences(allConsequences);

  // add test coverage gap consequences
  const coverageGaps = detectCoverageGaps(changes, graph);
  allConsequences.push(...coverageGaps);

  // score risks
  allConsequences = calculateRiskScores(allConsequences, graph);

  // classify
  allConsequences = classifyConsequences(allConsequences);

  // re-determine risk levels after scoring
  allConsequences = allConsequences.map((c) => ({
    ...c,
    riskLevel: determineRiskLevel(c.riskScore),
  }));

  // generate human-readable explanations
  allConsequences = generateExplanations(allConsequences);

  // generate verification steps
  allConsequences = generateVerificationSteps(allConsequences);

  // sort by risk score descending
  allConsequences.sort((a, b) => b.riskScore - a.riskScore);

  const analysisTimeMs = Date.now() - startTime;

  const summary = buildSummary(allConsequences);
  const metadata: AnalysisMetadata = {
    analysisTimeMs,
    filesScanned: graph.nodes.size,
    symbolsIndexed: countSymbols(graph),
    graphEdges: graph.edges.length,
  };

  return {
    timestamp: new Date().toISOString(),
    repository: rootPath.split(/[/\\]/).pop() ?? rootPath,
    branch,
    filesChanged: changes.length,
    consequences: allConsequences,
    summary,
    metadata,
  };
}

function deduplicateConsequences(consequences: Consequence[]): Consequence[] {
  const seen = new Set<string>();
  const result: Consequence[] = [];

  for (const c of consequences) {
    const key = `${c.affectedFile}:${c.sourceFile}:${c.type}:${c.affectedSymbol ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }

  return result;
}

function buildSummary(consequences: Consequence[]): AnalysisSummary {
  const criticalCount = consequences.filter((c) => c.riskLevel === 'critical').length;
  const highCount = consequences.filter((c) => c.riskLevel === 'high').length;
  const mediumCount = consequences.filter((c) => c.riskLevel === 'medium').length;
  const lowCount = consequences.filter((c) => c.riskLevel === 'low').length;

  let verdict: string;
  if (criticalCount > 0) {
    verdict = 'This change has critical consequences that need careful review before merging.';
  } else if (highCount > 0) {
    verdict = 'This change carries significant risk. Review the high priority items below.';
  } else if (mediumCount > 0) {
    verdict = 'Moderate risk. A few things worth checking before merging.';
  } else if (lowCount > 0) {
    verdict = 'Low risk change. The consequences are minor, but worth a quick look.';
  } else {
    verdict = 'This change looks contained. No significant downstream effects detected.';
  }

  const topRisks = consequences
    .slice(0, 3)
    .map((c) => c.title);

  return {
    totalConsequences: consequences.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    verdict,
    topRisks,
  };
}

function countSymbols(graph: DependencyGraph): number {
  let count = 0;
  for (const node of graph.nodes.values()) {
    count += node.exports.length;
  }
  return count;
}
