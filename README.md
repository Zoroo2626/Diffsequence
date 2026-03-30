# Diffsequence

Diffsequence looks at your code changes and tells you what they're going to break.

Not what changed. Not a summary. Not a commit message.

It traces your diff through the dependency graph, finds every file that depends on what you touched, and tells you what's at risk, how confident it is about that risk, and what you should go verify before you merge.

Think of it like a senior engineer looking over your PR and saying "hey, you changed the auth helper, but did you realize the payment flow also calls that function on line 47?"

That's what this does. Automatically.

## Why This Exists

Code review tools show you the diff. That's the easy part. The hard part is understanding what the diff will *do* to the rest of the system.

If you've ever merged a "small" change and then spent the afternoon figuring out why something unrelated broke, you already know the problem.

Diffsequence maps the consequences of your changes before they become production incidents.

## What It Actually Does

You run it in a git repo. It looks at your staged changes (or a specific commit, or a branch diff), and then:

1. Parses the diff to figure out exactly what changed, down to individual functions and symbols
2. Scans your entire codebase and builds a dependency graph (who imports what, who calls what)
3. Walks that graph to find every file that could be affected by your changes
4. Scores each consequence by risk level, based on things like how many consumers the changed file has, whether tests exist, and how deep the dependency chain goes
5. Explains each consequence in plain language, including the reasoning behind the flag and what you should go check

The output looks something like this:

```
╭──────────────────────────────────────────────────────╮
│                                                      │
│   DIFFSEQUENCE                                       │
│   Consequence analysis complete                      │
│                                                      │
│   3 files changed  ·  7 consequences found  ·  142ms │
│                                                      │
│   ● 1 critical                                       │
│   ● 2 high                                           │
│   ● 3 medium                                         │
│   ● 1 low                                            │
│                                                      │
│   This change has critical consequences that need    │
│   careful review before merging.                     │
│                                                      │
╰──────────────────────────────────────────────────────╯

  CONSEQUENCES
  Ranked by risk score, highest first

   1. ●  DIRECT  getUserProfile() is called in PaymentService.ts at line 47
      src/services/PaymentService.ts ← src/auth/AuthHelper.ts
      Risk: 82/100  91% confidence
      The function getUserProfile was modified and is called in this file...

   2. ●  UNTESTED  AuthHelper.ts has no associated tests
      src/auth/AuthHelper.ts
      Risk: 68/100  65% confidence
      This file was modified but no matching test file could be found...
```

## Getting Started

### Install

```bash
npm install -g diffsequence
```

Or run it directly:

```bash
npx diffsequence
```

### Basic Usage

From inside any git repository:

```bash
# analyze staged changes (default)
diffsequence analyze

# analyze a specific commit
diffsequence analyze --commit abc1234

# analyze current branch against main
diffsequence analyze --branch main

# get JSON output for scripts/CI
diffsequence analyze --format json

# save a markdown report
diffsequence analyze --output report.md

# see full details for every consequence
diffsequence analyze --detail
```

### Configuration

Generate a config file:

```bash
diffsequence init
```

This creates `.diffsequencerc.json` where you can customize ignored paths, risk thresholds, and output preferences.

## How the Analysis Works

The analysis runs in five stages, each building on the previous one.

**Ingestion** takes a raw git diff and breaks it into structured data: which files changed, which lines were added or removed, and which symbols (functions, classes, types) were touched.

**Repository scanning** walks your codebase and uses Babel to parse every source file. It extracts all imports, exports, function declarations, class definitions, and type annotations. This gives us a complete map of who depends on who.

**Impact tracing** is the core of the analysis. It runs four tracers in parallel:

The import tracer walks the dependency graph outward from each changed file. If you changed file A, and B imports from A, and C imports from B, then B is a direct impact and C is an indirect impact.

The call site tracer goes deeper. If you modified a function called `validateToken`, it finds every file that actually calls `validateToken()` and flags each call site with the exact line number.

The type tracer watches for changes to exported types, interfaces, and enums. If you changed the shape of a type, every file using that type gets flagged.

The config tracer catches changes to package.json, tsconfig, environment files, Docker configs, and other infrastructure files that have broad, often invisible effects.

**Risk scoring** assigns a 0 to 100 score to each consequence based on: how many files consume the changed module, how deep the dependency chain goes, whether the affected file has tests, and whether the source file is in a "shared" or "core" directory.

**Explanation** turns each consequence into a human readable paragraph: what happened, why it matters, and what you should go check.

## Language Support

Currently supports JavaScript and TypeScript, including:

JSX and TSX, ES modules and CommonJS, TypeScript path aliases, decorator syntax, and dynamic imports.

Python and Go support are planned for future versions.

## Commands

| Command | What it does |
|---------|------------|
| `diffsequence analyze` | Run consequence analysis on your changes |
| `diffsequence init` | Create a configuration file |
| `diffsequence report --output file.md` | Generate a standalone report |

### Analyze Options

| Flag | What it does |
|------|------------|
| `--staged` | Only analyze staged changes |
| `--commit <hash>` | Analyze a specific commit |
| `--branch <name>` | Analyze diff against a branch |
| `--format <text\|json>` | Output format |
| `--output <file>` | Save results to a file |
| `--detail` | Show expanded view for each consequence |
| `--depth <n>` | Max dependency chain depth (default: 5) |
| `--verbose` | Show debug output |

## Consequence Types

Every flagged consequence gets classified into one of these categories:

| Type | What it means |
|------|-------------|
| Direct Impact | The affected file directly imports from the changed file |
| Indirect Impact | The affected file depends on something that depends on the changed file |
| Behavior Change | A type or interface was modified, affecting downstream consumers |
| Test Coverage Gap | A changed file has no corresponding tests |
| Deployment Risk | A config or infrastructure file was changed |
| Reliability Risk | Error handling or fault tolerance code was touched |
| Performance Impact | Caching, throttling, or batching logic was modified |

## Confidence Scores

Every consequence comes with a confidence score from 0% to 100%. This tells you how sure the tool is about the connection.

High confidence (80%+) means there's a clear, static link: a direct import, a function call at a known line number.

Medium confidence (50 to 80%) means the connection is real but the severity depends on runtime behavior we can't see from static analysis alone.

Lower confidence means the tool is inferring the connection from patterns rather than explicit code relationships.

Each consequence also lists its assumptions and what data is missing, so you can make your own judgment call.

## Project Structure

```
src/
├── cli/              Entry point and terminal rendering
├── ingestion/        Diff parsing and git operations
├── repo/             Repository scanning and dependency graph
├── analysis/         Impact tracers and classification
├── risk/             Risk scoring and coverage detection
├── explain/          Human readable explanations
├── export/           Markdown and JSON report generation
└── shared/           Types, config, logging, utilities
```

## Limitations

A few things to be upfront about:

This is static analysis. It can't know what happens at runtime, so dynamic dispatch, runtime dependency injection, and eval'd code paths are invisible to it.

It currently only supports JavaScript and TypeScript. Other languages will come later.

It doesn't read your test files to understand *what* they test, only *whether* they exist. A test file that imports from the changed module is considered "coverage," even if the test doesn't exercise the specific function that changed.

The dependency graph is rebuilt on each run. For very large repos (thousands of files), the initial scan might take a few seconds. Caching support is built in but not yet optimized for incremental updates.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT
