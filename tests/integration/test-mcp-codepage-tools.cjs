#!/usr/bin/env node

/**
 * Test MCP Codepage Management Tools
 * Demonstrates the full codepage lifecycle using QuickBase MCP server tools
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CODEPAGE_TABLE = 'bltcpt7da'; // Codepage management table
const MYDEALERSHIP_FILE = path.join(__dirname, 'MyDealership.html');

console.log('🧪 Testing QuickBase MCP Codepage Management Tools\n');

// Read MyDealership.html
const code = fs.readFileSync(MYDEALERSHIP_FILE, 'utf8');
console.log(`✅ Loaded MyDealership.html (${code.length} characters)\n`);

// Test cases
const tests = [
  {
    name: 'Save Codepage',
    tool: 'quickbase_deploy_codepage',
    params: {
      tableId: CODEPAGE_TABLE,
      name: 'MyDealership - AI Pricing Calculator',
      code: code,
      description: 'UAT-tested version with lookup field fix - production ready',
      version: '2.0.0',
      tags: ['pricing', 'calculator', 'dealership', 'production'],
      targetTableId: 'bvhuaz8wz'
    }
  },
  {
    name: 'List All Codepages',
    tool: 'quickbase_list_codepages',
    params: {
      tableId: CODEPAGE_TABLE,
      limit: 10
    }
  },
  {
    name: 'Search Codepages',
    tool: 'quickbase_search_codepages',
    params: {
      tableId: CODEPAGE_TABLE,
      searchTerm: 'MyDealership',
      activeOnly: true
    }
  },
  {
    name: 'Validate Codepage',
    tool: 'quickbase_validate_codepage',
    params: {
      code: code.substring(0, 1000), // First 1000 chars for validation test
      checkSyntax: true,
      checkAPIs: true,
      checkSecurity: true
    }
  }
];

async function runMCPTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`   Tool: ${test.tool}`);
    console.log(`   Params:`, JSON.stringify(test.params, null, 2).substring(0, 200) + '...');
    
    const mcpServer = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    mcpServer.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    mcpServer.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    mcpServer.on('close', (code) => {
      if (code === 0) {
        console.log(`   ✅ Success`);
        console.log(`   Output:`, output.substring(0, 300) + '...');
        resolve({ success: true, output });
      } else {
        console.log(`   ❌ Failed (exit code ${code})`);
        console.log(`   Error:`, errorOutput);
        resolve({ success: false, error: errorOutput });
      }
    });
    
    // Send MCP request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: test.tool,
        arguments: test.params
      }
    };
    
    mcpServer.stdin.write(JSON.stringify(request) + '\n');
    mcpServer.stdin.end();
    
    // Timeout after 30 seconds
    setTimeout(() => {
      mcpServer.kill();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

async function runAllTests() {
  console.log('🚀 Starting MCP Codepage Tools Test Suite\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runMCPTest(test);
      results.push({ test: test.name, ...result });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ test: test.name, success: false, error: error.message });
    }
    
    // Wait between tests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Passed: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Successful Tests:');
    successful.forEach(r => console.log(`   - ${r.test}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(r => console.log(`   - ${r.test}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Next Steps:');
  console.log('   1. Review test results above');
  console.log('   2. If deploy succeeded, check QuickBase table:', CODEPAGE_TABLE);
  console.log('   3. Use recordId to retrieve/update codepage');
  console.log('   4. Deploy to production pageID using deploy instructions');
  
  process.exit(failed.length === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
