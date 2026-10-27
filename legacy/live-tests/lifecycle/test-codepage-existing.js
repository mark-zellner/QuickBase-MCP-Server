import { QuickBaseClient } from './dist/quickbase/client.js';
import 'dotenv/config';

const QB_REALM = process.env.QB_REALM || 'vibe.quickbase.com';
const QB_USER_TOKEN = process.env.QB_USER_TOKEN;
const QB_APP_ID = process.env.QB_APP_ID || 'bvhuaz7pn';

// Use existing table ID from previous creation
const CODEPAGE_TABLE_ID = 'bvi2ms4e9';

async function main() {
    console.log('\n🚀 QuickBase Codepage MCP Tools - Using Existing Table\n');
    console.log('Configuration:');
    console.log(`  Realm: ${QB_REALM}`);
    console.log(`  App ID: ${QB_APP_ID}`);
    console.log(`  Table ID: ${CODEPAGE_TABLE_ID}`);
    
    const client = new QuickBaseClient({
        realm: QB_REALM,
        userToken: QB_USER_TOKEN,
        appId: QB_APP_ID
    });

    try {
        // Check existing fields
        console.log('\n============================================================');
        console.log('  📋 STEP 1: Check Table Structure');
        console.log('============================================================');
        const fields = await client.getTableFields(CODEPAGE_TABLE_ID);
        console.log(`\n✅ Table has ${fields.length} fields:`);
        fields.forEach(f => {
            console.log(`  Field ${f.id}: ${f.label} (${f.type})`);
        });

        // Create missing fields if needed
        console.log('\n============================================================');
        console.log('  📦 STEP 2: Ensure Required Fields Exist');
        console.log('============================================================');
        
        const requiredFields = [
            { label: 'Name', fieldType: 'text', required: true },
            { label: 'Code', fieldType: 'text_multiline', required: true },
            { label: 'Description', fieldType: 'text_multiline', required: false },
            { label: 'Version', fieldType: 'text', required: false },
            { label: 'Tags', fieldType: 'text', required: false },
            { label: 'Dependencies', fieldType: 'text_multiline', required: false },
            { label: 'Target Table ID', fieldType: 'text', required: false },
            { label: 'Active', fieldType: 'checkbox', required: false }
        ];

        for (const fieldDef of requiredFields) {
            const exists = fields.find(f => f.label === fieldDef.label);
            if (!exists) {
                console.log(`Creating "${fieldDef.label}"...`);
                try {
                    const fieldId = await client.createField(CODEPAGE_TABLE_ID, fieldDef);
                    console.log(`  ✅ Created field ${fieldId}`);
                } catch (error) {
                    console.log(`  ⚠️ Failed to create "${fieldDef.label}": ${error.message}`);
                }
            } else {
                console.log(`✅ "${fieldDef.label}" exists (Field ${exists.id})`);
            }
        }

        // Refresh field list
        const updatedFields = await client.getTableFields(CODEPAGE_TABLE_ID);
        console.log(`\n✅ Table now has ${updatedFields.length} fields`);

        // Find field IDs by name
        const getFieldId = (label) => {
            const field = updatedFields.find(f => f.label === label);
            return field ? field.id : null;
        };

        const nameField = getFieldId('Name');
        const codeField = getFieldId('Code');
        const descField = getFieldId('Description');
        const versionField = getFieldId('Version');
        const activeField = getFieldId('Active');

        console.log('\nField Mapping:');
        console.log(`  Name: Field ${nameField}`);
        console.log(`  Code: Field ${codeField}`);
        console.log(`  Description: Field ${descField}`);
        console.log(`  Version: Field ${versionField}`);
        console.log(`  Active: Field ${activeField}`);

        // Test 1: Validate Codepage
        console.log('\n============================================================');
        console.log('  ✅ STEP 3: Validate Codepage Code');
        console.log('============================================================');
        
        const sampleCode = `<!DOCTYPE html>
<html>
<head>
    <title>Sample Calculator</title>
</head>
<body>
    <h1>Simple Calculator</h1>
    <input type="number" id="num1" placeholder="Number 1">
    <input type="number" id="num2" placeholder="Number 2">
    <button onclick="calculate()">Calculate</button>
    <div id="result"></div>
    <script>
        function calculate() {
            const n1 = parseFloat(document.getElementById('num1').value);
            const n2 = parseFloat(document.getElementById('num2').value);
            document.getElementById('result').innerHTML = 'Sum: ' + (n1 + n2);
        }
    </script>
</body>
</html>`;

        const validationResult = await client.validateCodepage({ code: sampleCode });
        console.log('\nValidation Results:');
        console.log(`  Valid: ${validationResult.valid ? '✅ Yes' : '❌ No'}`);
        console.log(`  Errors: ${validationResult.errors?.length || 0}`);
        console.log(`  Warnings: ${validationResult.warnings?.length || 0}`);
        console.log(`  Security Issues: ${validationResult.securityIssues?.length || 0}`);

        // Test 2: Deploy Codepage (if we have required fields)
        if (nameField && codeField) {
            console.log('\n============================================================');
            console.log('  🚀 STEP 4: Deploy Codepage');
            console.log('============================================================');
            
            const deployResult = await client.deployCodepage({
                tableId: CODEPAGE_TABLE_ID,
                name: 'Test Calculator',
                code: sampleCode,
                description: 'A simple calculator for testing',
                version: '1.0.0'
            });

            console.log(`\n✅ Codepage deployed successfully!`);
            console.log(`  Record ID: ${deployResult.recordId}`);
            
            // Test 3: Get Codepage
            console.log('\n============================================================');
            console.log('  📖 STEP 5: Get Codepage (#mcp_quickbase_quickbase_get_codepage)');
            console.log('============================================================');
            
            const retrievedCodepage = await client.getCodepage(CODEPAGE_TABLE_ID, deployResult.recordId);

            console.log('\nCodepage Details:');
            console.log(`  ID: ${retrievedCodepage['3']?.value || 'N/A'}`);
            console.log(`  Name: ${retrievedCodepage['8']?.value || 'N/A'}`);
            console.log(`  Version: ${retrievedCodepage['9']?.value || 'N/A'}`);
            console.log(`  Active: ${retrievedCodepage['12']?.value ? 'Yes' : 'No'}`);
            console.log(`  Code Length: ${retrievedCodepage['13']?.value?.length || 0} characters`);

            // Test 4: List Codepages
            console.log('\n============================================================');
            console.log('  📋 STEP 6: List All Codepages');
            console.log('============================================================');
            
            const allCodepages = await client.listCodepages(CODEPAGE_TABLE_ID, 10);

            console.log(`\n✅ Found ${allCodepages.length} codepage(s):`);
            allCodepages.forEach((cp, idx) => {
                console.log(`  ${idx + 1}. ${cp['8']?.value || 'Unnamed'} (v${cp['9']?.value || '?'}) - Record ${cp['3']?.value}`);
            });

            // Test 5: Search Codepages
            console.log('\n============================================================');
            console.log('  🔍 STEP 7: Search Codepages');
            console.log('============================================================');
            
            const searchResults = await client.searchCodepages({
                tableId: CODEPAGE_TABLE_ID,
                searchTerm: 'Calculator'
            });

            console.log(`\n✅ Search for "Calculator" found ${searchResults.length} result(s)`);

            // Test 6: Export Codepage
            console.log('\n============================================================');
            console.log('  📤 STEP 8: Export Codepage');
            console.log('============================================================');
            
            const exportedHTML = await client.exportCodepage({
                tableId: CODEPAGE_TABLE_ID,
                recordId: deployResult.recordId,
                format: 'html'
            });

            console.log(`\n✅ Exported as HTML (${exportedHTML.length} characters)`);
            console.log(`First 200 chars: ${exportedHTML.substring(0, 200)}...`);

        } else {
            console.log('\n⚠️ Skipping deploy test - missing required fields');
            console.log(`  Name field: ${nameField || 'MISSING'}`);
            console.log(`  Code field: ${codeField || 'MISSING'}`);
        }

        // Summary
        console.log('\n============================================================');
        console.log('  🎉 SUMMARY');
        console.log('============================================================');
        console.log(`\n✅ Codepages table ready: ${CODEPAGE_TABLE_ID}`);
        console.log(`✅ Fields configured: ${updatedFields.length} total`);
        console.log(`\n🔧 To use with MCP tools:`);
        console.log(`   - Table ID: ${CODEPAGE_TABLE_ID}`);
        console.log(`   - Add to .env: CODEPAGE_TABLE_ID=${CODEPAGE_TABLE_ID}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response?.data) {
            console.error('API Response:', error.response.data);
        }
        process.exit(1);
    }
}

main();
