import type { ParsedDiff, DiffFile } from './types.js';
import type { NormalizedChange } from './types.js';
import { normalizeFilePath } from '../shared/utils.js';

export function normalizeChanges(parsed: ParsedDiff): NormalizedChange[] {
  return parsed.files
    .filter((f) => !f.isBinary)
    .map((file) => normalizeFile(file));
}

function normalizeFile(file: DiffFile): NormalizedChange {
  const addedLines: number[] = [];
  const removedLines: number[] = [];
  const modifiedSymbols: string[] = [];

  for (const hunk of file.hunks) {
    // the hunk header often contains a function/class name
    if (hunk.content) {
      const symbolMatch = hunk.content.match(
        /(?:function|class|const|let|var|export)\s+(\w+)/
      );
      if (symbolMatch && !modifiedSymbols.includes(symbolMatch[1])) {
        modifiedSymbols.push(symbolMatch[1]);
      }
    }

    for (const change of hunk.changes) {
      if (change.type === 'add') {
        addedLines.push(change.lineNumber);
        extractSymbolsFromLine(change.content, modifiedSymbols);
      } else if (change.type === 'del') {
        removedLines.push(change.lineNumber);
        extractSymbolsFromLine(change.content, modifiedSymbols);
      }
    }
  }

  return {
    filePath: normalizeFilePath(file.newPath),
    changeType: file.changeType,
    addedLines,
    removedLines,
    modifiedSymbols: [...new Set(modifiedSymbols)],
    rawHunks: file.hunks,
  };
}

function extractSymbolsFromLine(line: string, symbols: string[]) {
  // pick up function and class declarations from changed lines
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:export\s+)?class\s+(\w+)/,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)/,
    /(?:export\s+)?interface\s+(\w+)/,
    /(?:export\s+)?type\s+(\w+)/,
    /(?:export\s+)?enum\s+(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1] && !symbols.includes(match[1])) {
      symbols.push(match[1]);
    }
  }
}
