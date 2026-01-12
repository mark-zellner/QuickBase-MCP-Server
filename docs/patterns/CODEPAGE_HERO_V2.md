# QuickBase Codepage Hero Pattern V2

**Status**: ✅ Proven Working (Jan 2026)
**Verified In**: `MyDealership.html`, `DealSheet_Pricing_v2.3.html`
**Purpose**: Robust, authentication-aware QuickBase API interaction from within a Code Page.

## The Problem
Native QuickBase APIs (`qdb.api`, `QB.api`) are inconsistent or missing in modern code pages. Standard `fetch` requests fail due to CORS or authentication issues (401/403) when using user tokens in client-side code (security risk) or session cookies (SameSite issues).

## The Solution: "Codepage Hero" V2
This pattern uses a self-contained `QuickBaseClient` class embedded directly in the HTML. It automatically:
1.  Detects the current realm/hostname.
2.  Fetches a **temporary authentication token** using the user's active session cookie.
3.  Uses that token to make secure JSON API requests (`https://api.quickbase.com/v1`).
4.  Handles token caching and expiration logic.

## Core Implementation

### 1. The Client Class
Embed this class at the top of your code page script:

```javascript
class QuickBaseClient {
    constructor(options = {}) {
        this.baseURL = 'https://api.quickbase.com/v1';
        this.maxRetries = options.maxRetries || 3;
        this.tokenCache = new Map(); // Cache tokens {token, timestamp}
        this.tokenExpiry = 5 * 60 * 1000; // 5 minutes

        // 1. Auto-detect Realm
        const hostname = globalThis.location?.hostname ?? '';
        if (hostname.includes('quickbase.com')) {
            const realmMatch = hostname.match(/^(.+)\.quickbase\.com$/);
            this.realm = realmMatch ? realmMatch[1] : hostname;
        } else {
            this.realm = 'your-realm-here'; // Dev fallback
        }
    }

    // 2. Get Temporary Token (Crucial Step)
    async getTemporaryToken(tableId) {
        // Check cache first...
        const cached = this.tokenCache.get(tableId);
        if (cached && (Date.now() - cached.timestamp < this.tokenExpiry)) return cached.token;

        // Fetch new token using current session cookies
        const response = await fetch(`${this.baseURL}/auth/temporary/${tableId}`, {
            method: 'GET',
            headers: { 'QB-Realm-Hostname': `${this.realm}.quickbase.com` },
            credentials: 'include' // <--- REQUIRED for session auth
        });

        if (!response.ok) throw new Error('Auth failed');
        const data = await response.json();
        const token = data.temporaryAuthorization;
        
        this.tokenCache.set(tableId, { token: token, timestamp: Date.now() });
        return token;
    }

    // 3. Authenticated Request Wrapper
    async request(method, endpoint, data = null, tableId = null) {
        // ... (See full implementation in MyDealership.html) ...
        // Uses 'QB-TEMP-TOKEN' header
    }
    
    async post(endpoint, data = {}, tableId = null) { return this.request('POST', endpoint, data, tableId); }
}

// Initialize Global
window.qbClient = new QuickBaseClient();
```

### 2. Querying Records (Read)
**CRITICAL**: Do NOT use `GET /records`. Use `POST /records/query`.

```javascript
// ✅ CORRECT
const results = await window.qbClient.post('/records/query', {
    from: 'bvhuaz8wz',
    select: [3, 6, 7],
    where: '{3.GT.0}',
    top: 1
});

// ❌ INCORRECT (404 Error)
// const results = await window.qbClient.get('/records', ...);
```

### 3. Creating Records (Write)
**Robust ID Extraction**: The API response format can vary. Always check multiple paths.

```javascript
/* Usage Example */
async function saveRecord() {
    const recordData = {
        [6]: { value: "My Data" }
    };

    const resp = await window.qbClient.post('/records', { 
        to: 'bvhuaz8wz', 
        data: [recordData] 
    });

    // ROBUST ID EXTRACTION
    let recordId = null;
    
    // 1. Standard JSON API
    if (resp.data && resp.data[0] && resp.data[0].id) {
        recordId = resp.data[0].id;
    } 
    // 2. Metadata Fallback
    else if (resp.metadata && resp.metadata.createdRecordIds) {
        recordId = resp.metadata.createdRecordIds[0];
    } 
    // 3. Flat Response Fallback
    else if (resp.id || resp.recordId || resp.rid || resp.newID) {
        recordId = resp.id || resp.recordId || resp.rid || resp.newID;
    }

    if (!recordId) throw new Error("Saved, but ID missing");
    return recordId;
}
```

## Troubleshooting
- **401 Unauthorized**: The temporary token expired or the user is not logged in. The client class handles auto-retry for expired tokens.
- **404 Not Found**: You are likely using `GET` for a query instead of `POST /records/query`, or your `tableId` is incorrect.
- **CORS Errors**: Ensure `credentials: 'include'` is set ONLY on the `/auth/temporary` call, and `credentials: 'omit'` is used for subsequent API calls (using the token instead of cookies).
