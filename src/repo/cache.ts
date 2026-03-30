import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { logger } from '../shared/logger.js';

const CACHE_DIR = '.diffsequence-cache';

interface CacheEntry {
  hash: string;
  data: unknown;
}

export function getCachePath(rootPath: string): string {
  return path.join(rootPath, CACHE_DIR);
}

export function writeCache(rootPath: string, key: string, data: unknown): void {
  try {
    const cacheDir = getCachePath(rootPath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filePath = path.join(cacheDir, `${key}.json`);
    const hash = hashData(JSON.stringify(data));
    const entry: CacheEntry = { hash, data };

    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
    logger.debug(`Cache written: ${key}`);
  } catch {
    // caching is best-effort
    logger.debug(`Failed to write cache: ${key}`);
  }
}

export function readCache<T>(rootPath: string, key: string): T | null {
  try {
    const filePath = path.join(getCachePath(rootPath), `${key}.json`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw) as CacheEntry;
    return entry.data as T;
  } catch {
    return null;
  }
}

export function clearCache(rootPath: string): void {
  const cacheDir = getCachePath(rootPath);
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true });
    logger.debug('Cache cleared');
  }
}

function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}
