import axios from 'axios';
import https from 'https';
import 'dotenv/config';

const QB_REALM = process.env.QB_REALM || 'vibe.quickbase.com';
const QB_USER_TOKEN = process.env.QB_USER_TOKEN;
const TABLE_ID = 'bvi2ms4e9';

async function createCodepageFields() {
    const axiosInstance = axios.create({
        baseURL: 'https://api.quickbase.com/v1',
        headers: {
            'QB-Realm-Hostname': QB_REALM,
            'Authorization': `QB-USER-TOKEN ${QB_USER_TOKEN}`,
            'Content-Type': 'application/json'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const fields = [
        { label: 'Code', fieldType: 'text-multi-line' },
        { label: 'Description', fieldType: 'text-multi-line' },
        { label: 'Dependencies', fieldType: 'text-multi-line' }
    ];

    console.log(`\n📦 Creating ${fields.length} fields in table ${TABLE_ID}...\n`);

    for (const field of fields) {
        try {
            const response = await axiosInstance.post(
                `/fields?tableId=${TABLE_ID}`,
                {
                    label: field.label,
                    fieldType: field.fieldType
                }
            );
            console.log(`✅ Created "${field.label}" - Field ${response.data.id}`);
        } catch (error) {
            if (error.response) {
                console.log(`⚠️  "${field.label}" - ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            } else {
                console.log(`❌ "${field.label}" - ${error.message}`);
            }
        }
    }

    // Get final field list
    console.log('\n📋 Final field list:\n');
    try {
        const response = await axiosInstance.get(`/fields?tableId=${TABLE_ID}`);
        response.data
            .filter(f => f.id >= 6) // Only show custom fields
            .forEach(f => {
                console.log(`  Field ${f.id}: ${f.label} (${f.fieldType})`);
            });
        console.log(`\n✅ Table ${TABLE_ID} has ${response.data.length} total fields (${response.data.filter(f => f.id >= 6).length} custom)`);
    } catch (error) {
        console.log('❌ Failed to get fields:', error.message);
    }
}

createCodepageFields();
