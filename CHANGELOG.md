# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-28

### Added - Enhanced Codepage Management System 🚀

#### New MCP Tools (10 tools)
- **`quickbase_deploy_codepage`** - Full-featured codepage deployment with metadata (name, version, tags, dependencies, target table)
- **`quickbase_update_codepage`** - Update existing codepages (code, description, version, active status)
- **`quickbase_search_codepages`** - Advanced search by name, tags, target table, active status
- **`quickbase_clone_codepage`** - Clone codepages with optional modifications for templates and variants
- **`quickbase_validate_codepage`** - Comprehensive validation (syntax, API usage, security vulnerabilities)
- **`quickbase_export_codepage`** - Export codepages in HTML, JSON, or Markdown formats
- **`quickbase_import_codepage`** - Import codepages from HTML, JSON, or file sources
- **`quickbase_save_codepage_version`** - Create version snapshots for version control
- **`quickbase_get_codepage_versions`** - View complete version history with change logs
- **`quickbase_rollback_codepage`** - Rollback to previous versions safely

#### Enhanced MyDealership.html
- Added "Test Connection" button for instant API availability diagnostics
- Implemented expandable Debug Info panel with detailed API state information
- Enhanced save function with multiple API fallback strategy (qdb.api → session client → QB.api)
- Improved error handling with user-friendly messages
- Added comprehensive console logging for troubleshooting

#### Comprehensive Documentation
- **CODEPAGE_TOOLS_GUIDE.md** - Complete reference guide (15+ pages) with examples, use cases, and workflows
- **NEW_FEATURES_SUMMARY.md** - Executive summary of new capabilities
- **DEPLOYMENT_TEST_GUIDE.md** - Step-by-step deployment and testing procedures for MyDealership
- **DEPLOYMENT_STATUS.md** - Current project status and next steps
- **QUICK_START.md** - Quick reference guide for rapid onboarding
- **SESSION_SUMMARY.md** - Detailed summary of implementation work
- **test-pricing-save.js** - API validation test script for pricing table operations

### Features

#### Complete Codepage Lifecycle Management
- **Deploy** codepages with full metadata tracking
- **Update** existing codepages safely with version control
- **Search & Discover** codepages by multiple criteria
- **Validate** code quality before deployment
- **Export** for backup and sharing
- **Import** from external sources
- **Clone** for rapid template-based development
- **Version Control** with snapshots and rollback capability

#### Quality Assurance
- Automatic JavaScript syntax validation
- Security vulnerability detection (eval, innerHTML, hardcoded tokens)
- QuickBase API best practices checking (qdb.api vs fetch)
- Comprehensive warnings and suggestions

#### Version Control System
- Save version snapshots before updates
- Complete version history with change logs
- One-click rollback to any previous version
- Safe deployment with disaster recovery

#### Team Collaboration
- Clone templates for rapid development
- Search and discovery of existing codepages
- Export for sharing and documentation
- Import from backups and external sources

### Changed
- Enhanced codepage handlers with proper field wrapping
- Updated to use `getRecords()` instead of deprecated `queryRecords()`
- Improved error handling across all new tools
- Refactored for loops instead of `.forEach()` for better linting compliance

### Technical Details
- All tools implemented with Zod schema validation
- Type-safe TypeScript implementation
- Comprehensive error handling with try/catch blocks
- Proper QuickBase REST API v1 integration
- Field ID mapping for codepage tables (bltcpt7da, bltcpt7db)
- Successful build with zero compilation errors

### Documentation
- 6 new comprehensive documentation files
- Complete tool reference with parameters and examples
- Real-world usage examples and workflows
- Troubleshooting guides
- Field ID mappings
- Setup requirements

### Breaking Changes
None - All new tools are additive and don't affect existing functionality.

### Migration Guide
No migration needed. New tools are ready to use immediately with proper table setup:
1. Codepages table (default: bltcpt7da)
2. Codepage Versions table (default: bltcpt7db)

---

## [1.0.0] - 2024-12-11

### Added
- Initial release of QuickBase MCP Server
- Comprehensive QuickBase API integration
- Application management tools (get info, list tables, test connection)
- Table operations (create, read, update, delete)
- Field management (all field types supported including lookups and formulas)
- Record operations (query, create, update, delete, bulk operations)
- Relationship management (create and get relationships)
- Report tools (get reports, run reports)
- Advanced querying with filtering and sorting
- Text search capabilities
- Error handling and retry logic
- TypeScript support with full type definitions
- Comprehensive documentation and examples
- MIT license for open source use

### Features
- **Full QuickBase API Coverage**: Supports all major QuickBase operations
- **Type Safety**: Complete TypeScript definitions for all tools and responses
- **Error Handling**: Robust error handling with automatic retries
- **Flexible Configuration**: Easy setup with environment variables
- **Production Ready**: Tested and optimized for production use
- **Developer Friendly**: Clear documentation and examples

### Tools Available
- `quickbase_get_app_info` - Get application information
- `quickbase_get_tables` - List all tables in application
- `quickbase_test_connection` - Test QuickBase connection
- `quickbase_create_table` - Create new table
- `quickbase_get_table_info` - Get table details
- `quickbase_delete_table` - Delete table
- `quickbase_get_table_fields` - Get all fields for a table
- `quickbase_create_field` - Create new field (all types supported)
- `quickbase_update_field` - Update existing field
- `quickbase_delete_field` - Delete field
- `quickbase_query_records` - Query records with filtering/sorting
- `quickbase_get_record` - Get specific record
- `quickbase_create_record` - Create new record
- `quickbase_update_record` - Update existing record
- `quickbase_delete_record` - Delete record
- `quickbase_bulk_create_records` - Create multiple records
- `quickbase_search_records` - Search records by text
- `quickbase_create_relationship` - Create table relationship
- `quickbase_get_relationships` - Get existing relationships
- `quickbase_get_reports` - Get all reports
- `quickbase_run_report` - Run specific report

### Supported Field Types
- Text, Text Choice, Multi-line Text, Rich Text
- Numeric, Currency, Percent
- Date, DateTime
- Checkbox, Email, Phone, URL, Address
- File Attachment
- Lookup, Formula, Reference

## [Unreleased]

### Planned
- Enhanced bulk operations
- Advanced relationship management
- Custom field validation
- Performance optimizations
- Additional utility functions 