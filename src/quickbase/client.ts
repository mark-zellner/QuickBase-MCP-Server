import type { Config } from '../config.js';
import { QuickBaseApiError, QuickBaseTransportError, UsageError } from '../errors.js';
import { log, registerSecret } from '../logger.js';

export const API_BASE = 'https://api.quickbase.com/v1';
export const USER_AGENT = 'quickbase-mcp-server/2.0 (+https://github.com/mark-zellner/QuickBase-MCP-Server)';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type Json = unknown;

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: Json;
  /**
   * Safe to repeat after a timeout/5xx/network failure. Defaults to true for GET, PUT and DELETE.
   * Set it for POSTs that only read (e.g. records/query). 429s are always retried.
   */
  idempotent?: boolean;
  /** Overrides the default Authorization header (used by temp-token flows). */
  authorization?: string;
}

export interface ClientOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  baseUrl?: string;
}

type ClientConfig = Pick<Config, 'realm' | 'userToken' | 'timeoutMs' | 'maxRetries'>;

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 500;

export class QuickBaseClient {
  readonly realm: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly baseUrl: string;

  constructor(config: ClientConfig, options: ClientOptions = {}) {
    this.realm = config.realm;
    this.token = config.userToken;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = options.random ?? Math.random;
    this.baseUrl = (options.baseUrl ?? API_BASE).replace(/\/$/, '');
    registerSecret(this.token);
  }

  // ---- generic transport -------------------------------------------------

  /** Calls the JSON API and returns the parsed body (undefined for empty responses). */
  async request<T = Json>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      'QB-Realm-Hostname': this.realm,
      Authorization: options.authorization ?? `QB-USER-TOKEN ${this.token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    const res = await this.send(url, { method, headers, body }, options.idempotent ?? method !== 'POST');
    return (await this.parseBody(res)) as T;
  }

  /**
   * Calls an action on the legacy XML API (`https://{realm}/db/{dbid}?a=ACTION`).
   * `innerXml` is placed inside `<qdbapi>` next to the user token. Returns the raw response text.
   * Only used for code pages, which have no JSON API equivalent.
   */
  async requestXml(dbid: string, action: string, innerXml: string): Promise<string> {
    if (!/^[a-z0-9]+$/i.test(dbid)) throw new UsageError(`Invalid app id for XML API: ${dbid}`);
    if (!/^API_[A-Za-z]+$/.test(action)) throw new UsageError(`Invalid XML API action: ${action}`);
    const url = `https://${this.realm}/db/${dbid}?a=${action}`;
    const body = `<qdbapi><usertoken>${escapeXml(this.token)}</usertoken>${innerXml}</qdbapi>`;
    const headers = { 'Content-Type': 'application/xml', 'User-Agent': USER_AGENT };
    const res = await this.send(url, { method: 'POST', headers, body }, false);
    return await res.text();
  }

  get<T = Json>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>('GET', path, { query });
  }
  post<T = Json>(path: string, body?: Json, opts: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>('POST', path, { ...opts, body });
  }
  put<T = Json>(path: string, body?: Json, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>('PUT', path, { body, query });
  }
  delete<T = Json>(path: string, opts: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, opts);
  }

  // ---- internals ---------------------------------------------------------

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  private async send(url: string, init: RequestInit, idempotent: boolean): Promise<Response> {
    let attempt = 0;
    for (;;) {
      let res: Response | undefined;
      let failure: unknown;
      try {
        res = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
      } catch (err) {
        failure = err;
      }

      if (res) {
        if (res.ok) return res;
        const retryable = res.status === 429 || (res.status >= 500 && idempotent);
        if (retryable && attempt < this.maxRetries) {
          const delay = this.backoff(attempt, res.headers.get('retry-after'));
          log('warn', `HTTP ${res.status} from Quickbase, retrying in ${delay}ms`, { attempt: attempt + 1 });
          await res.body?.cancel().catch(() => undefined);
          await this.sleep(delay);
          attempt++;
          continue;
        }
        throw await this.toApiError(res);
      }

      const timedOut = failure instanceof Error && (failure.name === 'TimeoutError' || failure.name === 'AbortError');
      if (idempotent && attempt < this.maxRetries) {
        const delay = this.backoff(attempt, null);
        log('warn', `${timedOut ? 'Timeout' : 'Network error'} calling Quickbase, retrying in ${delay}ms`, { attempt: attempt + 1 });
        await this.sleep(delay);
        attempt++;
        continue;
      }
      throw new QuickBaseTransportError(
        timedOut
          ? `Quickbase request timed out after ${this.timeoutMs}ms`
          : `Could not reach Quickbase: ${failure instanceof Error ? failure.message : String(failure)}`,
        { cause: failure },
      );
    }
  }

  private backoff(attempt: number, retryAfter: string | null): number {
    const fromHeader = parseRetryAfter(retryAfter);
    if (fromHeader !== undefined) return Math.min(fromHeader, MAX_BACKOFF_MS);
    const exp = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
    return Math.round(exp / 2 + (this.random() * exp) / 2); // equal jitter
  }

  private async parseBody(res: Response): Promise<Json> {
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (text === '') return undefined;
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('json')) {
      try {
        return JSON.parse(text) as Json;
      } catch {
        throw new QuickBaseTransportError('Quickbase returned malformed JSON');
      }
    }
    return text;
  }

  private async toApiError(res: Response): Promise<QuickBaseApiError> {
    const rayId = res.headers.get('qb-api-ray') ?? undefined;
    let message = res.statusText || `HTTP ${res.status}`;
    let description: string | undefined;
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text) as { message?: unknown; description?: unknown };
        if (typeof data.message === 'string') message = data.message;
        if (typeof data.description === 'string') description = data.description;
      } catch {
        if (text.trim()) message = text.trim().slice(0, 300);
      }
    } catch {
      /* keep defaults */
    }
    return new QuickBaseApiError({ status: res.status, message, description, rayId });
  }
}

/** Retry-After is either delta-seconds or an HTTP date. Returns milliseconds. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - now);
  return undefined;
}

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Wraps text in CDATA, splitting any literal `]]>` so the section cannot be closed early. */
export function cdata(value: string): string {
  return `<![CDATA[${value.split(']]>').join(']]]]><![CDATA[>')}]]>`;
}
