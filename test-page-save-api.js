#!/usr/bin/env node

/**
 * QuickBase Code Page API Research Script
 * 
 * Tests various QuickBase APIs to find the working method for deploying code pages.
 * Run this to discover which endpoint and format works for programmatic deployment.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const https = require('https');

// Configuration
const CONFIG = {
    realm: process.env.QB_REALM || 'vibe.quickbase.com',
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID || 'bvhuaz7pn',
    testPageId: 999, // Use a test page ID (create one manually first)
    timeout: 30000
};

// Test HTML code
const TEST_CODE = `<!DOCTYPE html>
<html><head><title>Test Page</title></head>
<body><h1>Test Code Page - ${new Date().toISOString()}</h1></body></html>`;

// HTTP client with certificate bypass
const httpClient = axios.create({
    timeout: CONFIG.timeout,
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Add request/response logging
httpClient.interceptors.request.use(request => {
    console.log('\n🔵 REQUEST:', request.method.toUpperCase(), request.url);
    console.log('Headers:', JSON.stringify(request.headers, null, 2));
    if (request.data) {
        const preview = String(request.data).substring(0, 200);
        console.log('Body preview:', preview + (request.data.length > 200 ? '...' : ''));
    }
    return request;
});

httpClient.interceptors.response.use(
    response => {
        console.log('✅ RESPONSE:', response.status, response.statusText);
        const preview = String(response.data).substring(0, 200);
        console.log('Body preview:', preview);
        return response;
    },
    error => {
        console.error('❌ ERROR:', error.response?.status, error.response?.statusText);
        console.error('Error data:', error.response?.data);
        return Promise.reject(error);
    }
);

/**
 * Test 1: REST API - Check if /api/v1 has page endpoints
 */
