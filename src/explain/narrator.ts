import type { Consequence } from '../shared/types.js';

export function generateExplanations(consequences: Consequence[]): Consequence[] {
  return consequences.map((c) => ({
    ...c,
    reasoning: buildReasoning(c),
  }));
}

function buildReasoning(c: Consequence): string {
  const parts: string[] = [];

  // start with what happened
  switch (c.type) {
    case 'direct_impact':
      parts.push(
        `${basename(c.affectedFile)} directly depends on ${basename(c.sourceFile)}.`
      );
      if (c.sourceSymbol) {
        parts.push(
          `Specifically, it uses ${c.sourceSymbol}, which was modified in this change.`
        );
      }
      parts.push(
        `When a dependency changes, there's a real chance the consumer's behavior shifts too, even if the API surface looks the same.`
      );
      break;

    case 'indirect_impact':
      parts.push(
        `${basename(c.affectedFile)} doesn't import from ${basename(c.sourceFile)} directly, but it depends on something that does.`
      );
      if (c.causalChain.length > 2) {
        const chainStr = c.causalChain.map((s) => basename(s.file)).join(' → ');
        parts.push(`The dependency chain goes: ${chainStr}.`);
      }
      parts.push(`Indirect effects are harder to spot in review, which is exactly why they're worth flagging.`);
      break;

    case 'behavior_change':
      parts.push(
        `A type or interface was modified in ${basename(c.sourceFile)}, and ${basename(c.affectedFile)} relies on that type.`
      );
      parts.push(
        `If the shape of the type changed (new required fields, removed properties, narrowed unions), callers might need updates too.`
      );
      break;

    case 'test_coverage_gap':
      parts.push(
        `${basename(c.affectedFile)} was modified, but there's no test file that imports from it or matches its naming pattern.`
      );
      parts.push(
        `Without tests covering these changes, there's no automated way to catch regressions here.`
      );
      break;

    case 'deployment_risk':
      parts.push(
        `A configuration or infrastructure file was changed. These files tend to have broad, sometimes invisible effects.`
      );
      parts.push(
        `The impact might not show up until deployment, which makes this worth extra scrutiny.`
      );
      break;

    case 'reliability_risk':
      parts.push(
        `This change touches error handling or reliability related code. If something goes wrong here, the failure mode could be worse than the original bug.`
      );
      break;

    case 'performance_impact':
      parts.push(
        `This change involves performance sensitive code. Modifications to caching, batching, or throttling logic can have outsized effects on system performance.`
      );
      break;

    default:
      parts.push(
        `This was flagged because of a dependency relationship between the changed file and this one.`
      );
  }

  return parts.join(' ');
}

function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}
