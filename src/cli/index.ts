#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { initCommand } from './commands/init.js';
import { reportCommand } from './commands/report.js';
import { isGitRepo } from '../ingestion/git.js';
import { setLogLevel } from '../shared/logger.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('diffsequence')
  .description('Consequence engine for code changes. Tells you what your diff will break.')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze the consequences of code changes')
  .option('--staged', 'Analyze staged changes')
  .option('--commit <hash>', 'Analyze a specific commit')
  .option('--branch <name>', 'Analyze diff against a branch (e.g. main)')
  .option('--format <type>', 'Output format: text or json', 'text')
  .option('--output <file>', 'Save output to a file')
  .option('--detail', 'Show detailed breakdown for each consequence')
  .option('--depth <n>', 'Maximum dependency chain depth to trace', parseInt)
  .option('--verbose', 'Enable debug logging')
  .action(async (options) => {
    if (options.verbose) setLogLevel('debug');
    await ensureGitRepo();
    await analyzeCommand(options);
  });

program
  .command('init')
  .description('Create a .diffsequencerc.json config file')
  .action(async () => {
    await initCommand();
  });

program
  .command('report')
  .description('Generate a standalone analysis report')
  .option('--commit <hash>', 'Analyze a specific commit')
  .option('--staged', 'Analyze staged changes')
  .option('--format <type>', 'Report format: markdown or json', 'markdown')
  .requiredOption('--output <file>', 'Output file path')
  .action(async (options) => {
    await ensureGitRepo();
    await reportCommand(options);
  });

// default to analyze if no subcommand given
program
  .argument('[unused...]', '')
  .action(async (_unused, options) => {
    const parentOpts = program.opts();
    if (parentOpts.verbose) setLogLevel('debug');
    await ensureGitRepo();
    await analyzeCommand({});
  });

async function ensureGitRepo() {
  const isRepo = await isGitRepo();
  if (!isRepo) {
    console.error(chalk.red('\n  This is not a git repository. Run this from inside a git repo.\n'));
    process.exit(1);
  }
}

program.parse();