async function testRestApi() {
    console.log('\n\n=== TEST 1: REST API ===');
    
    const endpoints = [
        `/api/v1/pages/${CONFIG.testPageId}`,
        `/api/v1/apps/${CONFIG.appId}/pages/${CONFIG.testPageId}`,
        `/api/v1/apps/${CONFIG.appId}/pages`,
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await httpClient.get(`https://${CONFIG.realm}${endpoint}`, {
                headers: {
                    'QB-Realm-Hostname': CONFIG.realm,
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ REST API endpoint found:', endpoint);
            console.log('Response:', response.data);
            return { success: true, endpoint, data: response.data };
            
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('⚠️  Endpoint not found:', endpoint);
            } else {
                console.error('❌ Error testing endpoint:', endpoint, error.message);
            }
        }
    }
    
    return { success: false, message: 'No REST API endpoints found' };
}

/**
 * Test 2: XML API - PageSave action
 */
async function testXmlPageSave() {
    console.log('\n\n=== TEST 2: XML API - PageSave ===');
    
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<qdbapi>
    <pageid>${CONFIG.testPageId}</pageid>
    <pagename>Test Code Page</pagename>
    <pagetype>1</pagetype>
    <pagebody>${escapeXml(TEST_CODE)}</pagebody>
</qdbapi>`;
    
    try {
        const response = await httpClient.post(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?a=API_PageSave`,
            xmlBody,
            {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log('✅ XML PageSave succeeded');
        return { success: true, method: 'XML API_PageSave', data: response.data };
        
    } catch (error) {
        console.error('❌ XML PageSave failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 3: XML API - EditPage action
 */
async function testXmlEditPage() {
    console.log('\n\n=== TEST 3: XML API - EditPage ===');
    
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<qdbapi>
    <pageid>${CONFIG.testPageId}</pageid>
    <pagebody>${escapeXml(TEST_CODE)}</pagebody>
</qdbapi>`;
    
    try {
        const response = await httpClient.post(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?a=API_EditPage`,
            xmlBody,
            {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log('✅ XML EditPage succeeded');
        return { success: true, method: 'XML API_EditPage', data: response.data };
        
    } catch (error) {
        console.error('❌ XML EditPage failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 4: URL-based Page Save (like manual browser save)
 */
async function testUrlPageSave() {
    console.log('\n\n=== TEST 4: URL-based Page Save ===');
    
    const params = new URLSearchParams({
        a: 'dbpage',
        pageID: CONFIG.testPageId,
        pagename: 'Test Code Page',
        pagebody: TEST_CODE,
        save: '1'
    });
    
    try {
        const response = await httpClient.post(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?${params.toString()}`,
            null,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log('✅ URL-based save succeeded');
        return { success: true, method: 'URL-based save', data: response.data };
        
    } catch (error) {
        console.error('❌ URL-based save failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 5: FormData POST (like form submission)
 */
async function testFormDataSave() {
    console.log('\n\n=== TEST 5: FormData Save ===');
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('a', 'PageSave');
    form.append('pageID', CONFIG.testPageId);
    form.append('pagename', 'Test Code Page');
    form.append('pagebody', TEST_CODE);
    
    try {
        const response = await httpClient.post(
            `https://${CONFIG.realm}/db/${CONFIG.appId}`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log('✅ FormData save succeeded');
        return { success: true, method: 'FormData POST', data: response.data };
        
    } catch (error) {
        console.error('❌ FormData save failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test 6: Check existing page retrieval
 */
async function testGetPage() {
    console.log('\n\n=== TEST 6: Get Existing Page ===');
    
    try {
        const response = await httpClient.get(
            `https://${CONFIG.realm}/db/${CONFIG.appId}?a=dbpage&pageID=${CONFIG.testPageId}`,
            {
                headers: {
                    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
                    'QB-Realm-Hostname': CONFIG.realm
                }
            }
        );
        
        console.log('✅ Page retrieved successfully');
        
        // Try to extract page content
        const html = response.data;
        console.log('Page HTML length:', html.length);
        
        return { success: true, method: 'GET page', data: html };
        
    } catch (error) {
        console.error('❌ Page retrieval failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Helper function
function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Main execution
async function runAllTests() {
    console.log('🔬 QuickBase Code Page API Research');
    console.log('====================================');
    console.log('Realm:', CONFIG.realm);
    console.log('App ID:', CONFIG.appId);
    console.log('Test Page ID:', CONFIG.testPageId);
    console.log('User Token:', CONFIG.userToken ? '***' + CONFIG.userToken.slice(-8) : 'NOT SET');
    
    if (!CONFIG.userToken) {
        console.error('\n❌ ERROR: QB_USER_TOKEN not set in .env file');
        process.exit(1);
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        tests: []
    };
    
    // Run all tests
    const tests = [
        { name: 'REST API', fn: testRestApi },
        { name: 'XML PageSave', fn: testXmlPageSave },
        { name: 'XML EditPage', fn: testXmlEditPage },
        { name: 'URL-based Save', fn: testUrlPageSave },
        { name: 'FormData Save', fn: testFormDataSave },
        { name: 'Get Page', fn: testGetPage }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            results.tests.push({
                name: test.name,
                ...result
            });
        } catch (error) {
            results.tests.push({
                name: test.name,
                success: false,
                error: error.message
            });
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n\n📊 RESULTS SUMMARY');
    console.log('==================');
    
    const successful = results.tests.filter(t => t.success);
    console.log(`\n✅ Successful: ${successful.length}/${results.tests.length}`);
    
    if (successful.length > 0) {
        console.log('\n🎯 Working Methods:');
        successful.forEach(test => {
            console.log(`  - ${test.name}: ${test.method || 'Success'}`);
        });
    }
    
    const failed = results.tests.filter(t => !t.success);
    if (failed.length > 0) {
        console.log('\n❌ Failed Methods:');
        failed.forEach(test => {
            console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
        });
    }
    
    // Save results to file
    const outputFile = 'test-page-save-results.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full results saved to: ${outputFile}`);
    
    // Recommendation
    console.log('\n💡 RECOMMENDATION:');
    if (successful.length > 0) {
        const best = successful[0];
        console.log(`Use "${best.name}" method for MCP implementation`);
        console.log(`Implementation details saved in ${outputFile}`);
    } else {
        console.log('⚠️  No working methods found.');
        console.log('Manual browser-based deployment may be the only option.');
        console.log('Consider using Playwright/Puppeteer for browser automation.');
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
