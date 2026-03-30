import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import type { FileType } from '../shared/types.js';
import { isSourceFile, isTestFile, isConfigFile } from '../shared/utils.js';
import type { DiffsequenceConfig } from '../shared/types.js';

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  type: FileType;
}

export async function scanRepository(
  rootPath: string,
  config: DiffsequenceConfig
): Promise<ScannedFile[]> {
  const ignorePatterns = config.ignore.map((p) => {
    if (p.includes('/') || p.includes('*')) return p;
    return `**/${p}/**`;
  });

  const matches = await glob('**/*.{js,jsx,ts,tsx,mjs,cjs}', {
    cwd: rootPath,
    ignore: ignorePatterns,
    absolute: false,
    nodir: true,
  });

  const files: ScannedFile[] = [];

  for (const relativePath of matches) {
    const absolutePath = path.resolve(rootPath, relativePath);

    if (!fs.existsSync(absolutePath)) continue;

    files.push({
      absolutePath,
      relativePath: relativePath.replace(/\\/g, '/'),
      type: classifyFile(relativePath),
    });
  }

  return files;
}

function classifyFile(filePath: string): FileType {
  if (isTestFile(filePath)) return 'test';
  if (isConfigFile(filePath)) return 'config';
  if (isSourceFile(filePath)) return 'source';

  const ext = path.extname(filePath).toLowerCase();
  if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) return 'docs';
  if (['.png', '.jpg', '.svg', '.ico', '.gif'].includes(ext)) return 'asset';

  return 'other';
}
