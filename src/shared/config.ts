import { cosmiconfig } from 'cosmiconfig';
import type { DiffsequenceConfig } from './types.js';

const DEFAULTS: DiffsequenceConfig = {
  ignore: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '*.min.js',
    '*.bundle.js',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ],
  riskThresholds: {
    low: 20,
    medium: 40,
    high: 65,
    critical: 85,
  },
  maxDepth: 5,
  includeTests: true,
  outputFormat: 'text',
};

export async function loadConfig(searchFrom?: string): Promise<DiffsequenceConfig> {
  const explorer = cosmiconfig('diffsequence');

  try {
    const result = await explorer.search(searchFrom);

    if (result && result.config) {
      return mergeConfig(DEFAULTS, result.config);
    }
  } catch {
    // config file had issues, just use defaults
  }

  return { ...DEFAULTS };
}

function mergeConfig(
  defaults: DiffsequenceConfig,
  overrides: Partial<DiffsequenceConfig>
): DiffsequenceConfig {
  return {
    ignore: overrides.ignore ?? defaults.ignore,
    riskThresholds: {
      ...defaults.riskThresholds,
      ...overrides.riskThresholds,
    },
    maxDepth: overrides.maxDepth ?? defaults.maxDepth,
    includeTests: overrides.includeTests ?? defaults.includeTests,
    outputFormat: overrides.outputFormat ?? defaults.outputFormat,
  };
}

export function getDefaultConfig(): DiffsequenceConfig {
  return { ...DEFAULTS };
}
