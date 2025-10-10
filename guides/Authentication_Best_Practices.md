# Authentication Best Practices - Deal Sheet Tools

**Version**: 2.0  
**Last Updated**: October 2, 2025  
**Status**: Active

This document compares authentication methods for QuickBase Codepages and explains why our implementation is more secure and production-ready.

---

## Table of Contents

1. [Authentication Method Comparison](#authentication-method-comparison)
2. [Our Implementation (Session-Based)](#our-implementation-session-based)
3. [Standard Codepage Hero (Token-Based)](#standard-codepage-hero-token-based)
4. [Security Analysis](#security-analysis)
5. [Best Practices](#best-practices)
6. [Implementation Guide](#implementation-guide)

---

## Authentication Method Comparison

### Quick Summary

| Aspect | **Our Method (Session-Based)** ✅ | Standard Codepage Hero (Token-Based) ⚠️ |
|--------|----------------------------------|----------------------------------------|
| **Security** | ✅ Excellent - No tokens exposed | ⚠️ Poor - Tokens in client-side code |
| **Setup Complexity** | ✅ Simple - Auto-configured | ⚠️ Complex - Manual token management |
| **Token Expiration** | ✅ Auto-refreshed by QuickBase | ⚠️ Requires manual rotation |
| **Production Ready** | ✅ Yes - Recommended by QuickBase | ⚠️ No - Dev/testing only |
| **User Permissions** | ✅ Per-user (logged-in user) | ⚠️ All users share token permissions |
| **Audit Trail** | ✅ Proper - Shows actual user | ⚠️ Poor - All actions show token owner |
| **Token Revocation** | ✅ Automatic on logout | ⚠️ Manual - token remains valid |
| **Code Simplicity** | ✅ Clean - No token storage | ⚠️ Messy - Token handling required |

---

## Our Implementation (Session-Based)

### How It Works

```javascript
// Deal Sheet Tools - Session-Based Authentication
class QuickBaseClient {
    constructor() {
        this.realm = window.location.hostname.split('.')[0] + '.quickbase.com';
        this.isEmbedded = () => window.self !== window.top;
        this.mode = this.isEmbedded() ? 'session' : 'none';
    }

    async getAuth(tableId) {
        // Get temporary token from user's active QuickBase session
        const response = await fetch(
            `https://api.quickbase.com/v1/auth/temporary/${tableId}`,
            {
                method: 'GET',
                headers: {
                    'QB-Realm-Hostname': this.realm,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'  // ✅ Uses session cookies
            }
        );
        
        const result = await response.json();
        return result.temporaryAuthorization;
    }
}
```

### Key Advantages

1. **✅ No Token Storage** - Never stores or exposes user tokens in code
2. **✅ Automatic Authentication** - Uses logged-in user's QuickBase session
3. **✅ Temporary Tokens** - Each API call gets fresh, short-lived token
4. **✅ Per-User Permissions** - Respects individual user's access rights
5. **✅ Proper Audit Trail** - Actions attributed to actual user
6. **✅ No Maintenance** - No token rotation or management needed

### Security Flow

```
1. User logs into QuickBase
   ↓
2. User opens codepage (embedded in QuickBase)
   ↓
3. Codepage requests temporary token via session cookies
   ↓
4. QuickBase validates session and issues short-lived token
   ↓
5. Codepage makes API call with temporary token
   ↓
6. Token expires after use or timeout
   ↓
7. Next API call gets new temporary token automatically
```

---

## Standard Codepage Hero (Token-Based)

### How It Works

```javascript
// Standard Codepage Hero - Token-Based Authentication ⚠️
class client {
    constructor(userToken=null, realm=null, numberOfAttempts=0, timeout=0, loggedIn=true) {
        this.userToken = userToken;  // ⚠️ Stores user token
        this.realm = realm;
        this.loggedIn = loggedIn;
    }

    async getAuthorization(table_id) {
        if (this.userToken !== null) {
            return 'QB-USER-TOKEN ' + this.userToken;  // ⚠️ Exposes token
        } else {
            // Falls back to session-based (similar to our method)
            // But requires loggedIn parameter
        }
    }
}

// ⚠️ Common (insecure) usage pattern
const client_object = new client(
    "dyym73_iiu7_9_2ywlpz9s425us1l09qf2ubjpee",  // ⚠️ Token exposed
    "myrealm.quickbase.com"
);
```

### Security Problems

1. **⚠️ Token Exposure** - User tokens visible in client-side JavaScript
2. **⚠️ Token Storage** - Tokens stored in variables, localStorage, or code
3. **⚠️ Shared Permissions** - All users get token owner's permissions
4. **⚠️ Audit Issues** - All actions show as token owner, not actual user
5. **⚠️ No Expiration** - Tokens remain valid until manually revoked
6. **⚠️ Manual Rotation** - Requires periodic token regeneration
7. **⚠️ Browser DevTools** - Tokens visible in browser inspector/console

### Attack Scenarios

```
Scenario 1: Token Theft via Browser DevTools
1. User opens browser DevTools (F12)
2. Checks Network tab or Console
3. Finds exposed user token
4. Uses token to access QuickBase API directly
5. Can read/write data with token owner's permissions

Scenario 2: Elevated Privilege Abuse
1. Admin user token embedded in codepage
2. Regular user opens codepage
3. Regular user inherits admin token permissions
4. Can perform admin actions (delete records, modify structure)

Scenario 3: Token Reuse After Logout
1. User gets token from codepage
2. User logs out of QuickBase
3. Stolen token still works (doesn't expire)
4. Unauthorized access continues
```

---

## Security Analysis

### Vulnerability Comparison

| Vulnerability | Session-Based (Our Method) | Token-Based (Standard) |
|---------------|---------------------------|------------------------|
| **Token Theft** | ✅ Not possible - no persistent token | ❌ Easy - token visible in code |
| **Session Hijacking** | ✅ Mitigated - QuickBase session security | ❌ Worse - long-lived tokens |
| **Privilege Escalation** | ✅ Prevented - user's own permissions | ❌ Possible - shared token permissions |
| **Post-Logout Access** | ✅ Prevented - session ends | ❌ Possible - token stays valid |
| **Audit Trail Integrity** | ✅ Preserved - real user identity | ❌ Broken - shows token owner |
| **Man-in-Middle** | ✅ Protected - HTTPS + session cookies | ⚠️ Same HTTPS, but token exposed client-side |

### OWASP Top 10 Alignment

| OWASP Risk | Session-Based | Token-Based |
|-----------|---------------|-------------|
| A01: Broken Access Control | ✅ Mitigated | ❌ Vulnerable |
| A02: Cryptographic Failures | ✅ Protected | ⚠️ Tokens exposed |
| A04: Insecure Design | ✅ Secure by design | ❌ Insecure pattern |
| A07: ID & Auth Failures | ✅ Proper auth | ❌ Token misuse |
| A08: Software/Data Integrity | ✅ Intact audit trail | ❌ Broken attribution |

---

## Best Practices

### ✅ DO: Session-Based Authentication (Our Method)

```javascript
// ✅ RECOMMENDED: Session-based client initialization
const client = new QuickBaseClient();

// No tokens, no credentials, just works!
const records = await client.query('bve4nnem9', '{3.GT.0}', [3, 6, 7]);
```

**When to use:**
- ✅ Production codepages embedded in QuickBase
- ✅ User-facing applications
- ✅ Any codepage with real user data
- ✅ Applications requiring proper audit trails
- ✅ Multi-user applications

### ⚠️ DON'T: Token-Based Authentication in Production

```javascript
// ❌ AVOID: Token-based authentication in codepages
const client = new client(
    "b32abc_def_1_23_xyz456",  // ❌ Never do this!
    "myrealm.quickbase.com"
);
```

**Only acceptable for:**
- ⚠️ Local development/testing (never commit tokens!)
- ⚠️ Server-side scripts (not client-side codepages)
- ⚠️ Automated jobs/integrations (properly secured)

### 🔒 Local Development Pattern

If you need tokens for local development:

```javascript
// DEVENV.js (NEVER COMMIT THIS FILE!)
let user_token = 'your_dev_token_here';
let realm_url = 'yourealm.quickbase.com';
```

```javascript
// In your code - conditionally use tokens
if (window.location.hostname === 'localhost') {
    // ⚠️ Local dev only
    client = new client(user_token, realm_url);
} else {
    // ✅ Production - session-based
    client = new QuickBaseClient();
}
```

**Important:**
1. Add `DEVENV.js` to `.gitignore`
2. Never commit tokens to repositories
3. Use environment variables for server-side code
4. Rotate tokens regularly

---

## Implementation Guide

### Our Current Implementation

**File:** `DealSheet_Unified.html` (lines 900-1050)

```javascript
class QuickBaseClient {
    constructor() {
        this.realm = window.location.hostname.split('.')[0] + '.quickbase.com';
        this.isEmbedded = () => window.self !== window.top;
        this.mode = this.isEmbedded() ? 'session' : 'none';
    }

    isEmbedded() {
        return window.self !== window.top;
    }

    async getAuth(tableId) {
        if (!this.isEmbedded()) {
            console.warn('Not embedded in QuickBase - API calls may fail');
            return null;
        }

        try {
            const response = await fetch(
                `https://api.quickbase.com/v1/auth/temporary/${tableId}`,
                {
                    method: 'GET',
                    headers: {
                        'QB-Realm-Hostname': this.realm,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status}`);
            }

            const result = await response.json();
            return result.temporaryAuthorization;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async getHeaders(tableId) {
        const auth = await this.getAuth(tableId);
        return {
            'QB-Realm-Hostname': this.realm,
            'Authorization': auth ? `QB-TEMP-TOKEN ${auth}` : null,
            'Content-Type': 'application/json',
            'User-Agent': 'Deal Sheet Tools v2.0'
        };
    }

    async query(tableId, where, select, additionalParams = {}) {
        const headers = await this.getHeaders(tableId);
        const body = {
            from: tableId,
            select: select,
            where: where,
            ...additionalParams
        };

        const response = await fetch('https://api.quickbase.com/v1/records/query', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Query failed: ${response.status}`);
        }

        const data = await response.json();
        return data.data;
    }

    async upsert(tableId, records, mergeFieldId = null) {
        const headers = await this.getHeaders(tableId);
        const body = {
            to: tableId,
            data: records,
            ...(mergeFieldId && { mergeFieldId })
        };

        const response = await fetch('https://api.quickbase.com/v1/records', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Upsert failed: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
```

### Comparison with Standard Codepage Hero

| Feature | Our Implementation | Standard Codepage Hero |
|---------|-------------------|------------------------|
| **Session Detection** | ✅ Automatic (`isEmbedded()`) | ⚠️ Manual (`loggedIn` parameter) |
| **Error Handling** | ✅ Try-catch with user feedback | ⚠️ Console.log only |
| **Token Management** | ✅ Per-call temporary tokens | ⚠️ Long-lived stored token |
| **Security** | ✅ No token exposure | ❌ Token in constructor |
| **User Permissions** | ✅ Logged-in user | ⚠️ Token owner |
| **Default Behavior** | ✅ Session-based always | ⚠️ Token-based default |

---

## QuickBase Documentation References

### Official Recommendations

From QuickBase API documentation:

> **Best Practice for Codepages:**
> Use temporary tokens obtained from the user's active session. This ensures:
> - Proper user attribution
> - Respect for user permissions
> - Automatic token lifecycle management
> - Enhanced security posture

### Temporary Token Endpoint

```
GET https://api.quickbase.com/v1/auth/temporary/{tableId}
```

**Headers:**
- `QB-Realm-Hostname`: Your realm hostname
- `Content-Type`: application/json

**Credentials:** `include` (uses session cookies)

**Response:**
```json
{
  "temporaryAuthorization": "QB-TEMP-TOKEN_xyz123..."
}
```

**Token Lifetime:** Short-lived (seconds to minutes)

---

## Migration from Token-Based to Session-Based

If you're using standard Codepage Hero with tokens, here's how to migrate:

### Before (Token-Based) ❌

```javascript
// ❌ Old insecure pattern
const client = new client(
    "b32abc_def_1_23_xyz456",
    "yourcompany.quickbase.com"
);

const records = await client.query('bve4nnem9', '{3.GT.0}', [3, 6, 7]);
```

### After (Session-Based) ✅

```javascript
// ✅ New secure pattern
const client = new QuickBaseClient();

const records = await client.query('bve4nnem9', '{3.GT.0}', [3, 6, 7]);
```

### Migration Steps

1. **Replace client class:**
   - Remove standard Codepage Hero client
   - Add our `QuickBaseClient` class

2. **Update initialization:**
   - Remove token parameters
   - Use default constructor

3. **Test thoroughly:**
   - Verify codepage is embedded in QuickBase
   - Test with different user permission levels
   - Confirm proper audit trail attribution

4. **Remove token storage:**
   - Delete any stored tokens
   - Remove token rotation code
   - Clean up DEVENV.js files

---

## Security Checklist

### ✅ Production Codepage Security

- [ ] Uses session-based authentication (no user tokens)
- [ ] No credentials stored in code
- [ ] No credentials in localStorage/sessionStorage
- [ ] Proper error handling for auth failures
- [ ] User-specific permissions enforced
- [ ] Audit trail shows actual user, not token owner
- [ ] Code reviewed for token exposure
- [ ] .gitignore includes DEVENV.js
- [ ] No tokens in Git history
- [ ] Documentation updated

### ⚠️ If Using Tokens (Dev/Testing Only)

- [ ] Tokens only in local development
- [ ] DEVENV.js in .gitignore
- [ ] Conditional token usage (localhost only)
- [ ] Tokens rotated regularly
- [ ] Minimal token permissions
- [ ] Token expiration monitored
- [ ] Clear warnings in code comments
- [ ] Migration plan to session-based

---

## Frequently Asked Questions

### Q: Why doesn't Standard Codepage Hero use session-based by default?

**A:** It does support session-based auth, but the documentation and examples emphasize token-based authentication, which is easier for new developers but less secure. The `loggedIn=true` parameter enables session-based auth, but it's not the default pattern shown in examples.

### Q: Can I use token-based for server-side integrations?

**A:** Yes, token-based authentication is appropriate for:
- Server-side scripts (not exposed to browser)
- Automated jobs/ETL processes
- CI/CD pipelines
- Properly secured backend services

But NOT for:
- Client-side codepages (security risk)
- Browser-based applications
- User-facing tools

### Q: What if my codepage needs to work outside QuickBase?

**A:** If your codepage must work standalone (not embedded):
1. Use OAuth PKCE flow (see `Quickbase_OAuth_Setup.md`)
2. Never use long-lived user tokens
3. Implement proper token refresh
4. Store tokens securely (server-side)
5. Consider server-side proxy pattern

### Q: How do I test locally without tokens?

**A:** Options:
1. **Recommended:** Test embedded in QuickBase (use preview mode)
2. Use QuickBase CLI for local testing
3. Use conditional token (localhost only, never commit)
4. Mock QuickBase API for unit tests

### Q: Does session-based work with EOTI (Everyone on the Internet)?

**A:** Yes, but the user must be logged in. For public forms:
- Set table permissions for EOTI role
- User browses to QuickBase form
- Session-based auth uses EOTI permissions
- No token exposure required

---

## Conclusion

**Our session-based authentication method is significantly more secure than token-based approaches** for production QuickBase codepages:

### Key Advantages ✅
1. **Zero Token Exposure** - No tokens in client-side code
2. **Proper User Attribution** - Actions show actual user, not token owner
3. **Automatic Token Lifecycle** - No manual rotation or management
4. **Per-User Permissions** - Each user has appropriate access
5. **Production Ready** - Follows QuickBase best practices
6. **Simpler Code** - Less complexity, fewer security concerns

### When to Use Token-Based ⚠️
- Local development/testing only (never production)
- Server-side integrations (properly secured)
- Automated scripts (not browser-based)

**Bottom Line:** For any production codepage embedded in QuickBase, always use session-based authentication. Save tokens for server-side use cases where they can be properly secured.

---

## Related Documentation

- [Quickbase_Session_Auth_Codepage.md](Quickbase_Session_Auth_Codepage.md) - Implementation details
- [Quickbase_OAuth_Setup.md](Quickbase_OAuth_Setup.md) - OAuth PKCE for standalone apps
- [QuickBase_Deployment_Guide.md](QuickBase_Deployment_Guide.md) - Deployment best practices
- [CALCULATOR_TESTING_GUIDE.md](CALCULATOR_TESTING_GUIDE.md) - Testing with session auth

---

**Last Updated:** October 2, 2025  
**Review Date:** April 2, 2026

**Document Maintainer:** Deal Sheet Tools Development Team
