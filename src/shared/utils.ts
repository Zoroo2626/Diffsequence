import * as path from 'node:path';
import { randomBytes } from 'node:crypto';

export function generateId(): string {
  return randomBytes(6).toString('hex');
}

export function relativePath(from: string, to: string): string {
  const rel = path.relative(from, to).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

export function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
}

export function isTestFile(filePath: string): boolean {
  const name = path.basename(filePath).toLowerCase();
  const dir = filePath.toLowerCase();

  return (
    name.includes('.test.') ||
    name.includes('.spec.') ||
    name.includes('__tests__') ||
    dir.includes('/__tests__/') ||
    dir.includes('\\__tests__\\') ||
    dir.includes('/test/') ||
    dir.includes('\\test\\')
  );
}

export function isConfigFile(filePath: string): boolean {
  const name = path.basename(filePath).toLowerCase();
  const configPatterns = [
    'package.json',
    'tsconfig',
    '.eslintrc',
    '.prettierrc',
    'babel.config',
    '.babelrc',
    'webpack.config',
    'vite.config',
    'rollup.config',
    'jest.config',
    'vitest.config',
    '.env',
    'docker',
    'Dockerfile',
    '.github',
    '.gitignore',
  ];

  return configPatterns.some((p) => name.includes(p));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? singular + 's'}`;
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}
