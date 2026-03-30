import chalk from 'chalk';

export const theme = {
  // risk level colors
  risk: {
    critical: chalk.redBright,
    high: chalk.hex('#FF8C00'),
    medium: chalk.yellow,
    low: chalk.green,
  },

  // risk icons
  riskIcon: {
    critical: '●',
    high: '●',
    medium: '●',
    low: '●',
  },

  // type badges
  typeBadge: {
    direct_impact: chalk.bgBlue.white(' DIRECT '),
    indirect_impact: chalk.bgCyan.white(' INDIRECT '),
    latent_risk: chalk.bgMagenta.white(' LATENT '),
    performance_impact: chalk.bgYellow.black(' PERF '),
    reliability_risk: chalk.bgRed.white(' RELIABILITY '),
    test_coverage_gap: chalk.bgHex('#FF6347').white(' UNTESTED '),
    behavior_change: chalk.bgHex('#FF8C00').white(' BEHAVIOR '),
    documentation_drift: chalk.bgGray.white(' DOCS '),
    deployment_risk: chalk.bgHex('#8B0000').white(' DEPLOY '),
  },

  // general
  heading: chalk.bold.white,
  subheading: chalk.bold.gray,
  accent: chalk.cyan,
  muted: chalk.gray,
  file: chalk.underline.cyan,
  symbol: chalk.yellow,
  success: chalk.green,
  error: chalk.red,
  dim: chalk.dim,

  // box characters
  box: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
} as const;

export function riskColor(level: string) {
  switch (level) {
    case 'critical': return theme.risk.critical;
    case 'high': return theme.risk.high;
    case 'medium': return theme.risk.medium;
    case 'low': return theme.risk.low;
    default: return theme.muted;
  }
}

export function riskIcon(level: string): string {
  const icon = theme.riskIcon[level as keyof typeof theme.riskIcon] ?? '○';
  return riskColor(level)(icon);
}

export function typeBadge(type: string): string {
  const badge = theme.typeBadge[type as keyof typeof theme.typeBadge];
  return badge ?? chalk.bgGray.white(` ${type.toUpperCase()} `);
}
