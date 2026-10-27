import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Config } from '../src/config.js';
import { QuickBaseClient } from '../src/quickbase/client.js';
import { createServer } from '../src/server.js';

export const TEST_TOKEN = 'test_token_abcdef123456';

export const testConfig = (over: Partial<Config> = {}): Config => ({
  realm: 'acme.quickbase.com',
  userToken: TEST_TOKEN,
  appId: 'bqapp0001',
  timeoutMs: 5000,
  maxRetries: 3,
  readOnly: false,
  workspaceDir: process.cwd(),
  ...over,
});

export interface Recorded {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  rawBody?: string;
}

export type Responder = (req: Recorded) => Response | Promise<Response> | undefined;

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

/** A fetch stand-in that records requests and answers with the first responder that returns a Response. */
export function mockFetch(...responders: Responder[]) {
  const calls: Recorded[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const rawBody = typeof init?.body === 'string' ? init.body : undefined;
    let body: unknown = rawBody;
    try {
      body = rawBody ? JSON.parse(rawBody) : undefined;
    } catch {
      /* xml etc. */
    }
    const rec: Recorded = {
      url: new URL(String(input)),
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string>) },
      body,
      rawBody,
    };
    calls.push(rec);
    for (const r of responders) {
      const res = await r(rec);
      if (res) return res;
    }
    return json({ message: `no mock for ${rec.method} ${rec.url.pathname}` }, 500);
  }) as typeof fetch;
  return { fetch: fn, calls };
}

export const sleepSpy = () => {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => void delays.push(ms) };
};

export async function connect(config: Config, fetchImpl: typeof fetch) {
  const client = new QuickBaseClient(config, { fetch: fetchImpl, sleep: async () => undefined, random: () => 0.5 });
  const server = createServer(config, client);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const mcp = new Client({ name: 'test', version: '0.0.0' });
  await mcp.connect(b);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await mcp.callTool({ name, arguments: args })) as { isError?: boolean; content: { type: string; text: string }[] };
    const text = res.content[0]?.text ?? '';
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* plain text */
    }
    return { isError: Boolean(res.isError), text, data };
  };
  return { mcp, call, close: async () => { await mcp.close(); await server.close(); } };
}
