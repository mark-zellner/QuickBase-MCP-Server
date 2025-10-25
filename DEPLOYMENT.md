# QuickBase Codepage Deployment Guide

This guide walks you through deploying the QuickBase Codepage Hero library and MyDealership application to your QuickBase app.

## Prerequisites

- Access to a QuickBase app with administrative permissions
- Ability to create/edit codepages
- Knowledge of your table and field IDs

## Part 1: Deploy the QuickBase Client Library (pageID=3)

### Choose Your Authentication Method

QuickBase Codepage Hero supports two authentication methods:

1. **Temporary Token (v2.0)** - Session-based, no tokens to manage
   - ✅ Most secure (no tokens in code)
   - ❌ May not be available in all QuickBase realms
   - ❌ May not work with SSO

2. **App Token (v2.1)** - Token-based, universally supported
   - ✅ Works in all QuickBase realms
   - ✅ Works with SSO
   - ✅ More reliable
   - ⚠️ Token visible in codepage source (mitigate with permissions)

**Recommendation:** Start with App Token (v2.1) as it's more widely supported.

### Step 1: Create the Library Codepage

1. Navigate to your QuickBase app
2. Click **Settings** → **Advanced Settings** → **Pages**
3. Click **Create a Page** → **Code Page**
4. Set the following properties:
   - **Page Name**: `QuickBase Codepage Hero Library`
   - **Page ID**: `3` (or note the auto-assigned ID)
   - **Page Type**: `JavaScript (no HTML wrapper)`
   - **Access**: `Anyone in this app`

### Step 2: Copy the Library Code

**For App Token Authentication (Recommended):**

1. Open [quickbase_codepage_hero_apptoken.js](quickbase_codepage_hero_apptoken.js) from this repository
2. Copy the **entire contents** of the file
3. Paste into the codepage editor in QuickBase
4. Click **Save**

**For Temporary Token Authentication:**

1. Open [quickbase_codepage_hero.js](quickbase_codepage_hero.js) from this repository
2. Copy the **entire contents** of the file
3. Paste into the codepage editor in QuickBase
4. Click **Save**

**For Troubleshooting:**

If you encounter errors, use the diagnostic version:
1. Open [quickbase_codepage_hero_diagnostic.js](quickbase_codepage_hero_diagnostic.js)
2. Follow the same deployment steps
3. See [TROUBLESHOOTING_404.md](TROUBLESHOOTING_404.md) for diagnosis steps

### Step 3: Verify the Library

1. Open browser DevTools (F12)
2. Navigate to your app: `https://YOUR_REALM.quickbase.com/db/YOUR_APP_ID`
3. In the console, load the library manually to test:

```javascript
// Create a script tag to load the library
const script = document.createElement('script');
script.src = '/db/YOUR_APP_ID?a=dbpage&pageID=3';
document.head.appendChild(script);

// Wait a moment, then check if it loaded
setTimeout(() => {
    console.log('Client mode:', window.qbClient?.mode);
    console.log('Client methods:', Object.keys(window.qbClient || {}));
}, 1000);
```

You should see:
```
[QuickBase Codepage Hero] v2.0.0 - Temporary token client initialized
Client mode: session-temp-token
```

### Troubleshooting Library Deployment

**Issue**: "Uncaught SyntaxError: Unexpected identifier"

**Solution**:
- Ensure the codepage type is "JavaScript (no HTML wrapper)"
- Ensure you copied the ENTIRE file contents without modifications
- Check that there are no `<script>` tags in the codepage

**Issue**: "Failed to get temporary token: 401"

**Solution**:
- Verify you're logged into QuickBase
- Check that your user has access to the app
- Try refreshing your browser session

## Part 1.5: Configure Authentication (App Token Only)

**Skip this section if you're using Temporary Token authentication.**

If you deployed the App Token version, you need to create and configure an app token:

### Step 1: Create an App Token

