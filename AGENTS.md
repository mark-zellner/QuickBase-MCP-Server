# Quickbase MCP Server: agent instructions

TypeScript MCP server (stdio) for the Quickbase JSON REST API. Read `README.md` for usage; this file is for agents changing the code.

## Commands

- `npm ci` then `npm run check` (typecheck, lint, tests, build). All must pass before you commit.
- Node 22.12+ (Vitest 5). TypeScript is pinned to 6.0.x because typescript-eslint's peer range requires it.
- Tests are fully mocked. Never call the live Quickbase API from tests and never commit a real token.

## Layout

- `src/index.ts`: stdio entry. **stdout is the MCP protocol.** Never `console.log`; use `src/logger.ts` (stderr). ESLint enforces `no-console`.
- `src/server.ts`: `createServer(config, client?)` registers every tool from `src/tools/index.ts` (`selectTools(readOnly)`), converts thrown errors into `isError` tool results via `describeError`.
- `src/config.ts`: env parsing (zod). Config is env-only.
- `src/quickbase/client.ts`: the single HTTP client (headers, timeout, retry, error mapping, XML API helper). `fetch` and `sleep` are injectable for tests.
- `src/quickbase/*`: helpers (query escaping, record chunking, code page conventions, XML pages).
- `src/tools/<group>.ts`: tools built with `defineTool({ name, title, description, inputSchema, write, destructive?, idempotent?, handler })`.
- `tests/helpers.ts`: `mockFetch` and `connect()` (in-memory MCP client + server). Use it for new tool tests.

## Rules for new or changed tools

1. Define a zod input schema using the shared pieces in `src/tools/schemas.ts` (`tableId`, `fieldId`, `fieldValues`, …). Ids must be validated before being placed in a URL.
2. Mark `write: true` for anything that changes Quickbase or disk (hidden in `QB_READ_ONLY`). Mark `destructive: true` for deletes/overwrites, and require `confirm: true` for schema deletes.
3. Escape user text in `where` clauses with `src/quickbase/query.ts`; never concatenate raw input.
4. Retries: only idempotent requests are retried on 5xx/network errors. A POST that creates data must not be retried (pass `idempotent: true` only for read-style POSTs such as `records/query`).
5. Never log or return the token. `registerSecret` and `redact` in `logger.ts` handle logs; error messages go through `describeError`.
6. Keep existing tool names stable. If behavior changes, document it in README "Migrating" and `CHANGELOG.md`.
7. Add a test with `mockFetch` that asserts the exact request (path, query, body) and one failure case.

## Code page conventions

Record-based code pages use fixed field ids (see README). File deploys read only inside `QB_WORKSPACE_DIR`. `validate_codepage` compiles with `vm.Script` and must never execute user code.
