# Feature Request: Add Codepage Management Commands to Quickbase CLI

## Summary

Request to add codepage deployment and management commands to the Quickbase CLI, enabling developers to programmatically create, update, deploy, and manage HTML/JavaScript codepages in QuickBase applications via the command line.

## Motivation

### Current Gap

The Quickbase CLI currently provides excellent support for:
- Records (query, insert, update, delete)
- Tables (create, export, import)
- Fields and relationships
- Formulas and app navigation

However, it lacks support for **codepage operations**, which are critical for modern QuickBase development workflows involving custom UI components, interactive dashboards, and embedded applications.

### Use Cases

1. **CI/CD Integration**: Automated deployment of codepages as part of continuous integration pipelines
2. **Version Control**: Managing codepage source in Git and deploying via CLI scripts
3. **Multi-Environment Deployments**: Promoting codepages from dev → test → production
4. **Backup & Recovery**: Automated backups of production codepages
5. **Template Management**: Cloning and distributing codepage templates across apps
6. **Developer Workflows**: Local development with hot-reload and automated deployment

### Current Workarounds

Developers currently must:
- Manually copy/paste code into QuickBase UI
- Use unofficial/custom REST API wrappers
- Build bespoke deployment tooling (like our [QuickBase MCP Server](https://github.com/mark-zellner/QuickBase-MCP-Server))

## Proposed Commands

### 1. Deploy Codepage
```bash
quickbase-cli codepage deploy \
  --app-id bvhuaz7pn \
  --file ./MyDashboard.html \
  --name "My Dashboard" \
  --description "Interactive dashboard" \
  --version "1.0.0" \
  --tags "production,dashboard"
```

**Output:**
```json
{
  "recordId": 16,
  "name": "My Dashboard",
  "version": "1.0.0",
  "url": "https://realm.quickbase.com/db/TABLE_ID?a=dr&rid=16"
}
```

### 2. List Codepages
```bash
quickbase-cli codepage list \
  --app-id bvhuaz7pn \
  --table-id bvi2ms4e9 \
  --format table
```

**Output:**
```
+----+------------------+---------+--------+
| ID | NAME             | VERSION | ACTIVE |
+----+------------------+---------+--------+
| 16 | My Dashboard     | 1.0.0   | true   |
| 15 | Contact Manager  | 2.1.3   | true   |
| 14 | Invoice Gen      | 1.5.0   | false  |
+----+------------------+---------+--------+
```

### 3. Get Codepage
```bash
quickbase-cli codepage get \
  --app-id bvhuaz7pn \
  --table-id bvi2ms4e9 \
  --record-id 16 \
  --output ./MyDashboard-backup.html
```

### 4. Update Codepage
```bash
quickbase-cli codepage update \
  --app-id bvhuaz7pn \
  --table-id bvi2ms4e9 \
  --record-id 16 \
  --file ./MyDashboard-v1.1.html \
  --version "1.1.0"
```

### 5. Validate Codepage
```bash
quickbase-cli codepage validate \
  --file ./MyDashboard.html \
  --check-syntax \
  --check-security \
  --check-apis
```

**Output:**
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "Consider using qdb.api instead of session client for better CORS handling"
  ],
  "securityIssues": []
}
```

### 6. Export Codepage
```bash
# Export as HTML
quickbase-cli codepage export \
  --record-id 16 \
  --format html \
  --output ./backup.html

# Export as JSON (with metadata)
quickbase-cli codepage export \
  --record-id 16 \
  --format json \
  --output ./codepage.json
```

## Technical Implementation Notes

### REST API Endpoints
Codepages are stored as records in QuickBase tables. The CLI would use existing REST API endpoints:

- **POST** `/v1/records` - Create codepage record
- **GET** `/v1/records/query` - Query codepages
- **POST** `/v1/records` (with record ID) - Update codepage
- **DELETE** `/v1/records` - Delete codepage

### Standard Field Mapping
Most codepage implementations use a standard field structure:

```
Field 3  - Record ID (auto)
Field 8  - Name (text)
Field 9  - Version (text)
Field 10 - Tags (text, comma-separated)
Field 11 - Target Table ID (text)
Field 12 - Active (checkbox)
Field 13 - Code (text-multiline, HTML/JS)
Field 14 - Description (text-multiline)
Field 15 - Dependencies (text-multiline, newline-separated)
```

The CLI could support custom field mappings via config or flags.

### Configuration
Add codepage settings to `.config/quickbase/config.yml`:

```yaml
default:
  realm_hostname: vibe.quickbase.com
  user_token: b3b6se_mzif_***
  app_id: bvhuaz7pn
  codepage_table_id: bvi2ms4e9  # Default codepages table
```

## Benefits

1. **Consistency**: Aligns with existing CLI patterns (records, tables, fields)
2. **Automation**: Enables scripted deployments and CI/CD integration
3. **Version Control**: Supports Git-based workflows for codepage development
4. **Developer Experience**: Reduces friction in codepage development lifecycle
5. **Community**: Many developers would benefit from official CLI support

## Alternative Considered

We built the [QuickBase MCP Server](https://github.com/mark-zellner/QuickBase-MCP-Server) to provide:
- 14 codepage lifecycle management tools
- Validation (syntax, API usage, security)
- Version control and rollback
- Import/export in multiple formats
- AI-assisted codepage development via Model Context Protocol

However, an **official CLI implementation** would be:
- More widely adopted
- Better maintained
- Integrated with existing Quickbase CLI patterns
- Available to all QuickBase developers without additional tooling

## References

- **QuickBase REST API**: https://developer.quickbase.com/
- **QuickBase MCP Server** (reference implementation): https://github.com/mark-zellner/QuickBase-MCP-Server
- **Current CLI Documentation**: https://github.com/QuickBase/quickbase-cli#readme

## Community Interest

This feature would significantly improve the developer experience for QuickBase users building custom UIs, dashboards, and embedded applications. We're happy to:

- Provide additional technical details
- Share our MCP implementation as a reference
- Contribute to testing and validation
- Help with documentation

---

**Submitted by:** [Your Name]  
**Organization:** [Your Organization]  
**Contact:** [Your Email]  
**Date:** November 21, 2025

**Related:** 
- Our working implementation: https://github.com/mark-zellner/QuickBase-MCP-Server
- Deployed codepage example: https://vibe.quickbase.com/db/bvi2ms4e9?a=dr&rid=16
