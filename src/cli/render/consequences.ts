import chalk from 'chalk';
import type { Consequence } from '../../shared/types.js';
import { theme, riskColor, riskIcon, typeBadge } from './theme.js';
import { truncate } from '../../shared/utils.js';

export function renderConsequences(consequences: Consequence[]) {
  if (consequences.length === 0) {
    console.log(theme.muted('\n  No consequences detected. This change looks self-contained.\n'));
    return;
  }

  console.log('');
  console.log(theme.heading('  CONSEQUENCES'));
  console.log(theme.muted('  Ranked by risk score, highest first'));
  console.log('');

  for (let i = 0; i < consequences.length; i++) {
    renderConsequenceRow(consequences[i], i + 1);
  }

  console.log('');
}

function renderConsequenceRow(c: Consequence, index: number) {
  const color = riskColor(c.riskLevel);
  const icon = riskIcon(c.riskLevel);
  const badge = typeBadge(c.type);

  const indexStr = theme.muted(`${index.toString().padStart(2)}.`);
  const scoreStr = color(`${c.riskScore}/100`);
  const confidenceStr = theme.muted(`${Math.round(c.confidence.score * 100)}% confidence`);

  // main line
  console.log(`  ${indexStr} ${icon} ${badge} ${chalk.white.bold(truncate(c.title, 80))}`);

  // file info
  console.log(`      ${theme.file(c.affectedFile)} ${theme.muted('←')} ${theme.muted(c.sourceFile)}`);

  // risk + confidence
  console.log(`      Risk: ${scoreStr}  ${confidenceStr}`);

  // description
  console.log(`      ${theme.muted(truncate(c.description, 100))}`);

  console.log('');
}
