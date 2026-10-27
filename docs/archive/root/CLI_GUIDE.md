# QuickBase Codepage CLI Tool

A command-line interface for deploying, validating, and managing QuickBase codepages with ease.

## 📦 Installation

```bash
npm install
```

**Dependencies:**
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Loading spinners
- `axios` - HTTP client

## 🚀 Quick Start

```bash
# Validate a codepage
node cli.js validate MyDealership.html

# Deploy a codepage
node cli.js deploy MyDealership.html \
  --name "My Dealership Calculator" \
  --version "1.0.0" \
  --description "AI-powered pricing calculator" \
  --tags "calculator,dealership" \
  --target-table "bvhuaz8wz"

# Search codepages
node cli.js search "dealership"

# Get specific codepage
node cli.js get 123

# Update existing codepage
node cli.js update 123 MyDealership.html --version "1.1.0"
```

## 📖 Commands

### `validate <file>`
Validates a codepage file before deployment.

**Checks:**
- ✅ QuickBase API usage (`qdb.api`, `QB.api`, session client)
- ✅ Syntax errors
- ✅ Connection testing
- ⚠️ Security issues (hardcoded tokens, innerHTML usage)
- 💡 Best practice suggestions

**Example:**
```bash
node cli.js validate examples/ContactManager.html
```

**Output:**
```
✔ Validation passed

✅ Uses qdb.api
✅ Uses QuickBase client
✅ Includes connection testing

⚠️ Warnings:
Security: Uses innerHTML - consider using textContent

Summary:
• Type: text/html
• Size: 15.2 KB
• Lines: 425
• No critical errors found
```

### `deploy <file> [options]`
Deploys a codepage to QuickBase.

**Options:**
- `--name <name>` - Codepage name (required)
- `--version <version>` - Version number (default: "1.0.0")
- `--description <desc>` - Description
- `--tags <tags>` - Comma-separated tags
- `--target-table <tableId>` - Target table ID
- `--validate` - Skip validation (default: true)

**Example:**
```bash
node cli.js deploy examples/InvoiceGenerator.html \
  --name "Invoice Generator" \
  --version "2.0.0" \
  --description "Professional invoice creation tool" \
  --tags "invoice,billing,finance" \
  --target-table "bxxxxxxx"
```

**Output:**
```
Deploying codepage...
✔ Deployed successfully

✅ Codepage deployed!
📝 Name: Invoice Generator
🔢 Version: 2.0.0
🆔 Record ID: 15
```

### `search <term>`
Searches for codepages by name or description.

**Example:**
```bash
node cli.js search "invoice"
```

**Output:**
```
Searching codepages...
✔ Found 2 codepages

Found 2 codepage(s):

📄 Invoice Generator v2.0.0 (ID: 15)
   Professional invoice creation tool
   Tags: invoice, billing, finance
   Table: bxxxxxxx

📄 Simple Invoice v1.0.0 (ID: 12)
   Basic invoice template
   Tags: invoice
   Table: byyyyyyy
```

### `get <recordId>`
Retrieves a specific codepage by record ID.

**Example:**
```bash
node cli.js get 15
```

**Output:**
```
Fetching codepage...
✔ Codepage retrieved

📄 Invoice Generator

Version: 2.0.0
Description: Professional invoice creation tool
Created: 2024-01-15
Modified: 2024-01-20
Tags: invoice, billing, finance
Target Table: bxxxxxxx

Code Preview:
<!DOCTYPE html>
<html lang="en">
...
[First 500 characters shown]
```

### `update <recordId> <file> [options]`
Updates an existing codepage.

**Options:**
- `--version <version>` - New version number
- `--description <desc>` - Updated description
- `--tags <tags>` - Updated tags
- `--validate` - Skip validation (default: true)

**Example:**
```bash
node cli.js update 15 examples/InvoiceGenerator.html \
  --version "2.1.0" \
  --description "Invoice generator with tax support" \
  --tags "invoice,billing,finance,tax"
```

**Output:**
```
Updating codepage...
✔ Updated successfully

✅ Codepage updated!
🔢 New Version: 2.1.0
📝 Updated fields: code, version, description, tags
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# QuickBase Configuration
QB_REALM=your-realm.quickbase.com
QB_USER_TOKEN=b64cth_xxxx_xxxxxxxxxxxxxxxxxx
QB_APP_ID=bxxxxxxxxx

# Optional Settings
QB_DEFAULT_TIMEOUT=30000
QB_MAX_RETRIES=3

# Development Only (Security Risk!)
NODE_TLS_REJECT_UNAUTHORIZED=0  # For self-signed certificates
```

### Table Structure

The CLI expects a QuickBase table with these fields:

| Field ID | Label | Type |
|----------|-------|------|
| 6 | Name | Text |
| 7 | Version | Text |
| 8 | Code | Multiline Text |
| 9 | Description | Multiline Text |
| 10 | Tags | Text |
| 11 | Target Table | Text |
| 12 | Created Date | Date/Time |
| 13 | Modified Date | Date/Time |

