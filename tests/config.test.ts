import { describe, it, expect } from 'vitest';
import { getDefaultConfig, loadConfig } from '../src/shared/config.js';

describe('Diffsequence Config', () => {
  it('returns default configuration with expected structure', () => {
    const config = getDefaultConfig();
    expect(config).toBeDefined();
    expect(Array.isArray(config.ignore)).toBe(true);
    expect(config.riskThresholds).toBeDefined();
    expect(config.riskThresholds.critical).toBe(85);
    expect(config.maxDepth).toBe(5);
    expect(config.includeTests).toBe(true);
    expect(config.outputFormat).toBe('text');
  });

  it('loads configuration safely from a non-existent path without throwing', async () => {
    const config = await loadConfig('/non/existent/path');
    expect(config).toBeDefined();
    expect(config.maxDepth).toBe(5);
  });
});
