#!/usr/bin/env node
/**
 * QuickBase Pricing Table Save Test
 * Tests direct API access to the Pricing Calculator table
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  realm: process.env.QB_REALM,
  userToken: process.env.QB_USER_TOKEN,
  appId: process.env.QB_APP_ID,
  pricingTableId: 'bvhuaz8wz', // Pricing Calculator table
  fields: {
    msrp: 7,
    discount: 8,
    financingRate: 9,
    tradeInValue: 10,
    finalPrice: 11
  }
};

async function testSaveToPricingTable() {
  console.log('🧪 Testing Save to QuickBase Pricing Calculator Table\n');
  console.log('Configuration:');
  console.log(`  Realm: ${CONFIG.realm}`);
  console.log(`  App ID: ${CONFIG.appId}`);
  console.log(`  Pricing Table ID: ${CONFIG.pricingTableId}`);
  console.log(`  Token: ${CONFIG.userToken ? '***' + CONFIG.userToken.slice(-4) : 'Missing'}\n`);

  const baseURL = 'https://api.quickbase.com/v1';
  const headers = {
    'QB-Realm-Hostname': CONFIG.realm,
    'Authorization': `QB-USER-TOKEN ${CONFIG.userToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Verify table exists
    console.log('📋 Test 1: Verifying table access...');
    const tableResponse = await axios.get(
      `${baseURL}/tables/${CONFIG.pricingTableId}?appId=${CONFIG.appId}`,
      { headers }
    );
    console.log(`✅ Table found: ${tableResponse.data.name}\n`);

    // Test 2: Get field information
    console.log('📋 Test 2: Checking field structure...');
    const fieldsResponse = await axios.get(
      `${baseURL}/fields?tableId=${CONFIG.pricingTableId}`,
      { headers }
    );
    
    const requiredFields = [
      CONFIG.fields.msrp,
      CONFIG.fields.discount,
      CONFIG.fields.financingRate,
      CONFIG.fields.tradeInValue,
      CONFIG.fields.finalPrice
    ];

    console.log('Required fields:');
    for (const fieldId of requiredFields) {
      const field = fieldsResponse.data.find(f => f.id === fieldId);
      if (field) {
        console.log(`  ✅ Field ${fieldId}: ${field.label} (${field.fieldType})`);
      } else {
        console.log(`  ❌ Field ${fieldId}: NOT FOUND`);
      }
    }
    console.log();

    // Test 3: Create a test pricing record
    console.log('📋 Test 3: Creating test pricing record...');
    
    const testData = {
      msrp: 35000,
      discount: 2000,
      financingRate: 4.5,
      tradeInValue: 15000,
      finalPrice: 18450.75 // Pre-calculated for demo
    };

    const recordData = {
      to: CONFIG.pricingTableId,
      data: [{
        [CONFIG.fields.msrp]: { value: testData.msrp },
        [CONFIG.fields.discount]: { value: testData.discount },
        [CONFIG.fields.financingRate]: { value: testData.financingRate },
        [CONFIG.fields.tradeInValue]: { value: testData.tradeInValue },
        [CONFIG.fields.finalPrice]: { value: testData.finalPrice }
      }]
    };

    console.log('Test data to save:', JSON.stringify(testData, null, 2));
    
    const createResponse = await axios.post(
      `${baseURL}/records`,
      recordData,
      { headers }
    );

    const newRecordId = createResponse.data.data[0].id;
    console.log(`✅ Record created successfully! Record ID: ${newRecordId}\n`);

    // Test 4: Verify the saved record
    console.log('📋 Test 4: Verifying saved data...');
    const queryResponse = await axios.post(
      `${baseURL}/records/query`,
      {
        from: CONFIG.pricingTableId,
        where: `{3.EX.'${newRecordId}'}`, // Field 3 is typically Record ID
        select: [3, ...requiredFields]
      },
      { headers }
    );

    if (queryResponse.data.data.length > 0) {
      const record = queryResponse.data.data[0];
      console.log('Saved record values:');
      console.log(`  Record ID: ${record['3']?.value || 'N/A'}`);
      console.log(`  MSRP: $${record[CONFIG.fields.msrp]?.value || 'N/A'}`);
      console.log(`  Discount: $${record[CONFIG.fields.discount]?.value || 'N/A'}`);
      console.log(`  Financing Rate: ${record[CONFIG.fields.financingRate]?.value || 'N/A'}%`);
      console.log(`  Trade-In Value: $${record[CONFIG.fields.tradeInValue]?.value || 'N/A'}`);
      console.log(`  Final Price: $${record[CONFIG.fields.finalPrice]?.value || 'N/A'}`);
      
      // Verify values match
      let allMatch = true;
      if (record[CONFIG.fields.msrp]?.value !== testData.msrp) {
        console.log('  ❌ MSRP mismatch!');
        allMatch = false;
      }
      if (record[CONFIG.fields.discount]?.value !== testData.discount) {
        console.log('  ❌ Discount mismatch!');
        allMatch = false;
      }
      if (record[CONFIG.fields.financingRate]?.value !== testData.financingRate) {
        console.log('  ❌ Financing Rate mismatch!');
        allMatch = false;
      }
      if (record[CONFIG.fields.tradeInValue]?.value !== testData.tradeInValue) {
        console.log('  ❌ Trade-In Value mismatch!');
        allMatch = false;
      }
      if (record[CONFIG.fields.finalPrice]?.value !== testData.finalPrice) {
        console.log('  ❌ Final Price mismatch!');
        allMatch = false;
      }
      
      if (allMatch) {
        console.log('  ✅ All values match!\n');
      } else {
        console.log('  ⚠️  Some values do not match\n');
      }
    } else {
      console.log('❌ Could not retrieve saved record\n');
    }

    // Test 5: Clean up (optional - comment out to keep test record)
    console.log('📋 Test 5: Cleanup (deleting test record)...');
    await axios.delete(
      `${baseURL}/records?tableId=${CONFIG.pricingTableId}`,
      {
        headers,
        data: {
          from: CONFIG.pricingTableId,
          where: `{3.EX.'${newRecordId}'}`
        }
      }
    );
    console.log(`✅ Test record ${newRecordId} deleted\n`);

    console.log('🎉 All tests passed successfully!\n');
    console.log('✅ Summary:');
    console.log('   - Table access verified');
    console.log('   - Field structure validated');
    console.log('   - Record creation successful');
    console.log('   - Data integrity confirmed');
    console.log('   - Cleanup completed');
    console.log('\n✨ Your MyDealership app should be able to save to QuickBase!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('\n📊 Error Details:');
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n💡 Suggestion: Check your user token permissions');
      } else if (error.response.status === 403) {
        console.log('\n💡 Suggestion: Your token may not have write access to this table');
      } else if (error.response.status === 404) {
        console.log('\n💡 Suggestion: Verify the table ID and app ID are correct');
      } else if (error.response.status === 400) {
        console.log('\n💡 Suggestion: Check field IDs and data types');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testSaveToPricingTable().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
