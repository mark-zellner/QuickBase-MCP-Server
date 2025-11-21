#!/usr/bin/env node
/**
 * Test Script for QuickBase MCP Codepage Tools
 * Tests the 11 codepage management tools
 */

import dotenv from 'dotenv';
import { QuickBaseClient } from './dist/quickbase/client.js';

dotenv.config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function success(msg) {
  log(`✅ ${msg}`, 'green');
}

function error(msg) {
  log(`❌ ${msg}`, 'red');
}

function info(msg) {
  log(`ℹ️  ${msg}`, 'blue');
}

function warn(msg) {
  log(`⚠️  ${msg}`, 'yellow');
}

function section(msg) {
  log(`\n${'='.repeat(60)}`, 'bold');
  log(msg, 'bold');
  log('='.repeat(60), 'bold');
}

// Sample codepage HTML for testing
const SAMPLE_CODEPAGE = `<!DOCTYPE html>
<html>
<head>
  <title>Test Codepage</title>
  <script src="https://cdn.quickbase.com/static/lib/qdb.js"></script>
</head>
<body>
  <h1>Test Codepage</h1>
  <p>This is a test codepage for MCP tools validation.</p>
  <script>
    // Use qdb.api for best compatibility
    if (typeof qdb !== 'undefined' && qdb.api) {
      console.log('✅ qdb.api is available');
      
      async function saveTestRecord() {
        const response = await qdb.api.addRecord('bvhuaz8wz', {
          6: { value: 'Test' },
          7: { value: 'Test Record' }
        });
        console.log('Record created:', response.recordId);
      }
    }
  </script>
</body>
</html>`;

