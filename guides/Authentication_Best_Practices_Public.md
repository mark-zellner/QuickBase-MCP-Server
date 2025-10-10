# Authentication Best Practices for QuickBase Codepages

**Version**: 1.0  
**Last Updated**: October 2, 2025  
**Intended for:** Contribution to [Quickbase_Codepage_Hero](https://github.com/mark-zellner/Quickbase_Codepage_Hero)

---

## TL;DR

**For production codepages embedded in QuickBase, always use session-based authentication (temporary tokens) instead of user tokens.**

```javascript
// ✅ RECOMMENDED: Session-based (secure for production)
const client = new client(null, null, 0, 0, true);

// ❌ AVOID IN PRODUCTION: User token-based (dev/testing only)
const client = new client("user_token_here", "realm.quickbase.com");
```

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods Compared](#authentication-methods-compared)
3. [Session-Based Authentication (Recommended)](#session-based-authentication-recommended)
4. [User Token Authentication (Dev/Testing Only)](#user-token-authentication-devtesting-only)
5. [Security Considerations](#security-considerations)
6. [Implementation Examples](#implementation-examples)
7. [Best Practices Checklist](#best-practices-checklist)

---

## Overview

Quickbase_Codepage_Hero supports two authentication methods:

1. **Session-Based** - Uses temporary tokens from the logged-in user's QuickBase session
2. **User Token-Based** - Uses long-lived user tokens passed to the constructor

This guide explains when to use each method and why session-based authentication is strongly recommended for production codepages.

---

## Authentication Methods Compared

| Aspect | Session-Based ✅ | User Token-Based ⚠️ |
|--------|-----------------|-------------------|
| **Security** | Excellent - No tokens exposed | Poor - Tokens visible in code |
| **Production Ready** | ✅ Yes | ❌ No (dev/testing only) |
| **User Permissions** | Per-user (logged-in user) | All users share token permissions |
| **Audit Trail** | Proper - Shows actual user | Incorrect - Shows token owner |
| **Token Lifetime** | Short (seconds/minutes) | Long (until manually revoked) |
| **Setup Complexity** | Simple - Automatic | Complex - Manual token management |
| **Token Rotation** | Automatic | Manual |
| **Post-Logout Security** | Secure - Session ends | Vulnerable - Token remains valid |

---

## Session-Based Authentication (Recommended)

### How It Works

Session-based authentication uses the `loggedIn` parameter and retrieves temporary tokens from the user's active QuickBase session:

```javascript
// Initialize with session-based auth
const client = new client(null, null, 0, 0, true);  // loggedIn = true

// Or use the simplified constructor (defaults to session-based)
const client = new client();

// Make API calls - automatically uses logged-in user's credentials
const records = await client.query("bfa42nsiwn", "{3.GT.0}", [3, 6, 7]);
```

### Under the Hood

When `userToken` is `null` and `loggedIn` is `true`, the client:

1. Detects the realm from the URL
2. Calls `getAuthorization(table_id)` which fetches a temporary token:
   ```javascript
   fetch(`https://api.quickbase.com/v1/auth/temporary/${table_id}`, {
       method: 'GET',
       headers: {
           'QB-Realm-Hostname': this.realm,
           'Content-Type': 'application/json'
       },
       credentials: 'include'  // Uses session cookies
   })
   ```
3. Uses the temporary token for the API call
4. Token expires automatically after use

### Advantages

1. **✅ No Token Exposure** - No credentials in client-side code
2. **✅ Automatic Authentication** - Uses logged-in user's session
3. **✅ Per-User Permissions** - Respects individual user access rights
4. **✅ Proper Audit Trail** - Actions attributed to actual user
5. **✅ Zero Maintenance** - No token rotation or management
6. **✅ Secure by Default** - Session tokens are short-lived

### When to Use

- ✅ Production codepages embedded in QuickBase
- ✅ User-facing applications
- ✅ Any codepage with real user data
- ✅ Applications requiring proper audit trails
- ✅ Multi-user applications

---

## User Token Authentication (Dev/Testing Only)

### How It Works

User token authentication uses a long-lived user token passed to the constructor:

```javascript
// Initialize with user token
const client = new client(
    "b32abc_def_1_23_xyz456",  // User token
    "myrealm.quickbase.com"    // Realm
);

// Make API calls - uses the provided token
const records = await client.query("bfa42nsiwn", "{3.GT.0}", [3, 6, 7]);
```

### Security Problems

1. **❌ Token Exposure** - Tokens visible in client-side JavaScript
2. **❌ Browser DevTools** - Anyone can view tokens via F12
3. **❌ Shared Permissions** - All users get token owner's permissions
4. **❌ Audit Issues** - All actions show as token owner, not actual user
5. **❌ No Expiration** - Tokens remain valid until manually revoked
6. **❌ Manual Rotation** - Requires periodic token regeneration
7. **❌ Post-Logout Vulnerability** - Stolen tokens work after user logs out

### Attack Scenario Example

```
1. Developer embeds user token in codepage
2. Regular user opens codepage
3. User opens browser DevTools (F12)
4. User finds token in Network tab or Console
5. User copies token
6. User makes direct API calls with stolen token
7. User has token owner's permissions (possibly admin!)
8. Token remains valid even after user logs out
```

### When to Use (Rarely!)

- ⚠️ **Local development only** (never commit tokens!)
- ⚠️ **Server-side scripts** (not client-side codepages)
- ⚠️ **Automated jobs/integrations** (properly secured)
- ⚠️ **CI/CD pipelines** (using secrets management)

### Safe Local Development Pattern

If you need tokens for local development:

**DEVENV.js** (add to `.gitignore`):
```javascript
let user_token = 'your_dev_token_here';
let realm_url = 'yourrealm.quickbase.com';
```

**Your code**:
```javascript
// Conditionally use tokens ONLY for local development
let client;

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // ⚠️ Local development only
    client = new client(user_token, realm_url);
    console.warn('Using development token - DO NOT USE IN PRODUCTION');
} else {
    // ✅ Production - session-based
    client = new client();  // Uses session-based auth
}
```

**Important:**
1. Add `DEVENV.js` to `.gitignore`
2. Never commit tokens to repositories
3. Use environment variables for server-side code
4. Rotate tokens regularly
5. Use minimal permissions for dev tokens

---

## Security Considerations

### OWASP Top 10 Alignment

| OWASP Risk | Session-Based | Token-Based |
|-----------|---------------|-------------|
| A01: Broken Access Control | ✅ Mitigated | ❌ Vulnerable |
| A02: Cryptographic Failures | ✅ Protected | ⚠️ Tokens exposed |
| A04: Insecure Design | ✅ Secure by design | ❌ Insecure pattern |
| A07: ID & Auth Failures | ✅ Proper auth | ❌ Token misuse |
| A08: Software/Data Integrity | ✅ Intact audit trail | ❌ Broken attribution |

### Vulnerability Comparison

| Vulnerability | Session-Based | Token-Based |
|---------------|--------------|-------------|
| **Token Theft via Browser DevTools** | ✅ Not possible | ❌ Easy |
| **Session Hijacking** | ✅ Mitigated by QB | ❌ Worse with long-lived tokens |
| **Privilege Escalation** | ✅ Prevented | ❌ Possible |
| **Post-Logout Access** | ✅ Prevented | ❌ Possible |
| **Audit Trail Integrity** | ✅ Preserved | ❌ Broken |

---

## Implementation Examples

### Example 1: Basic Query (Session-Based)

```javascript
// Initialize client (session-based)
const qb_client = new client();

// Query records
async function loadRecords() {
    try {
        const records = await qb_client.query(
            "bfa42nsiwn",           // Table ID
            "{3.GT.0}",             // Query: all records
            [3, 6, 7, 9]            // Fields to return
        );
        
        console.log(`Found ${records.length} records`);
        return records;
    } catch (error) {
        console.error('Query failed:', error);
    }
}
```

### Example 2: Create/Update Records (Session-Based)

```javascript
// Initialize client (session-based)
const qb_client = new client();

// Create or update records
async function saveRecords() {
    const records = [
        {
            6: { value: "Tacoma" },
            7: { value: 30000 }
        },
        {
            6: { value: "Corolla" },
            7: { value: 20000 }
        }
    ];
    
    try {
        const result = await qb_client.post("bfa42nsiwn", records);
        console.log(`Created: ${result.createdRecordIds.length}`);
        console.log(`Updated: ${result.updatedRecordIds.length}`);
        return result;
    } catch (error) {
        console.error('Post failed:', error);
    }
}
```

### Example 3: Error Handling

```javascript
// Initialize client with retry logic
const qb_client = new client(
    null,  // No user token
    null,  // Auto-detect realm
    3,     // Retry 3 times on 429 errors
    1000,  // Wait 1 second between retries
    true   // Use session-based auth
);

// Query with error handling
async function safeQuery(tableId, query, fields) {
    try {
        const records = await qb_client.query(tableId, query, fields);
        return { success: true, data: records };
    } catch (error) {
        console.error('Query error:', error);
        return { success: false, error: error.message };
    }
}
```

### Example 4: Public Form (EOTI)

For public forms accessible to everyone on the internet:

```javascript
// Initialize for public form
const qb_client = new client(
    null,   // No user token
    null,   // Auto-detect realm  
    0,      // No retries
    0,      // No timeout
    false   // Not logged in - uses EOTI permissions
);

// Submit form data
async function submitForm(formData) {
    const record = {
        6: { value: formData.name },
        7: { value: formData.email },
        8: { value: formData.message }
    };
    
    try {
        const result = await qb_client.post("bfa42nsiwn", [record]);
        return { success: true, recordId: result.createdRecordIds[0] };
    } catch (error) {
        return { success: false, error: 'Submission failed' };
    }
}
```

**Note:** For EOTI to work, ensure the table has appropriate permissions set for the "Everyone on the Internet" role.

---

## Best Practices Checklist

### ✅ Production Codepage Checklist

- [ ] Uses session-based authentication (no user tokens in constructor)
- [ ] No credentials stored in code
- [ ] No credentials in localStorage/sessionStorage
- [ ] Proper error handling for auth failures
- [ ] User-specific permissions enforced
- [ ] Audit trail shows actual user
- [ ] Code reviewed for token exposure
- [ ] .gitignore includes DEVENV.js (if used)
- [ ] No tokens in Git history
- [ ] Documentation includes security notes

### ⚠️ Development/Testing Checklist (If Using Tokens)

- [ ] Tokens only in local development environment
- [ ] DEVENV.js in .gitignore
- [ ] Conditional token usage (localhost only)
- [ ] Tokens rotated regularly (every 90 days)
- [ ] Minimal token permissions
- [ ] Clear warnings in code comments
- [ ] Migration plan to session-based for production
- [ ] Team trained on secure practices

---

## Migration Guide

### Migrating from Token-Based to Session-Based

**Before (Insecure):**
```javascript
// ❌ Old pattern - token exposed
const client_obj = new client(
    "b32abc_def_1_23_xyz456",
    "myrealm.quickbase.com"
);
```

**After (Secure):**
```javascript
// ✅ New pattern - session-based
const client_obj = new client();  // That's it!
```

### Migration Steps

1. **Remove token parameters:**
   ```javascript
   // Before
   const client = new client(userToken, realm);
   
   // After
   const client = new client();
   ```

2. **Test in QuickBase:**
   - Embed codepage in QuickBase
   - Test with different user permission levels
   - Verify proper authorization

3. **Verify audit trail:**
   - Check that actions show actual user, not token owner
   - Confirm user-specific permissions are enforced

4. **Clean up:**
   - Delete stored tokens
   - Remove token rotation code
   - Update documentation

---

## Frequently Asked Questions

### Q: Does session-based work with the current Codepage Hero library?

**A:** Yes! The library already supports session-based authentication. Simply use:
```javascript
const client = new client();  // Defaults to session-based
```

Or explicitly:
```javascript
const client = new client(null, null, 0, 0, true);  // loggedIn = true
```

### Q: What if I need to test locally?

**A:** Use conditional logic:
```javascript
if (window.location.hostname === 'localhost') {
    client = new client(dev_token, dev_realm);  // Local only
} else {
    client = new client();  // Production
}
```

Never commit the dev token to version control.

### Q: Can I use token-based for server-side integrations?

**A:** Yes, user token authentication is appropriate for:
- Server-side scripts (Node.js, Python, etc.)
- Automated jobs (properly secured)
- CI/CD pipelines (using secrets management)

But **NOT** for browser-based codepages.

### Q: How do I get a temporary token manually?

**A:** The library does this automatically, but the endpoint is:
```javascript
fetch(`https://api.quickbase.com/v1/auth/temporary/${tableId}`, {
    method: 'GET',
    headers: {
        'QB-Realm-Hostname': 'yourrealm.quickbase.com',
        'Content-Type': 'application/json'
    },
    credentials: 'include'
});
```

---

## Recommended Documentation Updates

### Update README.md

Consider adding a security section to the main README:

```markdown
## Security Best Practices

**For production codepages, always use session-based authentication:**

✅ **Recommended (Secure):**
```javascript
const client = new client();  // Uses logged-in user's session
```

❌ **Avoid in Production (Insecure):**
```javascript
const client = new client("user_token", "realm");  // Exposes token
```

See [Authentication Best Practices](docs/authentication-best-practices.md) for details.
```

### Add to Constructor Documentation

Update the constructor examples to emphasize session-based as the default:

```javascript
// ✅ RECOMMENDED: Session-based (production)
const client = new client();

// ⚠️ AVOID: Token-based (dev/testing only)
const client = new client(userToken, realm);

// For public forms (not logged in)
const client = new client(null, null, 0, 0, false);
```

---

## Contributing

If you'd like to contribute improvements to authentication handling:

1. **Enhanced Error Messages** - Better feedback when auth fails
2. **Security Warnings** - Console warnings when tokens are detected
3. **Documentation** - Expand security best practices
4. **Examples** - More session-based authentication examples

---

## References

- [QuickBase API Documentation](https://developer.quickbase.com/)
- [QuickBase Temporary Token Endpoint](https://developer.quickbase.com/auth)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

## Summary

### Key Takeaways

1. **✅ Use session-based authentication for production codepages**
   - No tokens exposed in client-side code
   - Proper user attribution and permissions
   - Automatic token lifecycle management

2. **⚠️ Only use token-based for dev/testing**
   - Local development with .gitignore protection
   - Server-side scripts (properly secured)
   - Never in production client-side code

3. **🔒 Security matters**
   - Tokens in browser code = security vulnerability
   - Session-based = secure by default
   - Follow QuickBase best practices

---

**This document is intended as a community contribution to improve security practices for QuickBase Codepage development.**

---

## License

This documentation is provided as-is for educational purposes. Feel free to use, modify, and share with attribution.

**Author:** QuickBase Developer Community  
**Last Updated:** October 2, 2025
