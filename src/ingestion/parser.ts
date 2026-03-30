import type { DiffFile, DiffHunk, LineChange, ParsedDiff } from './types.js';

export function parseDiff(raw: string): ParsedDiff {
  const files: DiffFile[] = [];
  const fileSections = splitIntoFileSections(raw);

  for (const section of fileSections) {
    const file = parseFileSection(section);
    if (file) files.push(file);
  }

  return { files, raw };
}

function splitIntoFileSections(raw: string): string[] {
  const sections: string[] = [];
  const lines = raw.split('\n');
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith('diff --git') && current.length > 0) {
      sections.push(current.join('\n'));
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join('\n'));
  }

  return sections;
}

function parseFileSection(section: string): DiffFile | null {
  const lines = section.split('\n');

  let oldPath = '';
  let newPath = '';
  let isBinary = false;
  let isRename = false;

  for (const line of lines) {
    if (line.startsWith('--- a/')) {
      oldPath = line.slice(6);
    } else if (line.startsWith('+++ b/')) {
      newPath = line.slice(6);
    } else if (line.startsWith('--- /dev/null')) {
      oldPath = '/dev/null';
    } else if (line.startsWith('+++ /dev/null')) {
      newPath = '/dev/null';
    } else if (line.startsWith('Binary files')) {
      isBinary = true;
    } else if (line.startsWith('rename from')) {
      isRename = true;
      oldPath = line.slice(12);
    } else if (line.startsWith('rename to')) {
      newPath = line.slice(10);
    }
  }

  // grab paths from the diff header if we didn't find them
  if (!oldPath && !newPath) {
    const headerMatch = lines[0]?.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (headerMatch) {
      oldPath = headerMatch[1];
      newPath = headerMatch[2];
    }
  }

  if (!oldPath && !newPath) return null;

  let changeType: DiffFile['changeType'] = 'modified';
  if (oldPath === '/dev/null') changeType = 'added';
  else if (newPath === '/dev/null') changeType = 'removed';
  else if (isRename) changeType = 'renamed';

  const hunks = isBinary ? [] : parseHunks(lines);

  return {
    oldPath: oldPath === '/dev/null' ? newPath : oldPath,
    newPath: newPath === '/dev/null' ? oldPath : newPath,
    changeType,
    hunks,
    isBinary,
  };
}

function parseHunks(lines: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let lineNumber = 0;

  for (const line of lines) {
    const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);

    if (hunkHeader) {
      if (currentHunk) hunks.push(currentHunk);

      currentHunk = {
        oldStart: parseInt(hunkHeader[1], 10),
        oldLines: parseInt(hunkHeader[2] ?? '1', 10),
        newStart: parseInt(hunkHeader[3], 10),
        newLines: parseInt(hunkHeader[4] ?? '1', 10),
        content: hunkHeader[5]?.trim() ?? '',
        changes: [],
      };
      lineNumber = currentHunk.newStart;
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+')) {
      const change: LineChange = { type: 'add', lineNumber, content: line.slice(1) };
      currentHunk.changes.push(change);
      lineNumber++;
    } else if (line.startsWith('-')) {
      const change: LineChange = { type: 'del', lineNumber, content: line.slice(1) };
      currentHunk.changes.push(change);
    } else if (line.startsWith(' ') || line === '') {
      const change: LineChange = { type: 'context', lineNumber, content: line.slice(1) };
      currentHunk.changes.push(change);
      lineNumber++;
    }
  }

  if (currentHunk) hunks.push(currentHunk);

  return hunks;
}
