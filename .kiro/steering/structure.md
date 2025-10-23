# Project Structure

## Directory Organization

```
quickbase-mcp-server/
├── src/                    # TypeScript source code
│   ├── index.ts           # Main MCP server entry point
│   ├── quickbase/         # QuickBase API client layer
│   │   └── client.ts      # Core API wrapper with all QB operations
│   ├── tools/             # MCP tool definitions
│   │   └── index.ts       # Tool schemas and exports
│   └── types/             # Type definitions and schemas
│       └── quickbase.ts   # Zod schemas for QB entities
├── dist/                  # Compiled JavaScript output
├── guides/                # Documentation and guides
├── auth/                  # Authentication utilities
├── .kiro/                 # Kiro IDE configuration
│   └── steering/          # AI assistant guidance rules
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env                   # Environment variables (gitignored)
└── env.example            # Environment template
```

## Key Files

### Core Implementation
- **`src/index.ts`**: MCP server setup, tool handlers, main application logic
- **`src/quickbase/client.ts`**: QuickBase REST API client with all CRUD operations
- **`src/tools/index.ts`**: MCP tool definitions with input schemas
- **`src/types/quickbase.ts`**: Zod schemas for type safety and validation

### Configuration
- **`package.json`**: Project metadata, dependencies, npm scripts
- **`tsconfig.json`**: TypeScript compiler configuration
- **`.env`**: Runtime environment variables (create from env.example)

### Documentation
- **`README.md`**: Comprehensive usage guide and API documentation
- **`guides/`**: Detailed implementation guides and best practices

## Architectural Patterns

### Layered Architecture
1. **MCP Layer** (`src/index.ts`): Protocol handling and tool routing
2. **Client Layer** (`src/quickbase/client.ts`): QuickBase API abstraction
3. **Type Layer** (`src/types/quickbase.ts`): Schema validation and type safety

### Tool Organization
- Tools grouped by functionality (Application, Table, Field, Record, Relationship)
- Consistent naming: `quickbase_[operation]_[entity]`
- Comprehensive input validation using Zod schemas

### Error Handling
- Axios interceptors for request/response logging
- Retry logic with configurable attempts
- Structured error responses with context

## File Naming Conventions
- TypeScript files use `.ts` extension
- ES module imports include `.js` extension (for compiled output)
- Configuration files in root directory
- Documentation in markdown format