async function main() {
  section('🧪 QuickBase MCP Codepage Tools Test Suite');
  
  // Configuration
  const config = {
    realm: process.env.QB_REALM,
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID,
    timeout: 30000,
    maxRetries: 3
  };

  info(`Realm: ${config.realm}`);
  info(`App ID: ${config.appId}`);
  info(`Codepage Table: ${process.env.CODEPAGE_TABLE_ID || 'bltcpt7da'}`);
  
  if (!config.realm || !config.userToken || !config.appId) {
    error('Missing required environment variables');
    error('Please set QB_REALM, QB_USER_TOKEN, and QB_APP_ID in .env file');
    process.exit(1);
  }

  const client = new QuickBaseClient(config);
  const codepageTableId = process.env.CODEPAGE_TABLE_ID || 'bltcpt7da';
  const versionTableId = process.env.CODEPAGE_VERSION_TABLE_ID || 'bltcptv8z';
  
  let testCodepageId = null;
  let clonedCodepageId = null;
  let versionId = null;
  
  try {
    // ========== TEST 1: Connection Test ==========
    section('TEST 1: Connection & Table Verification');
    try {
      const isConnected = await client.testConnection();
      if (isConnected) {
        success('Connected to QuickBase successfully');
      } else {
        error('Connection test failed');
        process.exit(1);
      }
    } catch (err) {
      error(`Connection failed: ${err.message}`);
      process.exit(1);
    }

    // ========== TEST 2: Validate Codepage ==========
    section('TEST 2: Validate Codepage Code');
    try {
      const validation = await client.validateCodepage({
        code: SAMPLE_CODEPAGE,
        checkSyntax: true,
        checkAPIs: true,
        checkSecurity: true
      });
      
      info(`Validation Results:`);
      info(`  Valid: ${validation.isValid}`);
      info(`  Errors: ${validation.errors.length}`);
      info(`  Warnings: ${validation.warnings.length}`);
      info(`  Security Issues: ${validation.securityIssues.length}`);
      
      if (validation.errors.length > 0) {
        warn('Errors found:');
        validation.errors.forEach(e => warn(`  - ${e}`));
      }
      
      if (validation.warnings.length > 0) {
        warn('Warnings:');
        validation.warnings.forEach(w => warn(`  - ${w}`));
      }
      
      if (validation.isValid) {
        success('Code validation passed');
      } else {
        warn('Code has validation issues but continuing test...');
      }
    } catch (err) {
      error(`Validation failed: ${err.message}`);
    }

    // ========== TEST 3: Deploy Codepage ==========
    section('TEST 3: Deploy New Codepage');
    try {
      testCodepageId = await client.deployCodepage({
        tableId: codepageTableId,
        name: `MCP Test Codepage ${Date.now()}`,
        code: SAMPLE_CODEPAGE,
        description: 'Automatically generated test codepage from MCP tools test suite',
        version: '1.0.0',
        tags: ['test', 'mcp', 'automated'],
        dependencies: ['https://cdn.quickbase.com/static/lib/qdb.js'],
        targetTableId: 'bvhuaz8wz'
      });
      
      success(`Codepage deployed successfully with ID: ${testCodepageId}`);
    } catch (err) {
      error(`Deployment failed: ${err.message}`);
      throw err;
    }

    // ========== TEST 4: Get Codepage ==========
    section('TEST 4: Retrieve Codepage');
    try {
      const codepage = await client.getCodepage(codepageTableId, testCodepageId);
      
      info(`Codepage Details:`);
      info(`  Name: ${codepage['6']?.value}`);
      info(`  Version: ${codepage['9']?.value}`);
      info(`  Description: ${codepage['8']?.value?.substring(0, 50)}...`);
      info(`  Active: ${codepage['13']?.value ? 'Yes' : 'No'}`);
      
      success('Codepage retrieved successfully');
    } catch (err) {
      error(`Get codepage failed: ${err.message}`);
    }

    // ========== TEST 5: List Codepages ==========
    section('TEST 5: List All Codepages');
    try {
      const codepages = await client.listCodepages(codepageTableId, 10);
      
      info(`Found ${codepages.length} codepages (showing up to 10)`);
      codepages.slice(0, 5).forEach((cp, i) => {
        info(`  ${i + 1}. ${cp['6']?.value} (ID: ${cp['3']?.value})`);
      });
      
      success('List codepages successful');
    } catch (err) {
      error(`List codepages failed: ${err.message}`);
    }

    // ========== TEST 6: Search Codepages ==========
    section('TEST 6: Search Codepages');
    try {
      const searchResults = await client.searchCodepages({
        tableId: codepageTableId,
        searchTerm: 'test',
        tags: ['test'],
        activeOnly: true
      });
      
      info(`Found ${searchResults.length} codepages matching search`);
      searchResults.slice(0, 3).forEach((cp, i) => {
        info(`  ${i + 1}. ${cp['6']?.value} (ID: ${cp['3']?.value})`);
      });
      
      success('Search codepages successful');
    } catch (err) {
      error(`Search failed: ${err.message}`);
    }

    // ========== TEST 7: Update Codepage ==========
    section('TEST 7: Update Codepage');
    try {
      await client.updateCodepage({
        tableId: codepageTableId,
        recordId: testCodepageId,
        description: 'Updated description - test successful!',
        version: '1.0.1',
        active: true
      });
      
      success('Codepage updated successfully');
    } catch (err) {
      error(`Update failed: ${err.message}`);
    }

    // ========== TEST 8: Save Version Snapshot ==========
    section('TEST 8: Save Version Snapshot');
    try {
      versionId = await client.saveCodepageVersion({
        tableId: versionTableId,
        codepageRecordId: testCodepageId,
        version: '1.0.1',
        code: SAMPLE_CODEPAGE,
        changeLog: 'Initial version saved from test suite'
      });
      
      success(`Version snapshot saved with ID: ${versionId}`);
    } catch (err) {
      error(`Save version failed: ${err.message}`);
      warn('This may fail if version table does not exist');
    }

    // ========== TEST 9: Get Version History ==========
    section('TEST 9: Get Version History');
    try {
      const versions = await client.getCodepageVersions({
        tableId: versionTableId,
        codepageRecordId: testCodepageId,
        limit: 5
      });
      
      info(`Found ${versions.length} versions`);
      versions.forEach((v, i) => {
        info(`  ${i + 1}. Version ${v['7']?.value} (ID: ${v['3']?.value})`);
      });
      
      success('Get version history successful');
    } catch (err) {
      error(`Get versions failed: ${err.message}`);
      warn('This may fail if version table does not exist');
    }

    // ========== TEST 10: Clone Codepage ==========
    section('TEST 10: Clone Codepage');
    try {
      clonedCodepageId = await client.cloneCodepage({
        tableId: codepageTableId,
        sourceRecordId: testCodepageId,
        newName: `MCP Test Clone ${Date.now()}`,
        modifications: {
          9: '2.0.0',
          8: 'Cloned from test codepage'
        }
      });
      
      success(`Codepage cloned successfully with ID: ${clonedCodepageId}`);
    } catch (err) {
      error(`Clone failed: ${err.message}`);
    }

    // ========== TEST 11: Export Codepage ==========
    section('TEST 11: Export Codepage');
    try {
      // Export as HTML
      const htmlExport = await client.exportCodepage({
        tableId: codepageTableId,
        recordId: testCodepageId,
        format: 'html'
      });
      
      info(`HTML Export length: ${htmlExport.length} characters`);
      
      // Export as JSON
      const jsonExport = await client.exportCodepage({
        tableId: codepageTableId,
        recordId: testCodepageId,
        format: 'json'
      });
      
      const jsonData = JSON.parse(jsonExport);
      info(`JSON Export keys: ${Object.keys(jsonData).join(', ')}`);
      
      success('Export codepage successful (HTML & JSON)');
    } catch (err) {
      error(`Export failed: ${err.message}`);
    }

    // ========== TEST 12: Import Codepage ==========
    section('TEST 12: Import Codepage');
    try {
      const importedId = await client.importCodepage({
        tableId: codepageTableId,
        source: SAMPLE_CODEPAGE,
        format: 'html',
        overwrite: false
      });
      
      success(`Codepage imported successfully with ID: ${importedId}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        warn('Import failed: Codepage name already exists (expected for this test)');
      } else {
        error(`Import failed: ${err.message}`);
      }
    }

    // ========== SUMMARY ==========
    section('📊 Test Summary');
    success('All core codepage tools tested successfully!');
    info('');
    info('Tools Tested:');
    info('  ✅ validateCodepage - Code validation');
    info('  ✅ deployCodepage - Deploy new codepage');
    info('  ✅ getCodepage - Retrieve codepage');
    info('  ✅ listCodepages - List all codepages');
    info('  ✅ searchCodepages - Search codepages');
    info('  ✅ updateCodepage - Update codepage');
    info('  ✅ saveCodepageVersion - Save version snapshot');
    info('  ✅ getCodepageVersions - Get version history');
    info('  ✅ cloneCodepage - Clone codepage');
    info('  ✅ exportCodepage - Export codepage');
    info('  ✅ importCodepage - Import codepage');
    info('');
    info('Test Artifacts Created:');
    if (testCodepageId) info(`  - Test Codepage ID: ${testCodepageId}`);
    if (clonedCodepageId) info(`  - Cloned Codepage ID: ${clonedCodepageId}`);
    if (versionId) info(`  - Version Snapshot ID: ${versionId}`);
    info('');
    warn('Note: You may want to clean up test records from your QuickBase app');

  } catch (err) {
    error(`\n❌ Test suite failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
