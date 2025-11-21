#!/usr/bin/env node

/**
 * Quick API Discovery Script
 * Tests if we can programmatically update QuickBase code pages
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const CONFIG = {
    realm: process.env.QB_REALM || 'vibe.quickbase.com',
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID || 'bvhuaz7pn',
    pageId: 2 // MyDealership page
};

const httpClient = axios.create({
    timeout: 10000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

console.log('🔍 QuickBase Code Page API Discovery\n');
console.log('Config:', {
    realm: CONFIG.realm,
    appId: CONFIG.appId,
    pageId: CONFIG.pageId,
    hasToken: !!CONFIG.userToken
});

async function main() {
    if (!CONFIG.userToken) {
        console.error('\n❌ QB_USER_TOKEN not set in .env');
        process.exit(1);
    }

    console.log('\n📋 Testing QuickBase Page APIs...\n');

    // Test 1: Can we GET the existing page?
    try {
        console.log('Test 1: GET page content...');
        const response = await httpClient.get(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?a=dbpage&pageID=${CONFIG.pageId}`,
            {
                headers: {
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        const html = response.data;
        console.log(`✅ GET succeeded - Page size: ${html.length} bytes`);
        
        // Check if we can see the code
        const hasCode = html.includes('<!DOCTYPE html>');
        console.log(`   Contains HTML code: ${hasCode ? 'Yes' : 'No (may be wrapped)'}`);
        
    } catch (error) {
        console.log(`❌ GET failed: ${error.message}`);
    }

    // Test 2: XML API - Can we query the page table?
    try {
        console.log('\nTest 2: Query pages via XML API...');
        const response = await httpClient.get(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?a=API_DoQuery&query={1.GT.0}&clist=1.2.3`,
            {
                headers: {
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log(`✅ Query succeeded - Response size: ${response.data.length} bytes`);
        
    } catch (error) {
        console.log(`❌ Query failed: ${error.message}`);
    }

    // Test 3: Check REST API capabilities
    try {
        console.log('\nTest 3: Check REST API app info...');
        const response = await httpClient.get(
            `https://api.quickbase.com/v1/apps/${CONFIG.appId}`,
            {
                headers: {
                    'QB-Realm-Hostname': CONFIG.realm,
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`
                }
            }
        );
        
        console.log(`✅ REST API works - App: ${response.data.name || 'Unknown'}`);
        
    } catch (error) {
        console.log(`❌ REST API failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINDINGS\n');
    
    console.log('🎯 Recommended Approach:');
    console.log('   Based on QuickBase limitations, code pages (pageID) cannot be');
    console.log('   updated via REST or XML APIs. They require browser interaction.');
    console.log('');
    console.log('💡 Solutions:');
    console.log('   1. Use Playwright MCP for browser automation (fully automated)');
    console.log('   2. Use current hybrid approach (clipboard + manual paste)');
    console.log('   3. Store code in management table, reference from page');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   → Option 1: Integrate Playwright MCP server');
    console.log('   → Option 2: Keep deploy-automated.js workflow');
    console.log('   → Option 3: Modify architecture (code in table, not page)');
}

main().catch(error => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
});
