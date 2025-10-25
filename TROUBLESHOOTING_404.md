# Troubleshooting QuickBase 404 Errors

This guide helps diagnose and fix the `HTTP 404: {"message":"Not Found", "description":"Path not found"}` error when using QuickBase Codepage Hero.

## Understanding the Error

The 404 error indicates that the QuickBase API server cannot find the endpoint you're trying to access. This can happen at two points:

1. **Temporary Token Endpoint** (`/auth/temporary/{tableId}`) - When requesting a temporary token
2. **Records Endpoint** (`/records`) - When creating/updating records

## Quick Diagnosis

### Step 1: Use the Diagnostic Version

Replace your current library with the diagnostic version to get detailed logging:

1. Copy [quickbase_codepage_hero_diagnostic.js](quickbase_codepage_hero_diagnostic.js)
2. Replace the code in your pageID=3 codepage
3. Reload your application page
4. Open browser console (F12)

You should see:
```
============================================
[QuickBase Codepage Hero] DIAGNOSTIC v2.0.1
============================================

Run qbDiagnostic.checkAuth() for diagnostic info
Run qbDiagnostic.testTempToken("tableId") to test
```

### Step 2: Check Authentication

In the browser console, run:

```javascript
qbDiagnostic.checkAuth()
```

This will display:
- Your realm name
- Base URL being used
- Session cookie status

### Step 3: Test Temporary Token Endpoint

```javascript
await qbDiagnostic.testTempToken('bvhuaz8wz')  // Replace with your table ID
```

This will test if the temporary token endpoint is available and show:
- The exact URL being called
- HTTP status code
- Response headers
- Error details if it fails

## Common Causes and Solutions

### Cause 1: Temporary Token API Not Available

**Symptoms:**
- `testTempToken()` returns 404
- Error message: `Failed to get temporary token: 404`

**Explanation:**
The `/auth/temporary/{tableId}` endpoint might not be available in your QuickBase realm. This feature:
- May require specific QuickBase subscription levels
- Might not be enabled for all accounts
- Could be restricted by your organization's security settings

**Solutions:**

#### Solution A: Contact QuickBase Support

Contact QuickBase support to verify if temporary token authentication is available for your realm:

1. Go to QuickBase support
2. Ask: "Is the REST API `/v1/auth/temporary/{tableId}` endpoint available for my realm?"
3. Reference your realm name (e.g., `vibe.quickbase.com`)

#### Solution B: Use App Token Authentication (Recommended)

