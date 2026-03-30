export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ConsequenceType =
  | 'direct_impact'
  | 'indirect_impact'
  | 'latent_risk'
  | 'performance_impact'
  | 'reliability_risk'
  | 'test_coverage_gap'
  | 'behavior_change'
  | 'documentation_drift'
  | 'deployment_risk';

export interface Confidence {
  score: number; // 0 to 1
  assumptions: string[];
  missingData: string[];
  improvementHints: string[];
}

export interface CausalStep {
  file: string;
  symbol?: string;
  relationship: string; // e.g. "imports from", "calls", "extends"
}

export interface Consequence {
  id: string;
  type: ConsequenceType;
  title: string;
  description: string;
  affectedFile: string;
  affectedSymbol?: string;
  sourceFile: string;
  sourceSymbol?: string;
  causalChain: CausalStep[];
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  confidence: Confidence;
  verificationSteps: string[];
  reasoning: string;
}

export interface AnalysisResult {
  timestamp: string;
  repository: string;
  branch: string;
  filesChanged: number;
  consequences: Consequence[];
  summary: AnalysisSummary;
  metadata: AnalysisMetadata;
}

export interface AnalysisSummary {
  totalConsequences: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  verdict: string;
  topRisks: string[];
}

export interface AnalysisMetadata {
  analysisTimeMs: number;
  filesScanned: number;
  symbolsIndexed: number;
  graphEdges: number;
}

export interface FileNode {
  path: string;
  type: FileType;
  exports: SymbolInfo[];
  imports: ImportInfo[];
}

export type FileType = 'source' | 'test' | 'config' | 'docs' | 'asset' | 'other';

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'enum' | 'default';
  line: number;
  exported: boolean;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  resolvedPath?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  symbols: string[];
  isTypeOnly: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, FileNode>;
  edges: DependencyEdge[];
  getConsumers(filePath: string): string[];
  getDependencies(filePath: string): string[];
  getTransitiveConsumers(filePath: string, depth?: number): string[];
}

export interface DiffsequenceConfig {
  ignore: string[];
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  maxDepth: number;
  includeTests: boolean;
  outputFormat: 'text' | 'json';
}
