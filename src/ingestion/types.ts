export type ChangeType = 'added' | 'removed' | 'modified' | 'renamed';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  changes: LineChange[];
}

export interface LineChange {
  type: 'add' | 'del' | 'context';
  lineNumber: number;
  content: string;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  changeType: ChangeType;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export interface ParsedDiff {
  files: DiffFile[];
  raw: string;
}

export interface NormalizedChange {
  filePath: string;
  changeType: ChangeType;
  addedLines: number[];
  removedLines: number[];
  modifiedSymbols: string[];
  rawHunks: DiffHunk[];
}
