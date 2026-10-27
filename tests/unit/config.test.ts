import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig, normalizeRealm } from '../../src/config.js';

const base = { QB_REALM: 'acme.quickbase.com', QB_USER_TOKEN: 'tok_123456' };

describe('loadConfig', () => {
  it('applies defaults', () => {
    const c = loadConfig(base, '/work');
    expect(c).toMatchObject({ realm: 'acme.quickbase.com', timeoutMs: 30000, maxRetries: 3, readOnly: false, workspaceDir: '/work' });
  });

  it('treats empty optional values as unset', () => {
    const c = loadConfig({ ...base, QB_APP_ID: '', QB_DEFAULT_TIMEOUT: '', CODEPAGE_TABLE_ID: ' ' }, '/w');
    expect(c.appId).toBeUndefined();
    expect(c.codepageTableId).toBeUndefined();
    expect(c.timeoutMs).toBe(30000);
  });

  it('parses overrides and read-only flag', () => {
    const c = loadConfig({ ...base, QB_DEFAULT_TIMEOUT: '5000', QB_MAX_RETRIES: '0', QB_READ_ONLY: 'TRUE' }, '/w');
    expect(c).toMatchObject({ timeoutMs: 5000, maxRetries: 0, readOnly: true });
  });

  it('reports every problem and never echoes the token', () => {
    let message = '';
    try {
      loadConfig({ QB_USER_TOKEN: '', QB_DEFAULT_TIMEOUT: 'abc' });
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      message = (e as Error).message;
    }
    expect(message).toContain('QB_REALM');
    expect(message).toContain('QB_USER_TOKEN');
    expect(message).toContain('QB_DEFAULT_TIMEOUT');
  });

  it('rejects a realm that is not a hostname', () => {
    expect(() => loadConfig({ ...base, QB_REALM: 'not a host' })).toThrow(ConfigError);
  });
});

describe('normalizeRealm', () => {
  it.each([
    ['acme.quickbase.com', 'acme.quickbase.com'],
    ['https://Acme.QuickBase.com/', 'acme.quickbase.com'],
    ['acme.quickbase.com/db/main', 'acme.quickbase.com'],
  ])('%s', (input, expected) => expect(normalizeRealm(input)).toBe(expected));
});
