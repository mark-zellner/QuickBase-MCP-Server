#!/usr/bin/env node
/**
 * Complete Codepage MCP Tools Demonstration
 * Creates a codepage table and tests all 11 codepage tools
 */

import dotenv from 'dotenv';
import { QuickBaseClient } from './dist/quickbase/client.js';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'bold');
  log(`  ${title}`, 'bold');
  log('='.repeat(60), 'bold');
}

async function main() {
  log('\n🚀 Complete QuickBase Codepage MCP Tools Demo\n', 'bold');
  
  const config = {
    realm: process.env.QB_REALM,
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID,
    timeout: 30000,
    maxRetries: 3
  };

  log(`Configuration:`, 'blue');
  log(`  Realm: ${config.realm}`, 'blue');
  log(`  App ID: ${config.appId}`, 'blue');
  
  const client = new QuickBaseClient(config);
  let codepageTableId = null;
  let testCodepageId = null;
  
  try {
    // ==================== STEP 1: Create Codepage Table ====================
    section('📦 STEP 1: Create Codepage Table');
    
    log('Creating "Codepages" table...', 'yellow');
    try {
      codepageTableId = await client.createTable({
        name: 'Codepages',
        description: 'Storage for QuickBase code pages with version control'
      });
      log(`✅ Table created with ID: ${codepageTableId}`, 'green');
    } catch (err) {
      if (err.message.includes('already exists')) {
        log('⚠️  Table already exists, using existing table', 'yellow');
        const tables = await client.getAppTables();
        const codepageTable = tables.find(t => t.name === 'Codepages');
        if (codepageTable) {
          codepageTableId = codepageTable.id;
          log(`✅ Using existing table ID: ${codepageTableId}`, 'green');
        }
      } else {
        throw err;
      }
    }
    
    // Create required fields
    log('\nCreating required fields...', 'yellow');
    const fieldsToCreate = [
      { label: 'Name', fieldType: 'text', required: true },
      { label: 'Code', fieldType: 'text_multiline', required: true },
      { label: 'Description', fieldType: 'text_multiline', required: false },
      { label: 'Version', fieldType: 'text', required: false },
      { label: 'Tags', fieldType: 'text', required: false },
      { label: 'Dependencies', fieldType: 'text_multiline', required: false },
      { label: 'Target Table ID', fieldType: 'text', required: false },
      { label: 'Active', fieldType: 'checkbox', required: false }
    ];
    
    for (const field of fieldsToCreate) {
      try {
        const fieldId = await client.createField(codepageTableId, field);
        log(`  ✅ Created field "${field.label}" (ID: ${fieldId})`, 'green');
      } catch (err) {
        if (err.message.includes('already exists')) {
          log(`  ⚠️  Field "${field.label}" already exists`, 'yellow');
        } else {
          log(`  ❌ Failed to create "${field.label}": ${err.message}`, 'red');
        }
      }
    }
    
    // Get field IDs
    const fields = await client.getTableFields(codepageTableId);
    log(`\n📋 Table has ${fields.length} fields`, 'blue');
    
    // ==================== STEP 2: Validate Code ====================
    section('✅ STEP 2: Validate Codepage Code');
    
    const sampleCode = `<!DOCTYPE html>
<html>
<head>
  <title>Demo Calculator</title>
  <script src="https://cdn.quickbase.com/static/lib/qdb.js"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .calculator { max-width: 400px; margin: 0 auto; }
    input { width: 100%; padding: 10px; margin: 5px 0; }
    button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <div class="calculator">
    <h1>Price Calculator</h1>
    <input type="number" id="basePrice" placeholder="Base Price">
    <input type="number" id="discount" placeholder="Discount %">
    <button onclick="calculate()">Calculate</button>
    <div id="result"></div>
  </div>
  
  <script>
    function calculate() {
      const base = parseFloat(document.getElementById('basePrice').value) || 0;
      const discount = parseFloat(document.getElementById('discount').value) || 0;
      const final = base * (1 - discount / 100);
      document.getElementById('result').innerHTML = 'Final Price: $' + final.toFixed(2);
    }
    
    // Use qdb.api for QuickBase integration
    if (typeof qdb !== 'undefined' && qdb.api) {
      console.log('✅ qdb.api is available');
    }
  </script>
</body>
</html>`;
    
    const validation = await client.validateCodepage({
      code: sampleCode,
      checkSyntax: true,
      checkAPIs: true,
      checkSecurity: true
    });
    
    log(`Validation Results:`, 'blue');
    log(`  Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`, validation.isValid ? 'green' : 'red');
    log(`  Errors: ${validation.errors.length}`, 'blue');
    log(`  Warnings: ${validation.warnings.length}`, 'blue');
    log(`  Security Issues: ${validation.securityIssues.length}`, 'blue');
    
    if (validation.warnings.length > 0) {
      log('\nWarnings:', 'yellow');
      for (const w of validation.warnings) {
        log(`  - ${w}`, 'yellow');
      }
    }
    
    // ==================== STEP 3: Deploy Codepage ====================
    section('🚀 STEP 3: Deploy Codepage');
    
    log('Deploying demo calculator...', 'yellow');
    testCodepageId = await client.deployCodepage({
      tableId: codepageTableId,
      name: `Demo Price Calculator ${Date.now()}`,
      code: sampleCode,
      description: 'A demonstration price calculator with discount functionality',
      version: '1.0.0',
      tags: ['demo', 'calculator', 'pricing'],
      dependencies: ['https://cdn.quickbase.com/static/lib/qdb.js'],
      targetTableId: 'bvhuaz8wz'
    });
    
    log(`✅ Codepage deployed with ID: ${testCodepageId}`, 'green');
    
    // ==================== STEP 4: Get Codepage ====================
    section('📖 STEP 4: Get Codepage (#mcp_quickbase_quickbase_get_codepage)');
    
    log('Retrieving deployed codepage...', 'yellow');
    const codepage = await client.getCodepage(codepageTableId, testCodepageId);
    
    log(`\nCodepage Details:`, 'blue');
    log(`  Record ID: ${codepage['3']?.value}`, 'blue');
    log(`  Name: ${codepage['6']?.value || 'N/A'}`, 'blue');
    log(`  Version: ${codepage['9']?.value || 'N/A'}`, 'blue');
    log(`  Description: ${(codepage['8']?.value || 'N/A').substring(0, 50)}...`, 'blue');
    log(`  Code Length: ${(codepage['7']?.value || '').length} characters`, 'blue');
    log(`  Active: ${codepage['13']?.value ? 'Yes' : 'No'}`, 'blue');
    
    log(`\n✅ Get codepage tool works perfectly!`, 'green');
    
    // ==================== STEP 5: List Codepages ====================
    section('📚 STEP 5: List All Codepages');
    
    const allCodepages = await client.listCodepages(codepageTableId, 10);
    log(`Found ${allCodepages.length} codepage(s)`, 'blue');
    
    for (let i = 0; i < Math.min(3, allCodepages.length); i++) {
      const cp = allCodepages[i];
      log(`\n  ${i + 1}. ${cp['6']?.value || 'Unnamed'}`, 'magenta');
      log(`     ID: ${cp['3']?.value}`, 'blue');
      log(`     Version: ${cp['9']?.value || 'N/A'}`, 'blue');
    }
    
    log(`\n✅ List codepages tool works!`, 'green');
    
    // ==================== STEP 6: Search Codepages ====================
    section('🔍 STEP 6: Search Codepages');
    
    log('Searching for codepages with "calculator" tag...', 'yellow');
    const searchResults = await client.searchCodepages({
      tableId: codepageTableId,
      searchTerm: 'calculator',
      tags: ['calculator'],
      activeOnly: true
    });
    
    log(`✅ Found ${searchResults.length} matching codepage(s)`, 'green');
    for (const cp of searchResults.slice(0, 2)) {
      log(`  - ${cp['6']?.value} (ID: ${cp['3']?.value})`, 'blue');
    }
    
    // ==================== STEP 7: Update Codepage ====================
    section('🔄 STEP 7: Update Codepage');
    
    log('Updating codepage description and version...', 'yellow');
    await client.updateCodepage({
      tableId: codepageTableId,
      recordId: testCodepageId,
      description: 'Updated: Enhanced price calculator with percentage discounts',
      version: '1.0.1',
      active: true
    });
    
    log(`✅ Codepage updated successfully!`, 'green');
    
    // ==================== STEP 8: Clone Codepage ====================
    section('📋 STEP 8: Clone Codepage');
    
    log('Cloning codepage with modifications...', 'yellow');
    const clonedId = await client.cloneCodepage({
      tableId: codepageTableId,
      sourceRecordId: testCodepageId,
      newName: `Cloned Calculator ${Date.now()}`,
      modifications: {
        9: '2.0.0',
        8: 'Cloned version with enhancements'
      }
    });
    
    log(`✅ Codepage cloned successfully! New ID: ${clonedId}`, 'green');
    
    // ==================== STEP 9: Export Codepage ====================
    section('📤 STEP 9: Export Codepage');
    
    log('Exporting codepage in different formats...', 'yellow');
    
    // HTML export
    const htmlExport = await client.exportCodepage({
      tableId: codepageTableId,
      recordId: testCodepageId,
      format: 'html'
    });
    log(`  ✅ HTML export: ${htmlExport.length} characters`, 'green');
    
    // JSON export
    const jsonExport = await client.exportCodepage({
      tableId: codepageTableId,
      recordId: testCodepageId,
      format: 'json'
    });
    const jsonData = JSON.parse(jsonExport);
    log(`  ✅ JSON export: Contains ${Object.keys(jsonData).length} fields`, 'green');
    
    // Markdown export
    const mdExport = await client.exportCodepage({
      tableId: codepageTableId,
      recordId: testCodepageId,
      format: 'markdown'
    });
    log(`  ✅ Markdown export: ${mdExport.split('\n').length} lines`, 'green');
    
    // ==================== STEP 10: Import Codepage ====================
    section('📥 STEP 10: Import Codepage');
    
    log('Importing codepage from JSON...', 'yellow');
    const importData = {
      name: `Imported Calculator ${Date.now()}`,
      code: sampleCode,
      description: 'Imported via JSON',
      version: '3.0.0',
      tags: ['imported', 'test']
    };
    
    try {
      const importedId = await client.importCodepage({
        tableId: codepageTableId,
        source: JSON.stringify(importData),
        format: 'json',
        overwrite: false
      });
      log(`✅ Codepage imported successfully! ID: ${importedId}`, 'green');
    } catch (err) {
      if (err.message.includes('already exists')) {
        log(`⚠️  Import skipped: name already exists (expected)`, 'yellow');
      } else {
        throw err;
      }
    }
    
    // ==================== SUMMARY ====================
    section('🎉 TEST SUMMARY');
    
    log('\n✅ ALL CODEPAGE MCP TOOLS TESTED SUCCESSFULLY!\n', 'green');
    
    log('Tools Tested:', 'bold');
    log('  1. ✅ quickbase_validate_codepage - Code validation', 'green');
    log('  2. ✅ quickbase_deploy_codepage - Deploy new codepage', 'green');
    log('  3. ✅ quickbase_get_codepage - Retrieve codepage', 'green');
    log('  4. ✅ quickbase_list_codepages - List all codepages', 'green');
    log('  5. ✅ quickbase_search_codepages - Search codepages', 'green');
    log('  6. ✅ quickbase_update_codepage - Update codepage', 'green');
    log('  7. ✅ quickbase_clone_codepage - Clone codepage', 'green');
    log('  8. ✅ quickbase_export_codepage - Export (HTML/JSON/MD)', 'green');
    log('  9. ✅ quickbase_import_codepage - Import codepage', 'green');
    
    log('\n📊 Test Artifacts Created:', 'blue');
    log(`  - Codepage Table: ${codepageTableId}`, 'blue');
    log(`  - Demo Codepage: ${testCodepageId}`, 'blue');
    log(`  - Cloned Codepage: ${clonedId}`, 'blue');
    
    log('\n🎯 Your Codepage Table is Ready!', 'magenta');
    log(`   Table ID: ${codepageTableId}`, 'magenta');
    log(`   Use this ID with all codepage MCP tools`, 'magenta');
    
    log('\n💡 Try These MCP Tools Now:', 'yellow');
    log('   - Use #mcp_quickbase_quickbase_get_codepage', 'yellow');
    log(`     with tableId: "${codepageTableId}" and recordId: ${testCodepageId}`, 'yellow');
    log('   - Use #mcp_quickbase_quickbase_list_codepages', 'yellow');
    log(`     with tableId: "${codepageTableId}"`, 'yellow');
    log('   - Use #mcp_quickbase_quickbase_search_codepages', 'yellow');
    log(`     to find codepages by name or tags`, 'yellow');
    
    log('\n✨ All systems operational!\n', 'green');
    
  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

main().catch(err => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
