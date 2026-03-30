import type { Consequence, CausalStep } from '../shared/types.js';

export function formatCausalChain(chain: CausalStep[]): string {
  if (chain.length === 0) return '';

  const parts = chain.map((step, i) => {
    const file = basename(step.file);
    const symbol = step.symbol ? ` (${step.symbol})` : '';

    if (i === 0) {
      return `${file}${symbol} [${step.relationship}]`;
    }

    return `  → ${file}${symbol} [${step.relationship}]`;
  });

  return parts.join('\n');
}

export function formatCausalChainInline(chain: CausalStep[]): string {
  return chain.map((step) => {
    const name = basename(step.file);
    const symbol = step.symbol ? `.${step.symbol}` : '';
    return `${name}${symbol}`;
  }).join(' → ');
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
