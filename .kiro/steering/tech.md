# Technology Stack

## Core Technologies
- **Runtime**: Node.js 18+ (ES Modules)
- **Language**: TypeScript 5.0+
- **Protocol**: Model Context Protocol (MCP) SDK v0.4.0
- **HTTP Client**: Axios 1.6+ for QuickBase REST API v1
- **Validation**: Zod 3.22+ for schema validation
- **Environment**: dotenv for configuration management

## Build System
- **Compiler**: TypeScript compiler (tsc)
- **Target**: ES2022 with ESNext modules
- **Output**: `dist/` directory with declaration files
- **Source Maps**: Enabled for debugging

## Project Structure
- **Entry Point**: `src/index.ts` (MCP server implementation)
- **Client Layer**: `src/quickbase/client.ts` (QuickBase API wrapper)
- **Tools**: `src/tools/index.ts` (MCP tool definitions)
- **Types**: `src/types/quickbase.ts` (Zod schemas and TypeScript types)

## Common Commands

### Development
```bash
npm run dev          # Watch mode compilation + auto-restart
npm run build        # Production build
npm run clean        # Remove dist directory
```

### Testing
```bash
npm test             # Run basic API tests
npm run test:jest    # Run Jest test suite
```

### Deployment
```bash
npm run setup        # Interactive setup script
npm start            # Start production server
npm run prepublishOnly  # Build + test before publish
```

## Configuration
- Environment variables in `.env` (see `env.example`)
- Required: `QB_REALM`, `QB_USER_TOKEN`, `QB_APP_ID`
- Optional: `QB_DEFAULT_TIMEOUT`, `QB_MAX_RETRIES`, MCP server settings

## Code Style
- Strict TypeScript configuration
- ES Module imports with `.js` extensions
- Zod schemas for runtime validation
- Comprehensive error handling with retry logic
- Console logging for API requests/responses