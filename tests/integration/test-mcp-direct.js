import { QuickBaseClient } from './dist/quickbase/client.js';
import 'dotenv/config';

console.log('\n🔍 MCP Server Diagnostics\n');

console.log('Environment Variables:');
console.log(`  QB_REALM: ${process.env.QB_REALM || 'NOT SET'}`);
console.log(`  QB_USER_TOKEN: ${process.env.QB_USER_TOKEN ? '***' + process.env.QB_USER_TOKEN.slice(-6) : 'NOT SET'}`);
console.log(`  QB_APP_ID: ${process.env.QB_APP_ID || 'NOT SET'}`);
console.log(`  CODEPAGE_TABLE_ID: ${process.env.CODEPAGE_TABLE_ID || 'NOT SET'}`);

const client = new QuickBaseClient({
    realm: process.env.QB_REALM,
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID
});

console.log('\n📡 Testing Connection...');

try {
    const appInfo = await client.getAppInfo();
    console.log('✅ Connection successful!');
    console.log(`   App Name: ${appInfo.name}`);
    console.log(`   App ID: ${appInfo.id}`);
    
    console.log('\n📋 Testing Table Access...');
    const tables = await client.getAppTables();
    console.log(`✅ Found ${tables.length} tables`);
    
    const codepageTable = tables.find(t => t.id === 'bvi2ms4e9');
    if (codepageTable) {
        console.log(`✅ Codepage table found: "${codepageTable.name}"`);
    } else {
        console.log('⚠️ Codepage table not found in app');
    }
    
    console.log('\n🚀 Testing Deploy...');
    const recordId = await client.deployCodepage({
        tableId: 'bvi2ms4e9',
        name: 'MCP Test Calculator',
        code: '<html><body><h1>Test</h1></body></html>',
        description: 'Testing MCP deployment',
        version: '1.0.0'
    });
    console.log(`✅ Deployed successfully! Record ID: ${recordId}`);
    
    console.log('\n📖 Testing Get...');
    const codepage = await client.getCodepage('bvi2ms4e9', recordId);
    console.log('✅ Retrieved codepage:');
    console.log(`   Name: ${codepage['8']?.value}`);
    console.log(`   Version: ${codepage['9']?.value}`);
    console.log(`   Code Length: ${codepage['13']?.value?.length || 0} chars`);
    
    console.log('\n✅ All tests passed!');
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
    }
    process.exit(1);
}