1. Go to your QuickBase app
2. Click **Settings** → **App Properties**
3. Scroll down and click **Advanced Settings**
4. Click **Manage App Tokens**
5. Click **New App Token**
6. Configure the token:
   - **Name**: `MyDealership Codepage`
   - **Description**: `Token for MyDealership pricing calculator codepage`
7. Click **Save**
8. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

Example token: `b10b_dsds_0_ca9aj9dtjdbp8k5vgj3nnd3zb`

### Step 2: Test the Token (Optional)

In your browser console on any QuickBase page:

```javascript
// Load the library
const script = document.createElement('script');
script.src = '/db/YOUR_APP_ID?a=dbpage&pageID=3';
document.head.appendChild(script);

// Wait a moment, then configure and test
setTimeout(async () => {
    qbClient.setAppToken('YOUR_APP_TOKEN_HERE');

    // Test by getting fields
    const fields = await qbClient.getFields('YOUR_TABLE_ID');
    console.log('✅ Token works! Fields:', fields.length);
}, 2000);
```

If you see "✅ Token works!", you're good to go!

## Part 2: Deploy MyDealership Application (pageID=2)

### Step 1: Create Your Tables

Before deploying the app, ensure you have the required tables:

#### Pricing Calculator Table

Create a table called "Pricing Calculator" with these fields:

| Field ID | Field Name | Type | Description |
|----------|------------|------|-------------|
| 3 | Record ID# | Numeric - Auto | Auto-generated ID |
| 6 | Related Vehicle | Numeric | Relationship to Vehicles table |
| 7 | MSRP | Currency | Manufacturer's suggested retail price |
| 8 | Discount | Currency | Discount amount |
| 9 | Financing Rate | Percent | Annual percentage rate |
| 10 | Trade-In Value | Currency | Value of trade-in vehicle |
| 11 | Final Price | Currency | Calculated final price |
| 12 | Vehicle Make | Text | Vehicle manufacturer |
| 13 | Vehicle Model | Text | Vehicle model name |

#### Vehicles Table (Optional)

Create a table called "Vehicles" for loading vehicle data dynamically:

| Field ID | Field Name | Type |
|----------|------------|------|
| 3 | Record ID# | Numeric - Auto |
| 6 | Make | Text |
| 7 | Model | Text |
| 8 | Year | Numeric |
| 9 | MSRP | Currency |

### Step 2: Get Your IDs

You'll need the following IDs:

**App ID**: Found in the URL: `https://YOUR_REALM.quickbase.com/db/bvhuaz7pn`
- App ID is `bvhuaz7pn`

**Table IDs**:
1. Go to the table
2. Look at the URL: `https://YOUR_REALM.quickbase.com/db/bvhuaz8wz`
3. Table ID is `bvhuaz8wz`

**Field IDs**:
1. Go to table settings
2. Click **Fields**
3. Note the field ID numbers (shown as "FID")

### Step 3: Create the Application Codepage

1. Create a new code page:
   - **Page Name**: `MyDealership Pricing Calculator`
   - **Page ID**: `2` (or note the auto-assigned ID)
   - **Page Type**: `HTML` (with full HTML wrapper)
   - **Access**: `Anyone in this app` or specific roles

2. Copy the contents of [MyDealership.html](MyDealership.html)

3. **IMPORTANT**: Update the CONFIG section with your IDs:

```javascript
const CONFIG = {
    pricingTableId: 'bvhuaz8wz', // YOUR Pricing Calculator table ID
    vehiclesTableId: 'bvhuaz7s5', // YOUR Vehicles table ID (optional)

    // YOUR field IDs from Pricing Calculator table
    fields: {
        relatedVehicle: 6,    // FID for Related Vehicle
        msrp: 7,              // FID for MSRP
        discount: 8,          // FID for Discount
        financingRate: 9,     // FID for Financing Rate
        tradeInValue: 10,     // FID for Trade-In Value
        finalPrice: 11,       // FID for Final Price
        vehicleMake: 12,      // FID for Vehicle Make
        vehicleModel: 13      // FID for Vehicle Model
    }
};
```

4. Update the CODEPAGE path if your library is not at pageID=3:

