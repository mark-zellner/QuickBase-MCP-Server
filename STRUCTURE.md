# QuickBase MCP Server - Directory Structure

## Root Directory

```
QuickBase-MCP-Server/
├── src/                          # TypeScript source code
│   ├── index.ts                  # MCP server entry point
│   ├── quickbase/                # QuickBase API client
│   ├── tools/                    # MCP tool definitions
│   └── types/                    # TypeScript type definitions
│
├── tests/                        # All test files
│   ├── lifecycle/                # Codepage lifecycle tests
│   ├── deployment/               # Deployment tests
│   ├── api/                      # API integration tests
│   └── integration/              # MCP integration tests
│
├── scripts/                      # Utility and deployment scripts
│   ├── deployment/               # Deployment automation
│   ├── setup/                    # Initial setup scripts
│   └── utilities/                # Helper scripts
│
├── docs/                         # Documentation
│   ├── archive/                  # Historical docs and summaries
│   ├── deployment/               # Deployment guides
│   └── mcp-design/               # MCP architecture docs
│
├── examples/                     # Example codepages
├── auth/                         # Authentication utilities
├── guides/                       # User guides
├── platform/                     # Platform-specific code
├── deployments/                  # Deployed codepage backups
├── dist/                         # Compiled JavaScript output
└── node_modules/                 # Dependencies
```

## Key Files

### Root Level
- `README.md` - Main project documentation
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License
- `package.json` - NPM configuration
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (not in git)
- `env.example` - Environment template

### Current Documentation (Root)
- `AGENTS.md` - AI agent instructions
- `AI-README.md` - AI-specific documentation
- `CLAUDE.md` - Claude-specific guidance
- `BUILD_COMPLETE.md` - Current build status
- `NEW_TOOLS_v1.6.0.md` - v1.6.0 features
- `FEATURE_REQUEST_CODEPAGE_CLI.md` - GitHub issue #45
- `QUICK_START.md` - Quick start guide
- `QUICK_START_NEW_TOOLS.md` - New tools guide
- `QUICK_REFERENCE.md` - Quick reference
- `CLI_GUIDE.md` - CLI usage guide
- `CODEPAGE_QUICK_REF.md` - Codepage quick reference
- `CODEPAGE_TOOLS_GUIDE.md` - Codepage tools guide
- `CODEPAGE_TOOLS_READY.md` - Codepage tools status
- `READY_TO_USE.md` - Production readiness

### Example Files (Root)
- `MyDealership.html` - Working codepage example
- `# Quickbase MCP Code Page Deployment Gui.md` - GUI documentation

## Test Organization

### `tests/lifecycle/`
End-to-end codepage lifecycle tests:
- `test-codepage-lifecycle.js` - Full lifecycle test suite (14 tests)
- `test-results-codepage-lifecycle.json` - Test results
- `test-codepage-demo.js` - Demo tests
- `test-codepage-existing.js` - Existing codepage tests
- `test-codepage-quick.js` - Quick tests

### `tests/deployment/`
Deployment-specific tests:
- `test-deployment.js` - Deployment functionality tests

### `tests/api/`
QuickBase REST API tests:
- `test-basic-api.js` - Basic API connectivity
- `test-field-api.js` - Field operations
- `test-page-save-api.js` - Page save operations
- `quick-api-test.cjs` - Quick API validation

### `tests/integration/`
MCP integration tests:
- `test-mcp-codepage-tools.cjs` - MCP codepage tools
- `test-mcp-direct.js` - Direct MCP calls
- `test-mcp-stdio.js` - Stdio transport tests
- `test-codepage-tools.js` - Codepage tool integration
- `test-uat.js` - User acceptance tests
- `test-pricing-save.js` - Pricing save tests

## Script Organization

### `scripts/deployment/`
Codepage deployment automation:
- `deploy-codepage.js` - Main deployment script
- `deploy-automated.js` - Automated deployment
- `deploy-direct.cjs` - Direct deployment
- `deploy-tool.js` - Deployment tooling

### `scripts/setup/`
Initial configuration:
- `setup.js` - Interactive setup wizard

### `scripts/utilities/`
Helper scripts:
- `cleanup-test-records.js` - Clean test data
- `create-codepage-fields.js` - Field creation
- `map-app.js` - Application mapping
- `cli.js` - CLI utilities
- `ai-codepage.js` - AI codepage generation

## Documentation Organization

### `docs/archive/`
Historical documentation:
- Session summaries
- Implementation summaries
- Version-specific docs
- Build completion docs

### `docs/deployment/`
Deployment guides:
- `DEPLOYMENT.md` - Main deployment guide
- `deploy.md` - Deployment overview
- `quickbase_cli_setup.md` - CLI setup guide
- Various deployment strategies and manuals

### `docs/mcp-design/`
MCP architecture documentation:
- Design documents
- Deployment strategies
- Solution architecture
- Build completion docs

### `docs/` (root level)
Current operational docs:
- `CODEBASE_ANALYSIS.md` - Code structure analysis
- `UAT_RESULTS.md` - User acceptance test results
- `TROUBLESHOOTING_404.md` - Common issues

## NPM Scripts

Run tests:
```bash
npm test                    # Basic API test
npm run test:lifecycle      # Codepage lifecycle tests
npm run test:codepages      # Codepage tool tests
npm run test:all           # All tests
```

Deploy codepages:
```bash
npm run deploy:dealership   # Deploy MyDealership.html
npm run deploy:codepage     # Deploy custom codepage
```

Development:
```bash
npm run build              # Compile TypeScript
npm start                  # Run MCP server
npm run dev                # Watch mode
npm run setup              # Initial setup
```

## Version History

- **v1.6.0** - Current: Full codepage lifecycle + GitHub CLI feature request
- **v1.5.0** - Comprehensive codepage tools
- **v1.1.0** - Initial stable release

## GitHub Integration

- **Repository**: https://github.com/mark-zellner/QuickBase-MCP-Server
- **Current Branch**: sync-bltcpt
- **Feature Request**: https://github.com/QuickBase/quickbase-cli/issues/45
