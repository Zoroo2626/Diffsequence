import chalk from 'chalk';
import boxen from 'boxen';
import type { AnalysisSummary } from '../../shared/types.js';
import { theme, riskIcon } from './theme.js';

export function renderSummary(
  summary: AnalysisSummary,
  filesChanged: number,
  analysisTimeMs: number
) {
  const verdictColor = getVerdictColor(summary);

  const lines: string[] = [];
  lines.push('');
  lines.push(theme.heading('  DIFFSEQUENCE'));
  lines.push(theme.muted('  Consequence analysis complete'));
  lines.push('');

  // stats row
  const stats = [
    `${chalk.white.bold(filesChanged.toString())} files changed`,
    `${chalk.white.bold(summary.totalConsequences.toString())} consequences found`,
    `${chalk.white.bold(analysisTimeMs.toString())}ms`,
  ];
  lines.push(`  ${stats.join(theme.muted('  ·  '))}`);
  lines.push('');

  // risk breakdown
  if (summary.criticalCount > 0) {
    lines.push(`  ${riskIcon('critical')}  ${theme.risk.critical(`${summary.criticalCount} critical`)}`);
  }
  if (summary.highCount > 0) {
    lines.push(`  ${riskIcon('high')}  ${theme.risk.high(`${summary.highCount} high`)}`);
  }
  if (summary.mediumCount > 0) {
    lines.push(`  ${riskIcon('medium')}  ${theme.risk.medium(`${summary.mediumCount} medium`)}`);
  }
  if (summary.lowCount > 0) {
    lines.push(`  ${riskIcon('low')}  ${theme.risk.low(`${summary.lowCount} low`)}`);
  }

  lines.push('');
  lines.push(`  ${verdictColor(summary.verdict)}`);
  lines.push('');

  const output = boxen(lines.join('\n'), {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: getBorderColor(summary),
    dimBorder: false,
  });

  console.log(output);
}

function getVerdictColor(summary: AnalysisSummary) {
  if (summary.criticalCount > 0) return theme.risk.critical;
  if (summary.highCount > 0) return theme.risk.high;
  if (summary.mediumCount > 0) return theme.risk.medium;
  return theme.risk.low;
}

function getBorderColor(summary: AnalysisSummary): string {
  if (summary.criticalCount > 0) return 'red';
  if (summary.highCount > 0) return '#FF8C00';
  if (summary.mediumCount > 0) return 'yellow';
  return 'green';
}
