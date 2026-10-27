import axios from 'axios';
import https from 'https';
import 'dotenv/config';

const QB_REALM = process.env.QB_REALM || 'vibe.quickbase.com';
const QB_USER_TOKEN = process.env.QB_USER_TOKEN;
const TABLE_ID = 'bvi2ms4e9';

async function testFieldCreation() {
    const axiosInstance = axios.create({
        baseURL: 'https://api.quickbase.com/v1',
        headers: {
            'QB-Realm-Hostname': QB_REALM,
            'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
            'Content-Type': 'application/json'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    // Test 1: Simple text field
    console.log('\nTest 1: Creating simple text field...\n');
    try {
        const response = await axiosInstance.post(
            `/fields?tableId=${TABLE_ID}`,
            {
                label: 'Test Name',
                fieldType: 'text'
            }
        );
        console.log('✅ Success!', response.data);
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data);
    }

    // Test 2: With properties
    console.log('\nTest 2: Creating text field with properties...\n');
    try {
        const response = await axiosInstance.post(
            `/fields?tableId=${TABLE_ID}`,
            {
                label: 'Test Name 2',
                fieldType: 'text',
                properties: {
                    defaultValue: ''
                }
            }
        );
        console.log('✅ Success!', response.data);
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data);
    }

    // Test 3: Check what fields endpoint expects
    console.log('\nTest 3: Get existing fields to see structure...\n');
    try {
        const response = await axiosInstance.get(`/fields?tableId=${TABLE_ID}`);
        if (response.data.length > 0) {
            console.log('Sample field structure:', JSON.stringify(response.data[0], null, 2));
        }
    } catch (error) {
        console.log('❌ Failed:', error.message);
    }
}

testFieldCreation();
