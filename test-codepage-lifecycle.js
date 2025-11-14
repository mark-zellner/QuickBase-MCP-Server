import { QuickBaseClient } from './dist/quickbase/client.js';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

console.log('🧪 Testing QuickBase Codepage Lifecycle Management\n');

const config = {
  realm: process.env.QB_REALM,
  userToken: process.env.QB_USER_TOKEN,
  appId: process.env.QB_APP_ID,
  timeout: 30000,
  maxRetries: 3
};

const codepageTableId = process.env.CODEPAGE_TABLE_ID || 'bvi2ms4e9';
const versionsTableId = process.env.CODEPAGE_VERSIONS_TABLE_ID || 'bvi2ms4ea';

console.log('Configuration:');
console.log(`  Realm: ${config.realm}`);
console.log(`  App ID: ${config.appId}`);
console.log(`  Codepage Table: ${codepageTableId}`);
console.log(`  Versions Table: ${versionsTableId}\n`);

const client = new QuickBaseClient(config);

// Sample codepage for testing
const sampleCodepage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Calculator</title>
    <script src="https://cdn.quickbase.com/static/lib/qdb.js"></script>
</head>
<body>
    <h1>Test Calculator</h1>
    <input type="number" id="num1" placeholder="Number 1">
    <input type="number" id="num2" placeholder="Number 2">
    <button onclick="calculate()">Calculate</button>
    <div id="result"></div>
    
    <script>
        async function calculate() {
            const num1 = parseFloat(document.getElementById('num1').value) || 0;
            const num2 = parseFloat(document.getElementById('num2').value) || 0;
            const sum = num1 + num2;
            document.getElementById('result').textContent = 'Sum: ' + sum;
            
            // Save to QuickBase using session auth
            if (typeof qdb !== 'undefined' && qdb.api) {
                try {
                    await qdb.api.addRecord('YOUR_TABLE_ID', {
                        6: { value: num1 },
                        7: { value: num2 },
                        8: { value: sum }
                    });
                    console.log('Saved to QuickBase!');
                } catch (error) {
                    console.error('Save failed:', error);
                }
            }
        }
    </script>
