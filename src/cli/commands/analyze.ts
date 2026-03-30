import * as fs from 'node:fs';
import ora from 'ora';
import type { DiffsequenceConfig } from '../../shared/types.js';
import { parseDiff } from '../../ingestion/parser.js';
import { normalizeChanges } from '../../ingestion/normalizer.js';
import {
  getStagedDiff,
  getWorkingDiff,
  getCommitDiff,
  getBranchDiff,
  getCurrentBranch,
  getRepoRoot,
} from '../../ingestion/git.js';
import { scanRepository } from '../../repo/scanner.js';
import { buildDependencyGraph } from '../../repo/graph.js';
import { runAnalysis } from '../../analysis/engine.js';
import { renderSummary } from '../render/summary.js';
import { renderConsequences } from '../render/consequences.js';
import { renderDetail } from '../render/detail.js';
import { exportJson } from '../../export/json.js';
import { exportMarkdown } from '../../export/markdown.js';
import { loadConfig } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { theme } from '../render/theme.js';

interface AnalyzeOptions {
  staged?: boolean;
  commit?: string;
  branch?: string;
  format?: 'text' | 'json';
  output?: string;
  verbose?: boolean;
  detail?: boolean;
  depth?: number;
}

export async function analyzeCommand(options: AnalyzeOptions) {
  try {
    const rootPath = await getRepoRoot();
    const config = await loadConfig(rootPath);

    if (options.depth) config.maxDepth = options.depth;

    // figure out what diff to analyze
    const spinner = ora({ text: 'Getting diff...', color: 'cyan' }).start();

    let rawDiff: string;
    let source: string;

    if (options.commit) {
      rawDiff = await getCommitDiff(options.commit);
      source = `commit ${options.commit.slice(0, 8)}`;
    } else if (options.branch) {
      rawDiff = await getBranchDiff(options.branch);
      source = `branch diff against ${options.branch}`;
    } else if (options.staged) {
      rawDiff = await getStagedDiff();
      source = 'staged changes';
    } else {
      // default: try staged first, fall back to working tree
      rawDiff = await getStagedDiff();
      if (!rawDiff.trim()) {
        rawDiff = await getWorkingDiff();
        source = 'working tree';
      } else {
        source = 'staged changes';
      }
    }

    if (!rawDiff.trim()) {
      spinner.stop();
      console.log(theme.muted('\n  No changes found. Stage some changes or specify a commit.\n'));
      process.exit(0);
    }

    spinner.text = 'Parsing diff...';

    const parsed = parseDiff(rawDiff);
    const changes = normalizeChanges(parsed);

    spinner.text = `Scanning repository (${source})...`;

    const files = await scanRepository(rootPath, config);

    spinner.text = 'Building dependency graph...';

    const graph = buildDependencyGraph(files, rootPath, config);

    spinner.text = 'Analyzing consequences...';

    const currentBranch = await getCurrentBranch();
    const result = await runAnalysis(changes, graph, rootPath, currentBranch, config);

    spinner.stop();

    // output
    if (options.format === 'json') {
      const json = exportJson(result);
      if (options.output) {
        fs.writeFileSync(options.output, json, 'utf-8');
        console.log(theme.success(`\n  Report saved to ${options.output}\n`));
      } else {
        console.log(json);
      }
      return;
    }

    // text output (default)
    renderSummary(result.summary, result.filesChanged, result.metadata.analysisTimeMs);
    renderConsequences(result.consequences);

    if (options.detail && result.consequences.length > 0) {
      for (const c of result.consequences) {
        renderDetail(c);
      }
    }

    // save report if requested
    if (options.output) {
      const md = exportMarkdown(result);
      fs.writeFileSync(options.output, md, 'utf-8');
      console.log(theme.success(`  Report saved to ${options.output}\n`));
    }
  } catch (err) {
    logger.error('Analysis failed', err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }
}
