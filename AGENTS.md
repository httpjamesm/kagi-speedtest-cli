# AGENTS.md

This repository is a Bun-based TypeScript CLI tool for running network speed tests against Kagi's speedtest server.

## Build, Lint, and Test Commands

### Installation
```bash
bun install
```

### Running the Application
```bash
bun run index.ts
# or
bun index.ts
```

### Testing
```bash
# Run all tests
bun test

# Run a single test by name
bun test -t "test name pattern"

# Run tests in watch mode
bun test --watch
```

**Note:** This project currently has no test files. When adding tests, use Bun's built-in test framework (`bun:test`) rather than Jest or Vitest.

### TypeScript
```bash
# Type checking (Bun handles this automatically)
bun run index.ts  # TypeScript is transpiled on the fly

# If you need explicit type checking:
bun build --check
```

**No linting configured** - Consider adding ESLint or using Bun's built-in linter if needed.

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled
- Target: ESNext
- Module system: ES modules (Preserve)
- `noImplicitOverride`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch` enabled

### Imports
- Use ES6 import/export syntax
- Relative imports with `./` for local files
- Type imports: `import type { TypeName } from './path'`
- Example:
```ts
import { runDownloadTest } from './speedtest';
import type { ProgressCallback } from './types';
```

### Naming Conventions
- **Variables/Functions:** `camelCase` - `downloadSpeed`, `runUploadTest`
- **Constants:** `UPPER_SNAKE_CASE` - `MEGABIT`, `DEFAULT_SERVER_URL`
- **Types/Interfaces:** `PascalCase` - `SpeedtestResult`, `ProgressCallback`
- **Private/internal:** No underscore prefix needed, just use const/let appropriately

### Formatting
- **Indentation:** 2 spaces
- **Semicolons:** Required
- **Quotes:** Single quotes for strings
- **Line length:** Keep reasonable, typically under 100 characters

### Error Handling
- Always use try/catch for async operations
- Use `instanceof Error` for type narrowing:
```ts
if (error instanceof Error && error.name === 'AbortError') {
  throw new Error('Download test aborted');
}
```
- Use AbortSignal for cancellable operations:
```ts
const abortController = new AbortController();
await fetch(url, { signal: abortController.signal });
```
- Process exit codes: 0 for success, 1 for errors

### Async Patterns
- Use async/await consistently (no Promise chains)
- Track performance with `performance.now()` for timing
- Stream responses using ReadableStream API:
```ts
const reader = response.body?.getReader();
const { done, value } = await reader.read();
```

### CLI Output
- Live updates: `process.stdout.write('\r' + content)` (with \r for carriage return)
- Final output: `console.log()` (adds newline)
- Errors: `console.error()`
- Clear lines: `process.stdout.write('\r' + ' '.repeat(width) + '\r')`

### File Organization
- **index.ts** - Entry point, argument parsing, main orchestration
- **speedtest.ts** - Worker thread orchestration, exports for main thread
- **worker.ts** - Worker message handler, dispatches to test implementations
- **speedtest-worker.ts** - Core speed test logic (download/upload/ping/jitter)
- **display.ts** - All UI/output functions
- **types.ts** - TypeScript type definitions and interfaces

### Worker Architecture
- Tests run in Worker threads to avoid blocking the main process
- Use Bun's Worker API with message passing
- Worker messages: `{ type: 'runDownloadTest' | 'runUploadTest' | 'runPingJitterTest' | 'abort', baseURL?: string }`
- Worker responses: `{ type: 'progress' | 'complete' | 'error', ...data }`
- Each test gets its own AbortController for cancellation

### Function Structure
- Pure functions for calculations (e.g., `calcBandwidth`)
- Async functions for network operations
- Export functions that will be used by other modules
- Keep functions focused and single-purpose

### Type Definitions
- Define interfaces for data structures in types.ts
- Use type aliases for function signatures:
```ts
export type ProgressCallback = (value: number, phase: string, elapsed: number, total: number) => void;
```

## Bun-Specific Guidelines (from .cursor/rules)

### Runtime & APIs
- Use `bun test` instead of Jest/Vitest
- Use `bun install` instead of npm/pnpm/yarn
- Use `Bun.file()` instead of `node:fs` readFile/writeFile
- Use `Bun.serve()` instead of Express
- Use `bun:sqlite` instead of better-sqlite3
- Use `Bun.sql` instead of pg
- Use built-in `WebSocket` instead of ws package
- Bun automatically loads .env files - no dotenv needed
- For TCP ping: `import('net')` for socket operations

### Testing Pattern
```ts
import { test, expect } from "bun:test";

test("feature description", () => {
  expect(result).toBe(expected);
});
```

## Important Notes

- No bundler/build step needed - Bun transpiles on the fly
- Signal handling: Register `SIGINT` handler for graceful shutdown
- Use `const` by default, `let` only when reassignment needed
- Export functions with `export function` for clarity
- Keep index.ts as the main CLI entry point with `process.argv` parsing
- Ping/jitter uses TCP handshake timing (not ICMP), measures network latency more accurately than HTTP
