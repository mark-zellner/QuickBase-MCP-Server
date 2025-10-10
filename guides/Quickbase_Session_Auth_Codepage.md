# Quickbase Session Auth for Code Pages

This guide shows how to authenticate from a Quickbase Code Page using the current user's session without embedding user tokens.

## Summary
- Get a temporary token tied to the user's session
- Call Quickbase REST endpoints with that temporary token
- Do not send cookies to api.quickbase.com when using the temp token

## Flow
1) Request a temporary token (uses session cookie automatically)
- URL: `https://api.quickbase.com/v1/auth/temporary/{tableId}`
- Method: GET
- Headers:
  - `QB-Realm-Hostname: <your_realm>.quickbase.com`
- credentials: `include`

2) Call REST APIs with the temporary token
- URLs: `https://api.quickbase.com/v1/records`, `https://api.quickbase.com/v1/records/query`, etc.
- Method: POST
- Headers:
  - `Authorization: QB-TEMP-TOKEN <temporaryAuthorization>`
  - `QB-Realm-Hostname: <your_realm>.quickbase.com`
  - `Content-Type: application/json`
- credentials: `omit`

## Minimal Example (query)
```js
const QB_REALM = window.location.hostname;
async function getTemporaryToken(tableId) {
  const resp = await fetch(`https://api.quickbase.com/v1/auth/temporary/${tableId}`, {
    method: 'GET',
    headers: { 'QB-Realm-Hostname': QB_REALM },
    credentials: 'include'
  });
  if (!resp.ok) throw new Error('Failed to get temp token');
  const data = await resp.json();
  return data.temporaryAuthorization;
}

async function sessionQuery(tableId, query, select) {
  const token = await getTemporaryToken(tableId);
  const headers = {
    'Authorization': `QB-TEMP-TOKEN ${token}`,
    'QB-Realm-Hostname': QB_REALM,
    'Content-Type': 'application/json'
  };
  const body = { from: tableId, select, where: query };
  const resp = await fetch('https://api.quickbase.com/v1/records/query', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'omit'
  });
  if (!resp.ok) throw new Error(`Query failed: ${resp.status}`);
  const data = await resp.json();
  return data.data;
}
```

## Client initialization tips
- If using Quickbase Codepage Hero, initialize when `window.client || window.Client` exists:
```js
let qbClient = null;
document.addEventListener('DOMContentLoaded', () => {
  const Ctor = window.client || window.Client;
  if (Ctor) qbClient = new Ctor();
});
```
- If the library is not available, fall back to session REST as shown above.

## Troubleshooting
- Temp token 404: Ensure you are calling api.quickbase.com with `QB-Realm-Hostname` and `credentials: 'include'`.
- CORS error on POST: Ensure `credentials: 'omit'` when using `QB-TEMP-TOKEN` to api.quickbase.com.
- Permission errors: The user must have access to the app and table.
- Multiple matches in lookup: Implement a `top` option and handle multiple rows appropriately.