App tokens are more widely supported. See [Alternative Authentication](#alternative-authentication-app-tokens) below.

### Cause 2: Incorrect Table ID

**Symptoms:**
- `testTempToken()` works for some tables but not others
- Error occurs during `createRecords()` call

**Solution:**

Verify your table ID in CONFIG:

```javascript
// In MyDealership.html
const CONFIG = {
    pricingTableId: 'bvhuaz8wz',  // Check this ID!
    // ...
};
```

To find your table ID:
1. Go to the table in QuickBase
2. Look at the URL: `https://YOUR_REALM.quickbase.com/db/bvhuaz8wz`
3. The table ID is `bvhuaz8wz`

### Cause 3: Incorrect Field IDs

**Symptoms:**
- Token request succeeds
- Record creation returns 404 or other error

**Solution:**

Verify your field IDs match your table schema:

```javascript
const CONFIG = {
    fields: {
        msrp: 7,              // FID 7
        discount: 8,          // FID 8
        // ...
    }
};
```

To find field IDs:
1. Go to table settings → Fields
2. Look for "FID" column
3. Match the field names to FID numbers

### Cause 4: Session Cookie Issues

**Symptoms:**
- 401 or 403 errors before 404
- "Failed to get temporary token: 401"

**Solution:**

1. **Refresh your browser** to establish a new session
2. **Clear cache and cookies** for quickbase.com
3. **Log out and log back in** to QuickBase
4. Verify you have access to the app and table

### Cause 5: SSO (Single Sign-On) Restrictions

**Symptoms:**
- Works for some users but not others
- Users with SSO get errors

**Explanation:**
Users authenticated via SSO may have restrictions on temporary token generation.

**Solution:**

Use App Token authentication instead (see below).

## Alternative Authentication Methods

If temporary tokens don't work, you have two secure alternatives:

### Option 1: Pure Session Authentication (MOST SECURE - NO TOKENS)

**Best for:** Security-conscious environments where token exposure is not acceptable

This method uses ONLY your QuickBase session cookies - no tokens of any kind are required or exposed in the code.

#### Deploy Pure Session Version

1. Copy [quickbase_codepage_hero_session.js](quickbase_codepage_hero_session.js)
2. Deploy to your codepage at pageID=3
3. That's it! No tokens to configure.

#### How It Works

- All API requests include `credentials: 'include'` to send session cookies
- QuickBase authenticates using your current login session
- No tokens are stored, transmitted, or visible in code
- Uses the logged-in user's permissions automatically

#### Advantages

✅ **Maximum security** - Zero tokens in code
✅ **User-specific permissions** - Each user's own access level
✅ **No configuration** - Just deploy and use
✅ **Session-scoped** - Access tied to active QuickBase login

#### Limitations

⚠️ **Must be in QuickBase** - Won't work from external domains
⚠️ **Session required** - User must be logged into QuickBase
⚠️ **CORS restrictions** - Only works within QuickBase environment

#### Test Pure Session Authentication

```javascript
// Test if it works
const result = await qbClient.testConnection('YOUR_TABLE_ID');
console.log(result);

// Should return:
// {
//   success: true,
//   message: 'Connection successful',
//   fieldsCount: 15
// }
```

### Option 2: App Token Authentication

**Best for:** When you need to work outside QuickBase or need app-level permissions

If temporary tokens don't work, use app tokens. App tokens are more widely supported and work reliably across all QuickBase environments.

### Step 1: Create an App Token

1. Go to your QuickBase app
2. Click **Settings** → **App Properties**
3. Click **Advanced Settings** → **Manage App Tokens**
4. Click **New App Token**
5. Enter a name: "MyDealership Codepage"
6. Copy the token (you won't see it again!)

### Step 2: Update the Client Library

Create a new version that uses app tokens:

```javascript
/**
 * QuickBase Codepage Hero - App Token Version
 * Version: 2.1.0
 */

(function() {
    'use strict';

    class QuickBaseClient {
        constructor(options = {}) {
            this.mode = 'app-token';
            this.baseURL = 'https://api.quickbase.com/v1';
            this.appToken = options.appToken || '';
            this.maxRetries = 3;

            const hostname = window.location.hostname;
            if (hostname.includes('quickbase.com')) {
                const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
                this.realm = realmMatch ? realmMatch[1] : hostname;
            } else {
                this.realm = 'localhost';
            }

            console.log('[QuickBaseClient] App Token Mode - Realm:', this.realm);
        }

        setAppToken(token) {
            this.appToken = token;
            console.log('[QuickBaseClient] App token configured');
        }

        async request(method, endpoint, data = null) {
            if (!this.appToken) {
                throw new Error('App token not configured. Call qbClient.setAppToken("YOUR_TOKEN")');
            }

            let url = `${this.baseURL}${endpoint}`;

            const config = {
                method: method.toUpperCase(),
                headers: {
                    'Authorization': `QB-APP-TOKEN ${this.appToken}`,
                    'Content-Type': 'application/json',
                    'QB-Realm-Hostname': `${this.realm}.quickbase.com`
                }
            };

            if (data && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
                config.body = JSON.stringify(data);
            } else if (data && method.toUpperCase() === 'GET') {
                const params = new URLSearchParams();
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        params.append(key, value.toString());
                    }
                });
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, config);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json();
        }

        async createRecords(tableId, records) {
            const data = {
                to: tableId,
                data: Array.isArray(records) ? records : [records]
            };
            return this.request('POST', '/records', data);
        }

        async queryRecords(tableId, options = {}) {
            const data = { from: tableId, ...options };
            return this.request('POST', '/records/query', data);
        }

        async getFields(tableId) {
            return this.request('GET', '/fields', { tableId });
        }

        async getTables(appId) {
            return this.request('GET', '/tables', { appId });
        }
    }

    const client = new QuickBaseClient();

    if (typeof window !== 'undefined') {
        window.qbClient = client;
        window.client = client;
        window.QuickBaseClient = QuickBaseClient;
    }

    console.log('[QuickBase Codepage Hero] v2.1.0 - App Token Mode');
    console.log('Configure token: qbClient.setAppToken("YOUR_APP_TOKEN")');
})();
```

### Step 3: Configure the Token

In your MyDealership.html or other codepage, configure the token:

```javascript
// After the client library loads
window.addEventListener('DOMContentLoaded', () => {
    // Set the app token
    qbClient.setAppToken('YOUR_APP_TOKEN_HERE');

    console.log('✅ QuickBase client ready');
});
```

**Security Note:** App tokens in codepages are visible to anyone who can view the page source. For production use:
- Limit app token permissions to only required tables
- Use QuickBase's built-in permissions to restrict access
- Consider using a server-side proxy for sensitive operations

## Verifying the Fix

After implementing a solution, test with these steps:

### Test 1: Check Client Initialization

```javascript
console.log('Client mode:', qbClient.mode);
console.log('Client methods:', Object.keys(qbClient));
```

Expected output:
```
Client mode: app-token (or session-temp-token)
Client methods: [...]
```

### Test 2: Test Field Retrieval

```javascript
const fields = await qbClient.getFields('YOUR_TABLE_ID');
console.log('Fields retrieved:', fields.length);
```

Expected: List of fields without errors

### Test 3: Test Record Creation

```javascript
const result = await qbClient.createRecords('YOUR_TABLE_ID', [
    {
        7: { value: 25000 },
        8: { value: 2000 }
    }
]);
console.log('Record created:', result);
```

Expected: Record created successfully with record ID returned

## Still Having Issues?

If you're still getting 404 errors after trying these solutions:

1. **Check the diagnostic logs** - The diagnostic version provides detailed output
2. **Verify API endpoint availability** - Test with curl or Postman
3. **Check QuickBase status** - Visit status.quickbase.com
4. **Review permissions** - Ensure your user/app has required permissions
5. **Contact QuickBase support** - Provide them with:
   - Your realm name
   - Table ID
   - Exact error message
   - Request/response logs from diagnostic mode

## Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [CLAUDE.md](CLAUDE.md) - API reference and examples
- [QuickBase API Documentation](https://developer.quickbase.com)
- [guides/Authentication_Best_Practices.md](guides/Authentication_Best_Practices.md)

## Quick Reference: Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 404 | Not Found | Wrong endpoint URL or temporary tokens not available |
| 401 | Unauthorized | Token expired or invalid |
| 403 | Forbidden | Insufficient permissions |
| 400 | Bad Request | Invalid data format or missing required fields |
| 500 | Server Error | QuickBase internal error |

## Summary

The 404 error typically indicates that:
1. The temporary token endpoint is not available in your realm
2. Or there's a configuration issue with table/field IDs

**Recommended Solution:** Use app token authentication, which is universally supported and more reliable for codepage applications.