```javascript
const CODEPAGE = '/db/YOUR_APP_ID?a=dbpage&pageID=3';
```

5. Click **Save**

### Step 4: Test the Application

1. Access your codepage: `https://YOUR_REALM.quickbase.com/db/YOUR_APP_ID?a=dbpage&pageID=2`

2. Open browser DevTools (F12) and check the console for:
```
[QB Loader] ✓ Loaded from: /db/YOUR_APP_ID?a=dbpage&pageID=3
[QuickBase Codepage Hero] v2.0.0 - Temporary token client initialized
```

3. Fill out the pricing form:
   - Select a vehicle
   - Enter MSRP (auto-fills from selection)
   - Enter discount amount
   - Enter financing rate
   - Enter trade-in value
   - Select loan term

4. Click **Calculate Pricing**

5. Verify the calculations appear

6. Click **Save to QuickBase**

7. Check the console for:
```
[Save] Using client mode: session-temp-token
[Save] Record data: {...}
[QB] POST /records (attempt 1)
[QB] Success: POST /records
[Save] Success: {...}
```

8. Go to your Pricing Calculator table and verify the record was created

## Part 3: Customization

### Adding More Vehicle Data

To load vehicles dynamically from the Vehicles table:

```javascript
async function loadVehiclesFromQuickBase() {
    try {
        const result = await window.qbClient.queryRecords(CONFIG.vehiclesTableId, {
            select: [3, 6, 7, 8, 9], // Record ID, Make, Model, Year, MSRP
            orderBy: [
                { fieldId: 6, order: 'ASC' }, // Sort by Make
                { fieldId: 7, order: 'ASC' }  // Then by Model
            ]
        });

        const vehicles = result.data;
        populateVehicleSelect(vehicles);
    } catch (error) {
        console.error('Failed to load vehicles:', error);
    }
}

function populateVehicleSelect(vehicles) {
    const select = document.getElementById('vehicleSelect');

    // Clear existing options except first
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add vehicles
    vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle[3].value; // Record ID
        option.textContent = `${vehicle[6].value} ${vehicle[7].value} ${vehicle[8].value}`;
        option.dataset.msrp = vehicle[9].value;
        option.dataset.make = vehicle[6].value;
        option.dataset.model = vehicle[7].value;
        select.appendChild(option);
    });
}

// Update the vehicle selection handler
vehicleSelect.addEventListener('change', () => {
    const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
    if (selectedOption.dataset.msrp) {
        msrpInput.value = selectedOption.dataset.msrp;
    }
});

// Load vehicles on page load
window.addEventListener('load', () => {
    if (window.qbClient && window.qbClient.mode !== 'error') {
        loadVehiclesFromQuickBase();
    }
});
```

### Creating a Multi-Table Dashboard

To create an app that can save to any table in the app:

```javascript
const APP_ID = 'bvhuaz7pn';

// Load all tables on page load
async function loadAllTables() {
    try {
        const tables = await window.qbClient.getTables(APP_ID);

        const tableSelect = document.getElementById('tableSelect');
        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.name;
            tableSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load tables:', error);
    }
}

// Load fields when table is selected
async function loadTableFields(tableId) {
    try {
        const fields = await window.qbClient.getFields(tableId);
        renderDynamicForm(fields);
    } catch (error) {
        console.error('Failed to load fields:', error);
    }
}

// Render form based on field schema
function renderDynamicForm(fields) {
    const form = document.getElementById('dynamicForm');
    form.innerHTML = ''; // Clear existing

    fields.forEach(field => {
        // Only show user-editable fields
        if (field.mode === 'user' || field.mode === 'normal') {
            const fieldDiv = createFormField(field);
            form.appendChild(fieldDiv);
        }
    });
}

function createFormField(field) {
    const div = document.createElement('div');
    div.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.setAttribute('for', `field_${field.id}`);

    const input = document.createElement('input');
    input.id = `field_${field.id}`;
    input.name = field.id;
    input.required = field.required;

    // Set input type based on field type
    switch (field.fieldType) {
        case 'text':
        case 'text-multi-line':
            input.type = 'text';
            break;
        case 'numeric':
        case 'currency':
        case 'percent':
            input.type = 'number';
            input.step = '0.01';
            break;
        case 'date':
            input.type = 'date';
            break;
        case 'email':
            input.type = 'email';
            break;
        case 'url':
            input.type = 'url';
            break;
        case 'checkbox':
            input.type = 'checkbox';
            break;
        default:
            input.type = 'text';
    }

    div.appendChild(label);
    div.appendChild(input);
    return div;
}

// Save form data to selected table
async function saveDynamicForm() {
    const tableId = document.getElementById('tableSelect').value;
    const form = document.getElementById('dynamicForm');
    const formData = new FormData(form);

    const recordData = {};
    for (const [fieldId, value] of formData.entries()) {
        recordData[fieldId] = { value: value };
    }

    try {
        const result = await window.qbClient.createRecords(tableId, [recordData]);
        alert('Record saved successfully!');
    } catch (error) {
        alert(`Failed to save: ${error.message}`);
    }
}
```

