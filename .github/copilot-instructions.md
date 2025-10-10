# Copilot Instructions for QuickBase MCP Server

## Architecture Overview

This project implements a Model Context Protocol (MCP) server that provides comprehensive access to QuickBase operations, enabling AI agents to manage applications, tables, fields, records, and relationships. The server acts as a bridge between MCP clients (like Claude Desktop) and the QuickBase REST API.

Key components:
- **MCP Server** (`src/index.ts`): Handles MCP protocol communication via stdio, routes tool calls to QuickBase operations.
- **QuickBase Client** (`src/quickbase/client.ts`): Axios-based wrapper for QuickBase API v1 endpoints with logging interceptors.
- **Tools** (`src/tools/index.ts`): Zod-validated tool definitions for all QuickBase operations.
- **Types** (`src/types/quickbase.ts`): TypeScript interfaces and Zod schemas for QuickBase data structures.

Data flows: MCP client → stdio transport → server tool handler → QuickBaseClient method → axios HTTP request → QuickBase API → JSON response back.

Structural decisions: Modular separation allows easy extension of QuickBase features without touching MCP protocol logic; Zod validation ensures type safety for tool parameters.

## Developer Workflows

- **Build**: `npm run build` compiles TypeScript to `dist/` with `--skipLibCheck`.
- **Run**: `npm start` launches the server for MCP clients.
- **Dev Mode**: `npm run dev` runs TypeScript watch and Node watch for live reloading.
- **Test**: `npm test` runs basic API test; `npm run test:jest` for Jest unit tests.
- **Setup**: `npm run setup` runs setup.js for initial configuration.

Commands not obvious: Use `npm run dev` for development to auto-rebuild and restart on changes.

## Project-Specific Conventions

- **Configuration**: Environment variables loaded via dotenv: `QB_REALM` (hostname), `QB_USER_TOKEN`, `QB_APP_ID`, with optional `QB_DEFAULT_TIMEOUT` and `QB_MAX_RETRIES`.
- **Table/Field IDs**: Use QuickBase's internal IDs (strings like "bu65pc8px" for tables, numbers for fields) instead of names.
- **Error Handling**: Try/catch in tool handlers, log errors to console, return MCP error responses.
- **API Calls**: All QuickBase requests use axios with interceptors for request/response logging.
- **Validation**: Zod schemas for tool parameters, e.g., `CreateFieldSchema` with enum for field types.
- **Response Format**: JSON.stringify results with 2-space indentation for readability.

Differs from common practices: QuickBase requires realm hostname in headers, uses QB-USER-TOKEN auth, and has complex field type enums.

## Integration Points

- **QuickBase API**: REST endpoints at `https://api.quickbase.com/v1/` for apps, tables, fields, records.
- **MCP Protocol**: Stdio transport for tool listing and calling; no network server.
- **External Dependencies**: `axios` for HTTP, `zod` for validation, `@modelcontextprotocol/sdk` for MCP.
- **MCP Clients**: Configured in client apps like Claude Desktop via JSON config files.

Cross-component communication: Server instantiates QuickBaseClient, tools reference client methods, types shared across modules.

Reference files: `src/index.ts` shows MCP server setup with tool routing; `src/quickbase/client.ts` exemplifies API wrapper with error handling; `src/tools/index.ts` defines parameter schemas like `QueryRecordsSchema`.