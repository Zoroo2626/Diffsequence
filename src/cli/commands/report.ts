import * as fs from 'node:fs';
import ora from 'ora';
import {
  getRepoRoot,
  getStagedDiff,
  getWorkingDiff,
  getCommitDiff,
  getCurrentBranch,
} from '../../ingestion/git.js';
import { parseDiff } from '../../ingestion/parser.js';
import { normalizeChanges } from '../../ingestion/normalizer.js';
import { scanRepository } from '../../repo/scanner.js';
import { buildDependencyGraph } from '../../repo/graph.js';
import { runAnalysis } from '../../analysis/engine.js';
import { exportMarkdown } from '../../export/markdown.js';
import { exportJson } from '../../export/json.js';
import { loadConfig } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { theme } from '../render/theme.js';

interface ReportOptions {
  commit?: string;
  staged?: boolean;
  format?: 'markdown' | 'json';
  output: string;
}

export async function reportCommand(options: ReportOptions) {
  try {
    const rootPath = await getRepoRoot();
    const config = await loadConfig(rootPath);

    const spinner = ora({ text: 'Generating report...', color: 'cyan' }).start();

    let rawDiff: string;

    if (options.commit) {
      rawDiff = await getCommitDiff(options.commit);
    } else if (options.staged) {
      rawDiff = await getStagedDiff();
    } else {
      rawDiff = await getStagedDiff();
      if (!rawDiff.trim()) {
        rawDiff = await getWorkingDiff();
      }
    }

    if (!rawDiff.trim()) {
      spinner.stop();
      console.log(theme.muted('\n  No changes found.\n'));
      process.exit(0);
    }

    const parsed = parseDiff(rawDiff);
    const changes = normalizeChanges(parsed);
    const files = await scanRepository(rootPath, config);
    const graph = buildDependencyGraph(files, rootPath, config);
    const branch = await getCurrentBranch();
    const result = await runAnalysis(changes, graph, rootPath, branch, config);

    let content: string;
    if (options.format === 'json') {
      content = exportJson(result);
    } else {
      content = exportMarkdown(result);
    }

    fs.writeFileSync(options.output, content, 'utf-8');

    spinner.stop();
    console.log(theme.success(`\n  Report saved to ${options.output}\n`));
  } catch (err) {
    logger.error('Report generation failed', err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
}