</body>
</html>`;

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function runTests() {
  let deployedRecordId;
  let versionRecordId;
  let clonedRecordId;

  try {
    // Test 1: Deploy new codepage
    console.log('\n📦 Test 1: Deploy Codepage...');
    try {
      deployedRecordId = await client.deployCodepage({
        tableId: codepageTableId,
        name: `Test Calculator ${new Date().getTime()}`,
        code: sampleCodepage,
        description: 'Test codepage for lifecycle testing',
        version: '1.0.0',
        tags: ['test', 'calculator', 'demo'],
        dependencies: ['qdb.js'],
        targetTableId: 'bvhuaz8wz'
      });
      logTest('Deploy Codepage', !!deployedRecordId, `Record ID: ${deployedRecordId}`);
    } catch (error) {
      logTest('Deploy Codepage', false, error.message);
    }

    if (!deployedRecordId) {
      throw new Error('Deployment failed - cannot continue tests');
    }

    // Test 2: Get codepage
    console.log('\n📖 Test 2: Get Codepage...');
    try {
      const retrieved = await client.getCodepage(codepageTableId, deployedRecordId);
      const hasCode = !!retrieved['13']?.value;
      const hasName = !!retrieved['8']?.value;
      logTest('Get Codepage', hasCode && hasName, `Has code: ${hasCode}, Has name: ${hasName}`);
    } catch (error) {
      logTest('Get Codepage', false, error.message);
    }

    // Test 3: List codepages
    console.log('\n📋 Test 3: List Codepages...');
    try {
      const list = await client.listCodepages(codepageTableId, 5);
      logTest('List Codepages', list.length > 0, `Found ${list.length} codepages`);
    } catch (error) {
      logTest('List Codepages', false, error.message);
    }

    // Test 4: Search codepages
    console.log('\n🔍 Test 4: Search Codepages...');
    try {
      const searchResults = await client.searchCodepages({
        tableId: codepageTableId,
        tags: ['test'],
        activeOnly: true
      });
      logTest('Search Codepages', searchResults.length > 0, `Found ${searchResults.length} test codepages`);
    } catch (error) {
      logTest('Search Codepages', false, error.message);
    }

    // Test 5: Update codepage
    console.log('\n✏️ Test 5: Update Codepage...');
    try {
      await client.updateCodepage({
        tableId: codepageTableId,
        recordId: deployedRecordId,
        description: 'Updated test codepage description',
        version: '1.0.1'
      });
      const updated = await client.getCodepage(codepageTableId, deployedRecordId);
      const versionUpdated = updated['9']?.value === '1.0.1';
      logTest('Update Codepage', versionUpdated, `Version: ${updated['9']?.value}`);
    } catch (error) {
      logTest('Update Codepage', false, error.message);
    }

    // Test 6: Validate codepage
    console.log('\n🔒 Test 6: Validate Codepage...');
    try {
      const validation = await client.validateCodepage({
        code: sampleCodepage,
        checkSyntax: true,
        checkAPIs: true,
        checkSecurity: true
      });
      logTest('Validate Codepage', validation.isValid, 
        `Errors: ${validation.errors.length}, Warnings: ${validation.warnings.length}, Security: ${validation.securityIssues.length}`);
      
      if (validation.warnings.length > 0) {
        console.log('   Warnings:', validation.warnings.join(', '));
      }
    } catch (error) {
      logTest('Validate Codepage', false, error.message);
    }

    // Test 7: Clone codepage
    console.log('\n👥 Test 7: Clone Codepage...');
    try {
      clonedRecordId = await client.cloneCodepage({
        tableId: codepageTableId,
        sourceRecordId: deployedRecordId,
        newName: `Test Calculator Clone ${new Date().getTime()}`,
        modifications: {
          '9': '2.0.0', // Update version
          '14': 'Cloned and modified test codepage'
        }
      });
      logTest('Clone Codepage', !!clonedRecordId, `Cloned to Record ID: ${clonedRecordId}`);
    } catch (error) {
      logTest('Clone Codepage', false, error.message);
    }

    // Test 8: Export codepage
    console.log('\n📤 Test 8: Export Codepage...');
    try {
      // Export as JSON
      const jsonExport = await client.exportCodepage({
        tableId: codepageTableId,
        recordId: deployedRecordId,
        format: 'json'
      });
      const jsonParsed = JSON.parse(jsonExport);
      logTest('Export Codepage (JSON)', !!jsonParsed.code, `Has code: ${!!jsonParsed.code}`);

      // Export as HTML
      const htmlExport = await client.exportCodepage({
        tableId: codepageTableId,
        recordId: deployedRecordId,
        format: 'html'
      });
      logTest('Export Codepage (HTML)', htmlExport.includes('<!DOCTYPE'), 'HTML format valid');

      // Export as Markdown
      const mdExport = await client.exportCodepage({
        tableId: codepageTableId,
        recordId: deployedRecordId,
        format: 'markdown'
      });
      logTest('Export Codepage (Markdown)', mdExport.includes('##'), 'Markdown format valid');
    } catch (error) {
      logTest('Export Codepage', false, error.message);
    }

    // Test 9: Save codepage version
    console.log('\n💾 Test 9: Save Codepage Version...');
    try {
      versionRecordId = await client.saveCodepageVersion({
        tableId: versionsTableId,
        codepageRecordId: deployedRecordId,
        version: '1.0.0',
        code: sampleCodepage,
        changeLog: 'Initial version save for testing'
      });
      logTest('Save Codepage Version', !!versionRecordId, `Version Record ID: ${versionRecordId}`);
    } catch (error) {
      logTest('Save Codepage Version', false, error.message);
    }

    // Test 10: Get codepage versions
    console.log('\n📚 Test 10: Get Codepage Versions...');
    try {
      const versions = await client.getCodepageVersions({
        tableId: versionsTableId,
        codepageRecordId: deployedRecordId,
        limit: 10
      });
      logTest('Get Codepage Versions', versions.length > 0, `Found ${versions.length} versions`);
    } catch (error) {
      logTest('Get Codepage Versions', false, error.message);
    }

    // Test 11: Import codepage
    console.log('\n📥 Test 11: Import Codepage...');
    try {
      const importData = {
        name: `Imported Test ${new Date().getTime()}`,
        code: '<html><body><h1>Imported</h1></body></html>',
        description: 'Test import',
        version: '1.0.0',
        tags: ['imported', 'test']
      };
      const importedId = await client.importCodepage({
        tableId: codepageTableId,
        source: JSON.stringify(importData),
        format: 'json',
        overwrite: false
      });
      logTest('Import Codepage', !!importedId, `Imported Record ID: ${importedId}`);
    } catch (error) {
      logTest('Import Codepage', false, error.message);
    }

    // Test 12: Execute codepage (safe check)
    console.log('\n▶️ Test 12: Execute Codepage...');
    try {
      const execResult = await client.executeCodepage(
        codepageTableId,
        deployedRecordId,
        'calculate',
        { num1: 5, num2: 10 }
      );
      logTest('Execute Codepage', !!execResult.code, 'Execution metadata returned');
    } catch (error) {
      logTest('Execute Codepage', false, error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Codepage lifecycle management is fully functional.');
    } else {
      console.log('\n⚠️ Some tests failed. Review the results above for details.');
    }

    // Save results to file
    const resultsFile = 'test-results-codepage-lifecycle.json';
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: {
        codepageTableId,
        versionsTableId
      },
      results: testResults,
      recordsCreated: {
        deployedRecordId,
        versionRecordId,
        clonedRecordId
      }
    }, null, 2));
    console.log(`\n📄 Detailed results saved to ${resultsFile}`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
await runTests();
