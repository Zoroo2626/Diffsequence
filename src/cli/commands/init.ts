import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDefaultConfig } from '../../shared/config.js';
import { theme } from '../render/theme.js';

export async function initCommand() {
  const configPath = path.join(process.cwd(), '.diffsequencerc.json');

  if (fs.existsSync(configPath)) {
    console.log(theme.muted('\n  .diffsequencerc.json already exists. Delete it first if you want to regenerate.\n'));
    return;
  }

  const config = getDefaultConfig();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  console.log(theme.success('\n  Created .diffsequencerc.json with default settings.\n'));
  console.log(theme.muted('  Edit it to customize ignored paths, risk thresholds, and output format.\n'));
}
