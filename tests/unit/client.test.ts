import { describe, expect, it } from 'vitest';
import { QuickBaseApiError, QuickBaseTransportError, describeError } from '../../src/errors.js';
import { QuickBaseClient, cdata, parseRetryAfter } from '../../src/quickbase/client.js';
import { json, mockFetch, sleepSpy, testConfig, TEST_TOKEN } from '../helpers.js';

const make = (fetchImpl: typeof fetch, over = {}) => {
  const s = sleepSpy();
  const client = new QuickBaseClient(testConfig(over), { fetch: fetchImpl, sleep: s.sleep, random: () => 0.5 });
  return { client, delays: s.delays };
};

describe('QuickBaseClient', () => {
  it('sends the required headers and query params', async () => {
    const m = mockFetch(() => json([{ id: 'x' }]));
    const { client } = make(m.fetch);
    await client.get('/tables', { appId: 'bqapp0001', skip: undefined });
    const call = m.calls[0]!;
    expect(call.url.origin + call.url.pathname).toBe('https://api.quickbase.com/v1/tables');
    expect(call.url.searchParams.get('appId')).toBe('bqapp0001');
    expect(call.url.searchParams.has('skip')).toBe(false);
    expect(call.headers['QB-Realm-Hostname']).toBe('acme.quickbase.com');
    expect(call.headers.Authorization).toBe(`QB-USER-TOKEN ${TEST_TOKEN}`);
    expect(call.headers['User-Agent']).toMatch(/quickbase-mcp-server/);
  });

  it('retries 429 honoring Retry-After, even for POST', async () => {
    let n = 0;
    const m = mockFetch(() => (++n < 3 ? json({ message: 'slow down' }, 429, { 'retry-after': '2' }) : json({ ok: true })));
    const { client, delays } = make(m.fetch);
    await expect(client.post('/records', { to: 'b' })).resolves.toEqual({ ok: true });
    expect(m.calls).toHaveLength(3);
    expect(delays).toEqual([2000, 2000]);
  });

  it('retries 5xx for idempotent requests with growing backoff', async () => {
    let n = 0;
    const m = mockFetch(() => (++n < 3 ? json({ message: 'boom' }, 503) : json({ ok: 1 })));
    const { client, delays } = make(m.fetch);
    await client.get('/apps/x');
    expect(m.calls).toHaveLength(3);
    expect(delays[1]!).toBeGreaterThan(delays[0]!);
  });

  it('does not retry 5xx for non-idempotent POST (could duplicate records)', async () => {
    const m = mockFetch(() => json({ message: 'boom' }, 502));
    const { client } = make(m.fetch);
    await expect(client.post('/records', {})).rejects.toBeInstanceOf(QuickBaseApiError);
    expect(m.calls).toHaveLength(1);
  });

  it('retries POST when marked idempotent (records/query)', async () => {
    let n = 0;
    const m = mockFetch(() => (++n < 2 ? json({}, 500) : json({ data: [] })));
    const { client } = make(m.fetch);
    await client.post('/records/query', {}, { idempotent: true });
    expect(m.calls).toHaveLength(2);
  });

  it('gives up after maxRetries and surfaces the API error', async () => {
    const m = mockFetch(() => json({ message: 'Too many', description: 'rate' }, 429));
    const { client } = make(m.fetch, { maxRetries: 2 });
    await expect(client.get('/x')).rejects.toMatchObject({ status: 429, message: 'Too many' });
    expect(m.calls).toHaveLength(3);
  });

  it('never retries 4xx', async () => {
    const m = mockFetch(() => json({ message: 'bad' }, 400));
    const { client } = make(m.fetch);
    await expect(client.get('/x')).rejects.toMatchObject({ status: 400 });
    expect(m.calls).toHaveLength(1);
  });

  it('maps network failures to a transport error, retrying only idempotent calls', async () => {
    let calls = 0;
    const failing = (async () => {
      calls++;
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const { client } = make(failing, { maxRetries: 1 });
    await expect(client.get('/x')).rejects.toBeInstanceOf(QuickBaseTransportError);
    expect(calls).toBe(2);
    calls = 0;
    await expect(client.post('/x', {})).rejects.toBeInstanceOf(QuickBaseTransportError);
    expect(calls).toBe(1);
  });

  it('maps timeouts', async () => {
    const timing = (async () => {
      throw new DOMException('timed out', 'TimeoutError');
    }) as unknown as typeof fetch;
    const { client } = make(timing, { maxRetries: 0 });
    await expect(client.get('/x')).rejects.toThrow(/timed out after 5000ms/);
  });

  it('handles empty, 204 and malformed bodies', async () => {
    const empty = make(mockFetch(() => new Response(null, { status: 204 })).fetch).client;
    await expect(empty.delete('/x')).resolves.toBeUndefined();
    const bad = make(mockFetch(() => new Response('{oops', { status: 200, headers: { 'content-type': 'application/json' } })).fetch).client;
    await expect(bad.get('/x')).rejects.toThrow(/malformed JSON/);
  });

  it('describeError is actionable and never contains the token', () => {
    const e = new QuickBaseApiError({ status: 401, message: `bad token ${TEST_TOKEN}`, rayId: 'abc' });
    const text = describeError(e);
    expect(text).toContain('401');
    expect(text).toContain('QB_USER_TOKEN');
    expect(text).toContain('abc');
    expect(text).not.toContain(TEST_TOKEN);
  });

  it('sends the XML API token only in the body and escapes it', async () => {
    const m = mockFetch(() => new Response('<qdbapi><errcode>0</errcode></qdbapi>'));
    const { client } = make(m.fetch);
    await client.requestXml('bqapp0001', 'API_GetDBPage', '<pageID>1</pageID>');
    const call = m.calls[0]!;
    expect(call.url.toString()).toBe('https://acme.quickbase.com/db/bqapp0001?a=API_GetDBPage');
    expect(call.headers.Authorization).toBeUndefined();
    expect(call.rawBody).toContain(`<usertoken>${TEST_TOKEN}</usertoken>`);
    await expect(client.requestXml('bad id!', 'API_GetDBPage', '')).rejects.toThrow(/Invalid app id/);
    await expect(client.requestXml('bqapp0001', 'evil&x=1', '')).rejects.toThrow(/Invalid XML API action/);
  });
});

describe('helpers', () => {
  it('parseRetryAfter handles seconds, dates and junk', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4000)).toBe(6000);
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it('cdata splits terminators', () => {
    expect(cdata('a]]>b')).toBe('<![CDATA[a]]]]><![CDATA[>b]]>');
  });
});
