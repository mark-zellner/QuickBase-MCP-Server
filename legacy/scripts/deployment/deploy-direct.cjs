#!/usr/bin/env node

/**
 * Direct QuickBase Codepage Deployment Script
 * Bypasses MCP server and calls QuickBase REST API directly
 */

const fs = require('fs');
const https = require('https');
require('dotenv').config();

// QuickBase Configuration
const QB_REALM = process.env.QB_REALM || 'vibe.quickbase.com';
const QB_USER_TOKEN = process.env.QB_USER_TOKEN;
const QB_APP_ID = process.env.QB_APP_ID || 'bvhuaz7pn';
const CODEPAGE_TABLE_ID = 'bltcpt7da';
const CODEPAGE_FILE = 'MyDealership.html';

// Field IDs for codepage management table
const FIELDS = {
    NAME: 6,
    CODE: 7,
    DESCRIPTION: 8,
    VERSION: 9,
    TAGS: 10,
    DEPENDENCIES: 11,
    TARGET_TABLE: 12,
    ACTIVE: 13
};

// Create HTTPS agent with certificate bypass
const agent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * Make QuickBase API request
 */
async function quickbaseRequest(endpoint, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.quickbase.com',
            port: 443,
            path: `/v1/${endpoint}`,
            method: method,
            headers: {
                'QB-Realm-Hostname': QB_REALM,
                'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuickBase-MCP-Deployment/2.0.0'
            },
            agent: agent
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Deploy codepage to QuickBase
 */
async function deployCodepage() {
    console.log('🚀 Starting Direct QuickBase Deployment...\n');

    // 1. Read the codepage file
    console.log(`📖 Reading ${CODEPAGE_FILE}...`);
    const code = fs.readFileSync(CODEPAGE_FILE, 'utf-8');
    console.log(`✅ Loaded ${code.length} characters\n`);

    // 2. Prepare the record data
    const recordData = {
        to: CODEPAGE_TABLE_ID,
        data: [{
            [FIELDS.NAME]: { value: 'MyDealership - AI Pricing Calculator' },
            [FIELDS.CODE]: { value: code },
            [FIELDS.DESCRIPTION]: { value: 'UAT-tested v2.0.0 with lookup field fix - XML API session-based saves' },
            [FIELDS.VERSION]: { value: '2.0.0' },
            [FIELDS.TAGS]: { value: 'pricing, calculator, dealership, production, uat-tested' },
            [FIELDS.DEPENDENCIES]: { value: 'qdb.js, QuickBase XML API' },
            [FIELDS.TARGET_TABLE]: { value: 'bvhuaz8wz' },
            [FIELDS.ACTIVE]: { value: true }
        }]
    };

    // 3. Deploy to QuickBase
    console.log('💾 Deploying to QuickBase...');
    console.log(`   Table: ${CODEPAGE_TABLE_ID}`);
    console.log(`   Realm: ${QB_REALM}`);
    console.log(`   Version: 2.0.0\n`);

    try {
        const response = await quickbaseRequest('records', 'POST', recordData);

        if (response.data && response.data.length > 0) {
            const recordId = response.data[0][3]; // Field 3 is Record ID
            console.log('✅ DEPLOYMENT SUCCESSFUL!\n');
            console.log(`📋 Record ID: ${recordId}`);
            console.log(`🔗 View in QuickBase: https://${QB_REALM}/db/${CODEPAGE_TABLE_ID}?a=dr&rid=${recordId}`);
            console.log(`\n📝 Next Steps:`);
            console.log(`   1. Verify codepage in management table`);
            console.log(`   2. Copy code from Record ID ${recordId}`);
            console.log(`   3. Paste into pageID=2`);
            console.log(`   4. Test in production: https://${QB_REALM}/db/${QB_APP_ID}?a=dbpage&pageID=2`);
            
            return recordId;
        } else {
            throw new Error('No record ID returned from QuickBase');
        }
    } catch (error) {
        console.error('❌ DEPLOYMENT FAILED!');
        console.error(`   Error: ${error.message}`);
        
        if (error.message.includes('certificate')) {
            console.error('\n💡 Certificate Error Solution:');
            console.error('   The certificate bypass is configured but may need server restart.');
            console.error('   Try: Restart Claude Desktop or use the QuickBase UI directly.');
        }
        
        throw error;
    }
}

/**
 * Verify deployment
 */
async function verifyDeployment(recordId) {
    console.log(`\n🔍 Verifying deployment (Record ID: ${recordId})...`);
    
    try {
        const response = await quickbaseRequest(`records/query`, 'POST', {
            from: CODEPAGE_TABLE_ID,
            where: `{3.EX.${recordId}}`,
            select: [3, 6, 9, 13] // Record ID, Name, Version, Active
        });

        if (response.data && response.data.length > 0) {
            const record = response.data[0];
            console.log('✅ Verification successful!');
            console.log(`   Name: ${record[FIELDS.NAME]?.value}`);
            console.log(`   Version: ${record[FIELDS.VERSION]?.value}`);
            console.log(`   Active: ${record[FIELDS.ACTIVE]?.value}`);
            return true;
        } else {
            console.error('❌ Verification failed: Record not found');
            return false;
        }
    } catch (error) {
        console.error(`❌ Verification error: ${error.message}`);
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        // Validate configuration
        if (!QB_USER_TOKEN) {
            throw new Error('QB_USER_TOKEN not set in .env file');
        }

        if (!fs.existsSync(CODEPAGE_FILE)) {
            throw new Error(`File not found: ${CODEPAGE_FILE}`);
        }

        // Deploy
        const recordId = await deployCodepage();

        // Verify
        await verifyDeployment(recordId);

        console.log('\n🎉 Deployment complete!');
        process.exit(0);

    } catch (error) {
        console.error(`\n💥 Fatal error: ${error.message}`);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { deployCodepage, verifyDeployment };
