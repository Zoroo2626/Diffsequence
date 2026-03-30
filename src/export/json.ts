import type { AnalysisResult } from '../shared/types.js';

export function exportJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
