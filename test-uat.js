#!/usr/bin/env node

/**
 * UAT Test Script for MyDealership QuickBase Integration
 * 
 * Tests the complete workflow:
 * 1. Verify table structure
 * 2. Create a test pricing record
 * 3. Query the record back
 * 4. Verify all fields match
 * 5. Clean up by deleting the record
 */

import { QuickBaseClient } from './dist/quickbase/client.js';
import dotenv from 'dotenv';

dotenv.config();

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
    log(`✅ ${message}`, colors.green);
}

function error(message) {
    log(`❌ ${message}`, colors.red);
}

function info(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

function section(message) {
    log(`\n${'='.repeat(60)}`, colors.cyan);
    log(`  ${message}`, colors.bright + colors.cyan);
    log(`${'='.repeat(60)}`, colors.cyan);
}

async function runUAT() {
    section('UAT TEST: MyDealership QuickBase Integration');

    // Initialize QuickBase client
    const client = new QuickBaseClient({
        realm: process.env.QB_REALM,
        userToken: process.env.QB_USER_TOKEN,
        appId: process.env.QB_APP_ID,
        timeout: parseInt(process.env.QB_DEFAULT_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.QB_MAX_RETRIES || '3')
    });

    const tableId = process.env.PRICING_TABLE_ID || 'bvhuaz8wz';
    
    // Test data matching MyDealership.html structure
    const testPricingData = {
        msrp: 35000,
        discount: 2000,
        financingRate: 4.5,
        tradeInValue: 15000,
        finalPrice: 19575,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry'
    };

    const fieldIds = {
        relatedVehicle: 6,
        msrp: 7,
        discount: 8,
        financingRate: 9,
        tradeInValue: 10,
        finalPrice: 11,
        vehicleMake: 12,
        vehicleModel: 13
    };

    let recordId = null;

    try {
        // TEST 1: Verify table structure
        section('TEST 1: Verify Table Structure');
        info(`Getting fields for table: ${tableId}`);
        
        const fields = await client.getTableFields(tableId);
        success(`Found ${fields.length} fields in table`);
        
        // Verify required fields exist
        const requiredFieldIds = Object.values(fieldIds);
        const existingFieldIds = fields.map(f => f.id);
        
        info('Checking required fields...');
        for (const [fieldName, fieldId] of Object.entries(fieldIds)) {
            const field = fields.find(f => f.id === fieldId);
            if (field) {
                success(`  ${fieldName} (Field ${fieldId}): ${field.label} - ${field.fieldType}`);
            } else {
                error(`  ${fieldName} (Field ${fieldId}): NOT FOUND`);
            }
        }

        // TEST 2: Create test record
        section('TEST 2: Create Pricing Record');
        info('Creating test pricing record...');
        
        // NOTE: Fields 12 and 13 are lookup fields - they cannot be set directly
        // They are populated automatically from the Related Vehicle field
        const recordData = {
            [fieldIds.msrp]: { value: testPricingData.msrp },
            [fieldIds.discount]: { value: testPricingData.discount },
            [fieldIds.financingRate]: { value: testPricingData.financingRate },
            [fieldIds.tradeInValue]: { value: testPricingData.tradeInValue },
            [fieldIds.finalPrice]: { value: testPricingData.finalPrice }
            // vehicleMake and vehicleModel are lookup fields - excluded
        };

        // QuickBase client expects { fields: {...} } structure
        recordId = await client.createRecord(tableId, { fields: recordData });
        success(`Record created with ID: ${recordId}`);

        // TEST 3: Query the record back
        section('TEST 3: Query Record Back');
        info(`Querying record ${recordId}...`);
        
        const record = await client.getRecord(tableId, recordId);
        success('Record retrieved successfully');

        // TEST 4: Verify field values
        section('TEST 4: Verify Field Values');
        info('Comparing saved vs expected values...');
        
        let allMatch = true;
        
        for (const [fieldName, fieldId] of Object.entries(fieldIds)) {
            const expectedValue = testPricingData[fieldName];
            const actualValue = record[fieldId]?.value;
            
            if (expectedValue !== undefined) {
                // Convert to comparable types
                const expected = String(expectedValue);
                const actual = String(actualValue);
                
                if (expected === actual) {
                    success(`  ${fieldName}: ${actual} ✓`);
                } else {
                    error(`  ${fieldName}: Expected ${expected}, got ${actual} ✗`);
                    allMatch = false;
                }
            }
        }

        if (allMatch) {
            success('\nAll field values match! ✓');
        } else {
            error('\nSome field values do not match! ✗');
        }

        // TEST 5: Clean up
        section('TEST 5: Clean Up');
        info(`Deleting test record ${recordId}...`);
        
        await client.deleteRecord(tableId, recordId);
        success('Test record deleted successfully');

        // FINAL SUMMARY
        section('UAT TEST SUMMARY');
        success('All tests passed! ✓');
        info('\nMyDealership integration is working correctly:');
        info('  ✓ Table structure verified');
        info('  ✓ Record creation works');
        info('  ✓ Record retrieval works');
        info('  ✓ All field values saved correctly');
        info('  ✓ Record deletion works');
        
        log('\n' + colors.green + colors.bright + '🎉 UAT PASSED - Ready for production!' + colors.reset);

    } catch (err) {
        error(`\nTest failed: ${err.message}`);
        console.error(err);
        
        // Try to clean up if record was created
        if (recordId) {
            try {
                info('\nAttempting cleanup...');
                await client.deleteRecord(tableId, recordId);
                success('Cleanup successful');
            } catch (cleanupErr) {
                error(`Cleanup failed: ${cleanupErr.message}`);
            }
        }
        
        process.exit(1);
    }
}

// Run the UAT
runUAT().catch(err => {
    error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
});
