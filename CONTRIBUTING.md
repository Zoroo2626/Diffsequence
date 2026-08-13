# Contributing to Diffsequence

Thanks for wanting to contribute. Here's everything you need to know to get started.

## Setting Up Your Dev Environment

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/Zoroo2626/Diffsequence.git
cd Diffsequence
npm install
```

2. Build the project:

```bash
npm run build
```

3. Run from source using tsx (no build step needed):

```bash
npm run dev
```

## Making Changes

Write your code in TypeScript. The source lives in `src/`, organized by module.

A few things to keep in mind:

Keep functions small and focused. If a function does too many things, split it up.

Name things clearly. If someone reads your variable name and has to look at the context to understand it, the name isn't good enough.

Skip the clever abstractions. If the straightforward approach works, use it.

Error handling matters. Don't let exceptions escape silently. Catch what you can, log what you can't, and make sure the user always gets a useful message.

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

If you're adding a new feature, add tests for it. If you're fixing a bug, add a test that would have caught it.

## Code Style

We use TypeScript strict mode. If the compiler complains, fix it.

Keep imports organized: Node builtins first, then external packages, then internal modules.

Use `const` by default. Use `let` when you need to reassign. Never use `var`.

Prefer `async/await` over raw promises.

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Make sure `npm run build` passes with zero errors
4. Make sure `npm test` passes
5. Write a clear description of what changed and why
6. Open the PR

## Reporting Bugs

Open an issue with:

What you expected to happen, what actually happened, and the smallest set of steps to reproduce it. Include the output of `diffsequence analyze --verbose` if relevant.

## Feature Requests

Open an issue describing the use case. What problem does the feature solve? What would the ideal behavior look like?

Don't be shy about half formed ideas. Sometimes the best features start as vague "wouldn't it be nice if..." conversations.

## Code of Conduct

Be kind. Be constructive. Assume good intent. That's really it.
