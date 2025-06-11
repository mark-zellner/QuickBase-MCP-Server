# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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