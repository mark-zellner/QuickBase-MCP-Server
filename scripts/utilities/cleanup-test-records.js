#!/usr/bin/env node
/**
 * Cleanup Test Records from QuickBase
 * Removes test codepage records created during testing
 */

import { QuickBaseClient } from './dist/quickbase/client.js';
import 'dotenv/config';

const TEST_RECORD_IDS = [3, 4, 5]; // Record IDs to delete
const CODEPAGE_TABLE_ID = 'bvi2ms4e9';

async function cleanup() {
    console.log('\n🧹 QuickBase Test Records Cleanup\n');
    console.log('Configuration:');
    console.log(`  Realm: ${process.env.QB_REALM}`);
    console.log(`  App ID: ${process.env.QB_APP_ID}`);
    console.log(`  Table ID: ${CODEPAGE_TABLE_ID}`);
    console.log(`  Records to delete: ${TEST_RECORD_IDS.join(', ')}\n`);

    const client = new QuickBaseClient({
        realm: process.env.QB_REALM,
        userToken: process.env.QB_USER_TOKEN,
        appId: process.env.QB_APP_ID
    });

    try {
        // First, verify the records exist
        console.log('🔍 Verifying test records exist...\n');
        for (const recordId of TEST_RECORD_IDS) {
            try {
                const record = await client.getRecord(CODEPAGE_TABLE_ID, recordId);
                const name = record['8']?.value || 'Unnamed';
                const version = record['9']?.value || 'N/A';
                console.log(`  ✅ Record ${recordId}: ${name} (v${version})`);
            } catch (error) {
                console.log(`  ⚠️  Record ${recordId}: Not found (may have been deleted)`);
            }
        }

        console.log('\n❓ Do you want to proceed with deletion? (This will permanently remove these records)');
        console.log('   Press Ctrl+C to cancel, or press Enter to continue...');

        // Wait for user confirmation
        await new Promise((resolve) => {
            process.stdin.once('data', resolve);
        });

        console.log('\n🗑️  Deleting test records...\n');
        let deletedCount = 0;
        let errorCount = 0;

        for (const recordId of TEST_RECORD_IDS) {
            try {
                await client.deleteRecord(CODEPAGE_TABLE_ID, recordId);
                console.log(`  ✅ Deleted Record ${recordId}`);
                deletedCount++;
            } catch (error) {
                console.log(`  ❌ Failed to delete Record ${recordId}: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n📊 Cleanup Summary:`);
        console.log(`  ✅ Deleted: ${deletedCount} record(s)`);
        console.log(`  ❌ Failed: ${errorCount} record(s)`);

        if (deletedCount === TEST_RECORD_IDS.length) {
            console.log('\n✨ All test records cleaned up successfully!\n');
        } else if (errorCount === TEST_RECORD_IDS.length) {
            console.log('\n⚠️  No records were deleted. They may have already been removed.\n');
        } else {
            console.log('\n⚠️  Partial cleanup completed. Some records may not have been deleted.\n');
        }

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Run cleanup
cleanup().catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});
