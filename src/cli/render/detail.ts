import chalk from 'chalk';
import type { Consequence } from '../../shared/types.js';
import { theme, riskColor, typeBadge } from './theme.js';
import { formatCausalChain } from '../../explain/chain.js';

export function renderDetail(consequence: Consequence) {
  const color = riskColor(consequence.riskLevel);

  console.log('');
  console.log(theme.heading(`  ┌─ DETAIL`));
  console.log('');

  // title and type
  console.log(`  ${typeBadge(consequence.type)} ${chalk.white.bold(consequence.title)}`);
  console.log('');

  // affected / source
  console.log(`  ${theme.subheading('Affected:')}  ${theme.file(consequence.affectedFile)}${consequence.affectedSymbol ? theme.symbol(` .${consequence.affectedSymbol}`) : ''}`);
  console.log(`  ${theme.subheading('Source:')}    ${theme.file(consequence.sourceFile)}${consequence.sourceSymbol ? theme.symbol(` .${consequence.sourceSymbol}`) : ''}`);

  // risk
  console.log(`  ${theme.subheading('Risk:')}      ${color(`${consequence.riskLevel.toUpperCase()} (${consequence.riskScore}/100)`)}`);
  console.log(`  ${theme.subheading('Confidence:')} ${theme.accent(`${Math.round(consequence.confidence.score * 100)}%`)}`);
  console.log('');

  // reasoning
  if (consequence.reasoning) {
    console.log(`  ${theme.subheading('Why this matters:')}`);
    for (const line of wrapText(consequence.reasoning, 80)) {
      console.log(`  ${theme.muted(line)}`);
    }
    console.log('');
  }

  // causal chain
  if (consequence.causalChain.length > 1) {
    console.log(`  ${theme.subheading('Impact chain:')}`);
    const chainStr = formatCausalChain(consequence.causalChain);
    for (const line of chainStr.split('\n')) {
      console.log(`  ${theme.accent(line)}`);
    }
    console.log('');
  }

  // verification steps
  if (consequence.verificationSteps.length > 0) {
    console.log(`  ${theme.subheading('What to verify:')}`);
    for (const step of consequence.verificationSteps) {
      console.log(`  ${theme.muted('□')} ${step}`);
    }
    console.log('');
  }

  // confidence breakdown
  if (consequence.confidence.assumptions.length > 0) {
    console.log(`  ${theme.subheading('Assumptions:')}`);
    for (const a of consequence.confidence.assumptions) {
      console.log(`  ${theme.dim('·')} ${theme.dim(a)}`);
    }
    console.log('');
  }

  if (consequence.confidence.missingData.length > 0) {
    console.log(`  ${theme.subheading('Missing data:')}`);
    for (const d of consequence.confidence.missingData) {
      console.log(`  ${theme.dim('·')} ${theme.dim(d)}`);
    }
    console.log('');
  }

  console.log(theme.heading(`  └─`));
  console.log('');
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > width) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines;
}
