# Quickbase MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [Quickbase JSON REST API](https://developer.quickbase.com/). It lets Claude, Cursor and other MCP clients work with Quickbase apps, tables, fields, records, relationships, reports, files and code pages.

> **v2.0.0** is a ground-up rewrite (official MCP SDK, zod schemas, one small REST client with retries). Every v1 tool name still exists; see [Migrating from v1](#migrating-from-v1) for the behavior changes.

## Requirements

- Node.js **22.12 or newer**
- A Quickbase realm hostname (for example `mycompany.quickbase.com`)
- A Quickbase [user token](https://help.quickbase.com/docs/create-and-manage-user-tokens) with access to the apps you want to use

## Install and build

```bash
git clone https://github.com/mark-zellner/QuickBase-MCP-Server.git
cd QuickBase-MCP-Server
npm ci
npm run build
```

## Configuration

Configuration comes **only from environment variables** (the server does not load `.env` files itself; put the values in your MCP client's `env` block). See [`.env.example`](.env.example).

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `QB_REALM` | yes | | Realm hostname, e.g. `mycompany.quickbase.com` |
| `QB_USER_TOKEN` | yes | | Quickbase user token |
| `QB_APP_ID` | no | | Default app (DBID) for tools that take `appId` |
| `QB_DEFAULT_TIMEOUT` | no | `30000` | Per-request timeout (ms) |
| `QB_MAX_RETRIES` | no | `3` | Retries for 429 and transient failures (0 to 10) |
| `QB_READ_ONLY` | no | `false` | `true` registers read-only tools only |
| `CODEPAGE_TABLE_ID` | no | | Table that stores code pages |
| `CODEPAGE_VERSION_TABLE_ID` | no | | Table that stores code page versions |
| `QB_WORKSPACE_DIR` | no | working dir | `deploy_codepage` may only read files under this directory |
| `QB_LOG_LEVEL` | no | `warn` | `error`, `warn`, `info` or `debug`. Logs go to stderr |

Never commit a real token. The server redacts the token from logs and error messages.

## Use with an MCP client

### Claude Desktop / Claude Code (`claude_desktop_config.json` or `.mcp.json`)

```json
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["/absolute/path/to/QuickBase-MCP-Server/dist/index.js"],
      "env": {
        "QB_REALM": "mycompany.quickbase.com",
        "QB_USER_TOKEN": "your_user_token_here",
        "QB_APP_ID": "bxxxxxxxx"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["/absolute/path/to/QuickBase-MCP-Server/dist/index.js"],
      "env": {
        "QB_REALM": "mycompany.quickbase.com",
        "QB_USER_TOKEN": "your_user_token_here",
        "QB_READ_ONLY": "true"
      }
    }
  }
}
```

Start with `QB_READ_ONLY=true` until you trust the agent with writes. After connecting, ask the agent to run `quickbase_test_connection`.

## Design

```
src/
  index.ts            stdio entry point (stdout is the protocol; logs go to stderr)
  server.ts           registers tools with the MCP SDK, maps errors to tool results
  config.ts           env parsing and validation (zod)
  errors.ts           typed errors and human-readable messages
  quickbase/
    client.ts         the only HTTP client: headers, timeout, retry/backoff, error mapping
    query.ts          safe where-clause builders
    records.ts        query / chunked upsert / delete helpers
    pages.ts          legacy XML API for code pages (+ workspace-confined file reads)
    codepages.ts      code-page-as-records conventions and static validation
  tools/              one module per group: apps, tables, fields, records,
                      relationships, reports, files, auth, pages, codepages
```

- **One REST client.** Base `https://api.quickbase.com/v1` with `QB-Realm-Hostname`, `Authorization: QB-USER-TOKEN …` and `User-Agent`. Timeouts use `AbortSignal`.
- **Retries.** `429` is always retried and honors `Retry-After`. `5xx` and network errors are retried only for idempotent calls (GET, PUT, DELETE and `records/query`), so a flaky connection can never duplicate records. Exponential backoff with jitter, capped at 30 s.
- **Errors.** Quickbase errors become tool errors (`isError: true`) with the status, message, `qb-api-ray` id and a hint. A bad call never crashes the server.
- **Validation.** Every tool has a zod input schema. Ids are validated before they reach a URL, and `where` values are escaped.
- **Safety.** Destructive schema tools (`delete_table`, `delete_field`) require `confirm: true`. `bulk_delete_records` refuses an empty `where`. Writes are chunked (500 records per request) and a failure partway through reports exactly what was already written.

## Tools

Tool names are unchanged from v1. In `QB_READ_ONLY=true` mode only the **read** tools are registered.

| Tool | Kind | Description |
| --- | --- | --- |
| `quickbase_get_app_info` | read | Get information about a Quickbase application (name, dates, settings). |
| `quickbase_test_connection` | read | Verify the realm and user token by listing the tables of the app. |
| `quickbase_get_tables` | read | List all tables in the application. |
| `quickbase_create_table` | write | Create a new table in the application. |
| `quickbase_get_table_info` | read | Get detailed information about a table (key field, record name, etc.). |
| `quickbase_delete_table` | destructive | Permanently delete a table and ALL its records. |
| `quickbase_get_table_fields` | read | Get all fields of a table (id, label, type, mode, properties). |
| `quickbase_create_field` | write | Create a field. |
| `quickbase_update_field` | write | Update a field’s label, required flag or choices. |
| `quickbase_delete_field` | destructive | Permanently delete a field and its data. |
| `quickbase_query_records` | read | Query records with optional field selection, filter, sorting and paging. |
| `quickbase_get_record` | read | Get one record by ID. |
| `quickbase_create_record` | write | Create one record. |
| `quickbase_update_record` | write | Update one record by ID. |
| `quickbase_delete_record` | destructive | Delete one record by ID. |
| `quickbase_bulk_create_records` | write | Create many records (max 5000 per call; sent in chunks of 500). |
| `quickbase_bulk_update_records` | write | Update many records by ID (max 5000 per call). |
| `quickbase_upsert_records` | write | Insert or update records matched on a key field (mergeFieldId). |
| `quickbase_bulk_delete_records` | destructive | Delete all records matching a Quickbase query. |
| `quickbase_search_records` | read | Find records whose text fields contain a term. |
| `quickbase_create_relationship` | write | Create a parent-child relationship. |
| `quickbase_get_relationships` | read | List the relationships in which the table is the child (the table holding the reference fields). |
| `quickbase_create_advanced_relationship` | write | Create a one-to-many relationship with a labelled reference field and labelled lookup fields in one step. |
| `quickbase_create_lookup_field` | write | Add a lookup field to the child table that pulls a parent field through an existing reference field. |
| `quickbase_validate_relationship` | read | Check that a reference field exists in the child table and points at the given parent table. |
| `quickbase_get_relationship_details` | read | List relationships of a table with their lookup fields resolved (labels and types) when includeFields is true. |
| `quickbase_create_junction_table` | write | Create a junction table for a many-to-many relationship: a new table with a reference field to each of two tables. |
| `quickbase_get_reports` | read | List all reports of a table. |
| `quickbase_get_report` | read | Get the definition (query, columns, sorting) of one report. |
| `quickbase_run_report` | read | Run a report and return its records ({data, fields, metadata}). |
| `quickbase_list_files` | read | List all stored versions of the file in a file-attachment field of a record. |
| `quickbase_download_file` | read | Download a file as base64. |
| `quickbase_upload_file` | write | Upload a base64-encoded file into a file-attachment field of an existing record (adds a new version). |
| `quickbase_delete_file` | destructive | Delete one version of a file in a file-attachment field. |
| `quickbase_save_codepage` | write | Save a codepage (name + code) as a new record in the codepage table. |
| `quickbase_deploy_codepage` | write | Save a codepage with metadata (version, tags, dependencies, target table). |
| `quickbase_get_codepage` | read | Get a codepage record (parsed: name, code, version, tags, …). |
| `quickbase_list_codepages` | read | List codepages. |
| `quickbase_search_codepages` | read | Search codepages by name/description text, tags, target table or active status. |
| `quickbase_update_codepage` | write | Update a codepage’s code, description, version or active flag. |
| `quickbase_clone_codepage` | write | Clone a codepage under a new name. |
| `quickbase_validate_codepage` | read | Static checks on HTML/JS: tag balance, <script> syntax (compiled, never executed), Quickbase API usage and security smells. |
| `quickbase_export_codepage` | read | Export a codepage as html (code only), json (all fields) or markdown. |
| `quickbase_import_codepage` | write | Import a codepage from an HTML document or a JSON export. |
| `quickbase_execute_codepage` | read | Does NOT execute anything. |
| `quickbase_save_codepage_version` | write | Store a version snapshot of a codepage in the version table (fields: 6 codepage record ID, 7 version, 8 code, 9 change log). |
| `quickbase_get_codepage_versions` | read | Version history of a codepage, newest first. |
| `quickbase_rollback_codepage` | write | Restore a codepage’s code from a version record. |
| `deploy_codepage` | write | Create or replace a Quickbase code page from a local file. |
| `get_codepage` | read | Fetch the stored content of a Quickbase code page by numeric ID or by name. |
| `quickbase_initiate_oauth` | read | Build a Quickbase OAuth 2.0 authorization URL with PKCE (S256). |

### Code pages

Two mechanisms exist:

1. **Real Quickbase code pages** (the `/db/<app>?a=API_AddReplaceDBPage` XML API): `deploy_codepage` and `get_codepage`. Deploy from the CLI too:

   ```bash
   QB_REALM=… QB_USER_TOKEN=… QB_APP_ID=… \
     node dist/cli/deploy.js ./pages/index.html --name=index.html --type=1
   ```

   The source file must be inside `QB_WORKSPACE_DIR` (default: the working directory). Paths that escape it, including through symlinks, are rejected.

2. **Code pages stored as records** (the `quickbase_*_codepage*` tools): a code library inside your own app, with version history, search, import/export and static validation. Create two tables and set `CODEPAGE_TABLE_ID` / `CODEPAGE_VERSION_TABLE_ID`.

   | Code page table field | ID | Version table field | ID |
   | --- | --- | --- | --- |
   | name | 8 | created | 1 |
   | version | 9 | codepage record id | 6 |
   | tags | 10 | version | 7 |
   | target table id | 11 | code | 8 |
   | active | 12 | change log | 9 |
   | code | 13 | | |
   | description | 14 | | |
   | dependencies | 15 | | |

   `quickbase_validate_codepage` only **compiles** inline scripts (`vm.Script`); it never runs them. `quickbase_execute_codepage` does not execute code either; it returns the stored code for the client to run.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest, all HTTP mocked
npm run build       # compile to dist/
npm run check       # all of the above
```

Tests never touch the network. The previous live-API scripts are kept under `legacy/` for reference only.

## Migrating from v1

Tool names are the same. Behavior changes:

- Node **22.12+** required. `dotenv`, `axios` and `jest` are gone. Config is env-only and `MCP_SERVER_NAME` / `MCP_SERVER_VERSION` are ignored.
- `quickbase_query_records` (and run_report) return `{ data, fields, metadata }` instead of a bare array.
- `quickbase_delete_table` and `quickbase_delete_field` need `confirm: true`.
- `quickbase_create_relationship` takes `foreignKeyFieldLabel` (Quickbase creates the reference field); `foreignKeyFieldId` is rejected with a message.
- `quickbase_create_advanced_relationship` rejects `many-to-many`; use `quickbase_create_junction_table`.
- `quickbase_create_field` rejects `lookup` / `reference` types (use the relationship tools) and maps legacy type names (for example `text_choice` becomes `text-multiple-choice`).
- Field and relationship endpoints that v1 called incorrectly now use the documented ones (for example `DELETE /fields?tableId=` with `fieldIds`).
- Code page list/search omit the `code` body unless `includeCode: true`. `quickbase_rollback_codepage` takes a `versionTableId`. Version history is ordered by field 1 (created).
- `get_codepage` and `quickbase_get_record` return parsed, flattened data.
- `deploy_codepage.sourcePath` is confined to `QB_WORKSPACE_DIR`.
- TLS verification is never disabled.
- `quickbase_initiate_oauth` builds a real PKCE (S256) URL and returns the verifier.
- New: `quickbase_get_report`, `QB_READ_ONLY`, `QB_MAX_RETRIES`.
- Old root docs and live scripts moved to `docs/archive/root/` and `legacy/`.

## Security note

An older revision of this repository contained a real user token in documentation and test files. It was removed in v2 but **remains in git history**. If you ever used that token, revoke it in Quickbase (My Preferences, Manage user tokens) and create a new one.

## License

MIT
