import type { Consequence } from '../../shared/types.js';
import type { NormalizedChange } from '../../ingestion/types.js';
import { generateId, isConfigFile } from '../../shared/utils.js';

const CONFIG_IMPACT_MAP: Record<string, { risk: string; description: string }> = {
  'package.json': {
    risk: 'Dependencies or scripts changed. This affects the entire project build and runtime.',
    description: 'Modifications to package.json can alter dependency versions, build scripts, or project configuration that impacts every module.',
  },
  'tsconfig': {
    risk: 'TypeScript compiler settings changed. This can affect type checking and build output across the whole project.',
    description: 'Changes to tsconfig alter how TypeScript compiles all source files. Strictness changes, path mappings, or target changes have broad effects.',
  },
  '.env': {
    risk: 'Environment variables changed. Any module reading these values at runtime is affected.',
    description: 'Environment variable changes can silently alter runtime behavior in any module that reads from process.env.',
  },
  '.eslintrc': {
    risk: 'Linting rules changed. Code that previously passed lint may now fail.',
    description: 'Linting configuration changes can cause CI failures or mask issues that were previously caught.',
  },
  'webpack.config': {
    risk: 'Build configuration changed. Bundle output, splitting, and module resolution may be affected.',
    description: 'Webpack config changes can alter how modules are bundled, which affects browser runtime behavior.',
  },
  'vite.config': {
    risk: 'Build configuration changed. Dev server and production build behavior may differ.',
    description: 'Vite config changes affect both development and production builds.',
  },
  'docker': {
    risk: 'Deployment configuration changed. The runtime environment may behave differently.',
    description: 'Docker configuration changes affect how the application is deployed and what environment it runs in.',
  },
};

export function traceConfigChanges(changes: NormalizedChange[]): Consequence[] {
  const consequences: Consequence[] = [];

  for (const change of changes) {
    if (!isConfigFile(change.filePath)) continue;

    const filename = change.filePath.split('/').pop() ?? '';
    const matchedKey = Object.keys(CONFIG_IMPACT_MAP).find((key) =>
      filename.toLowerCase().includes(key.toLowerCase())
    );

    const impact = matchedKey
      ? CONFIG_IMPACT_MAP[matchedKey]
      : {
          risk: 'Configuration file modified. Broad system impact is possible.',
          description: 'This configuration file may affect multiple parts of the system.',
        };

    consequences.push({
      id: generateId(),
      type: 'deployment_risk',
      title: `Configuration file ${filename} was modified`,
      description: impact.description,
      affectedFile: change.filePath,
      sourceFile: change.filePath,
      causalChain: [{ file: change.filePath, relationship: 'config changed' }],
      riskLevel: 'high',
      riskScore: 0,
      confidence: {
        score: 0.7,
        assumptions: [
          'Configuration files have broad impact by nature',
          'The specific effect depends on what values changed',
        ],
        missingData: ['Which specific values were changed', 'Which modules consume this configuration'],
        improvementHints: ['Parsing the specific config diff would provide more targeted insights'],
      },
      verificationSteps: [],
      reasoning: impact.risk,
    });
  }

  return consequences;
}
