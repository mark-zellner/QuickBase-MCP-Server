import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

console.log('🗺️ Mapping QuickBase App Structure...\n');

const config = {
  realm: process.env.QB_REALM,
  userToken: process.env.QB_USER_TOKEN,
  appId: process.env.QB_APP_ID
};

console.log('Configuration:');
console.log(`  Realm: ${config.realm}`);
console.log(`  App ID: ${config.appId}`);
console.log(`  Token: ${config.userToken ? '***' + config.userToken.slice(-4) : 'Missing'}\n`);

const baseURL = `https://api.quickbase.com/v1`;
const headers = {
  'QB-Realm-Hostname': config.realm,
  'User-Agent': 'QuickBase-MCP-Test/1.0.0',
  'Authorization': `QB-USER-TOKEN ${config.userToken}`,
  'Content-Type': 'application/json'
};

try {
  // Step 1: List all tables in the app
  console.log('📋 Step 1: Listing tables in app...');
  const tablesResponse = await axios.get(
    `${baseURL}/tables?appId=${config.appId}`,
    { headers }
  );

  const tables = tablesResponse.data;
  console.log(`✅ Found ${tables.length} tables:\n`);

  const appStructure = {
    appId: config.appId,
    realm: config.realm,
    tables: []
  };

  for (const table of tables) {
    console.log(`📊 Table: ${table.name} (ID: ${table.id})`);
    console.log(`   Description: ${table.description || 'No description'}`);

    const tableInfo = {
      id: table.id,
      name: table.name,
      description: table.description,
      fields: [],
      sampleRecords: []
    };

    // Step 2: Get fields for this table
    console.log(`   🔍 Getting fields...`);
    const fieldsResponse = await axios.get(
      `${baseURL}/fields?tableId=${table.id}&appId=${config.appId}`,
      { headers }
    );

    const fields = fieldsResponse.data;
    console.log(`   ✅ Found ${fields.length} fields:`);

    for (const field of fields) {
      console.log(`     - ${field.label} (ID: ${field.id}, Type: ${field.fieldType})`);
      tableInfo.fields.push({
        id: field.id,
        label: field.label,
        type: field.fieldType,
        required: field.required || false,
        unique: field.unique || false
      });
    }

    // Step 3: Query sample records (up to 3)
    console.log(`   📈 Getting sample records...`);
    try {
      const recordsResponse = await axios.post(
        `${baseURL}/records/query`,
        {
          from: table.id,
          select: fields.slice(0, 5).map(f => f.id), // First 5 fields
          options: {
            top: 3
          }
        },
        { headers }
      );

      const records = recordsResponse.data.data;
      console.log(`   ✅ Found ${records.length} sample records`);

      for (const [index, record] of records.entries()) {
        const recordData = {};
        for (const field of fields.slice(0, 5)) {
          recordData[field.label] = record[field.id]?.value || null;
        }
        tableInfo.sampleRecords.push(recordData);
        console.log(`     Record ${index + 1}: ${JSON.stringify(recordData)}`);
      }
    } catch (recordError) {
      console.log(`   ⚠️  Could not query records: ${recordError.response?.data?.message || recordError.message}`);
    }

    appStructure.tables.push(tableInfo);
    console.log(''); // Empty line between tables
  }

  // Step 4: Output AI-ready structure
  console.log('🤖 AI-Ready Data Structure:');
  console.log(JSON.stringify(appStructure, null, 2));

  console.log('\n🎉 App mapping complete!');

} catch (error) {
  console.error('❌ Mapping failed:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', JSON.stringify(error.response.data, null, 2));
  }
}