## Part 4: Advanced Configuration

### Custom Error Handling

Add custom error handling for better user experience:

```javascript
function handleQuickBaseError(error) {
    if (error.message.includes('401')) {
        return 'Session expired. Please refresh the page and try again.';
    } else if (error.message.includes('403')) {
        return 'You do not have permission to perform this action.';
    } else if (error.message.includes('404')) {
        return 'Table or record not found. Check your configuration.';
    } else {
        return `An error occurred: ${error.message}`;
    }
}

// Use in save function
try {
    await window.qbClient.createRecords(tableId, records);
} catch (error) {
    const userMessage = handleQuickBaseError(error);
    showSaveStatus(`❌ ${userMessage}`, 'error');
}
```

### Adding Loading States

Improve UX with loading indicators:

```javascript
function showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    loading.textContent = message;
    loading.style.display = 'block';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
}

// Use in async operations
async function loadData() {
    showLoading('Loading vehicles...');
    try {
        const vehicles = await window.qbClient.queryRecords(tableId, options);
        populateVehicleSelect(vehicles.data);
    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();
    }
}
```

## Troubleshooting

### Common Issues

**Issue**: Console shows `[QB Loader] ✗ Failed to load: /db/...?a=dbpage&pageID=3`

**Solutions**:
1. Verify pageID=3 exists and contains the library code
2. Check that the pageID in MyDealership.html matches your library page
3. Ensure the library page is set to "Anyone in this app" access

**Issue**: Save fails with "Failed to get temporary token"

**Solutions**:
1. Refresh the page to establish a new session
2. Check user permissions on the target table
3. Verify the table ID is correct

**Issue**: "Client mode: inline" instead of "session-temp-token"

**Solutions**:
1. The external library failed to load, but the inline fallback works
2. This is acceptable for basic operations
3. To use the full library, fix the loading issue from the error above

**Issue**: Record saves but some fields are empty

**Solutions**:
1. Verify field IDs match your table's actual field IDs
2. Check that field names in CONFIG.fields are correct
3. Ensure field types match the data being sent (currency vs numeric, etc.)

## Security Considerations

1. **Never embed user tokens or app tokens** in codepages
2. **Always use temporary token authentication** as shown in this guide
3. **Validate user input** before saving to QuickBase
4. **Use role-based access control** to limit who can access codepages
5. **Log important operations** for audit trails
6. **Sanitize user input** to prevent injection attacks

## Next Steps

- Review [CLAUDE.md](CLAUDE.md) for AI-assisted development workflows
- Explore [guides/CODEPAGE_HERO_OPTIONS.md](guides/CODEPAGE_HERO_OPTIONS.md) for advanced features
- Check [guides/Authentication_Best_Practices.md](guides/Authentication_Best_Practices.md) for security tips

## Support

For questions or issues:
1. Check this deployment guide
2. Review console logs for error details
3. Consult [CLAUDE.md](CLAUDE.md) for development guidance
4. Open an issue in the GitHub repository