**Customize Field IDs:**
Edit `cli.js` and update the `fields` object:

```javascript
const CONFIG = {
    codepagesTableId: 'bltcpt7da',
    fields: {
        name: 6,
        version: 7,
        code: 8,
        // ... your field IDs
    }
};
```

## 🔍 Validation Rules

### ✅ Good Practices
- Uses `qdb.api` or `QB.api`
- Includes connection testing
- Has error handling
- Validates user input
- Uses try/catch blocks

### ⚠️ Warnings
- Uses `innerHTML` (XSS risk)
- Uses `eval()` (security risk)
- Large file size (>100KB)
- Many inline styles

### ❌ Errors
- Hardcoded user tokens
- No QuickBase API usage
- Syntax errors
- Missing required configuration

## 🛠️ Advanced Usage

### Batch Deployment

Deploy multiple codepages:

```bash
#!/bin/bash
for file in examples/*.html; do
    name=$(basename "$file" .html)
    node cli.js deploy "$file" \
        --name "$name" \
        --version "1.0.0" \
        --description "Example codepage: $name" \
        --tags "example,demo"
done
```

### Custom Validation

Add custom validation rules in `cli.js`:

```javascript
function validateCodepage(code) {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Your custom checks
    if (code.includes('your-custom-check')) {
        warnings.push('Custom warning message');
    }

    return { errors, warnings, suggestions };
}
```

### CI/CD Integration

Use in GitHub Actions:

```yaml
name: Deploy Codepages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Validate codepages
        run: node cli.js validate examples/*.html
      
      - name: Deploy to QuickBase
        env:
          QB_REALM: ${{ secrets.QB_REALM }}
          QB_USER_TOKEN: ${{ secrets.QB_USER_TOKEN }}
          QB_APP_ID: ${{ secrets.QB_APP_ID }}
        run: |
          for file in examples/*.html; do
            node cli.js deploy "$file" --name "$(basename "$file")"
          done
```

## 🐛 Troubleshooting

### "Request failed with status code 400"
- **Cause**: Invalid query syntax or table ID
- **Fix**: Check table ID and field IDs in CONFIG

### "Request failed with status code 401"
- **Cause**: Invalid or expired user token
- **Fix**: Generate new user token in QuickBase

### "QuickBase API not available"
- **Cause**: Certificate or network error
- **Fix**: Add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env` (dev only)

### "Self-signed certificate error"
- **Cause**: Development environment with self-signed cert
- **Fix**: Use `httpsAgent` with `rejectUnauthorized: false` (dev only)

```javascript
const httpsAgent = new https.Agent({
    rejectUnauthorized: false  // Development only!
});
```

### Deploy returns only version number
- **Cause**: Success message not formatted correctly
- **Fix**: Check for record ID in response or query table

### Search returns empty results
- **Cause**: No matching records or query syntax issue
- **Fix**: Try simpler search term or check table permissions

## 📊 Output Formats

### Success Messages
- ✔ **Green checkmark**: Operation completed
- 📝 **Blue emoji**: Informational
- ✅ **Green checkmark**: Success confirmation

### Error Messages
- ✖ **Red X**: Operation failed
- ❌ **Red X**: Error details
- ⚠️ **Yellow warning**: Non-critical issues

### Status Indicators
- 🔄 **Spinning**: Operation in progress
- 📄 **Document**: Codepage reference
- 🆔 **ID**: Record/field identifier
- 🏷️ **Tag**: Metadata label

## 🔐 Security Best Practices

### Never Commit Secrets
```bash
# Add to .gitignore
.env
.env.*
*.token
```

### Use Environment Variables
```javascript
// ❌ Bad - hardcoded
const token = 'b64cth_xxxx_actual_token_here';

// ✅ Good - from environment
const token = process.env.QB_USER_TOKEN;
```

### Validate Input
```javascript
// Always validate user input
if (!tableId || !/^b[a-z0-9]{8,}$/i.test(tableId)) {
    throw new Error('Invalid table ID format');
}
```

### Use HTTPS in Production
```javascript
// Only disable cert check in development
if (process.env.NODE_ENV === 'development') {
    agent.rejectUnauthorized = false;
}
```

## 📚 Examples

See [examples/README.md](../examples/README.md) for complete codepage examples:
- 🚗 MyDealership - Pricing calculator
- 📇 ContactManager - CRUD operations
- 🧾 InvoiceGenerator - Invoice creation
- 📊 TaskDashboard - Analytics with charts

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

## 📞 Support

- **Documentation**: See [AGENTS.md](../AGENTS.md)
- **Issues**: GitHub Issues
- **QuickBase Docs**: https://developer.quickbase.com/

---

**Made with ❤️ for QuickBase developers**
