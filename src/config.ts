import { z } from 'zod';

/** Everything the server needs from the environment. Parsed once at startup. */
export interface Config {
  realm: string;
  userToken: string;
  appId?: string;
  timeoutMs: number;
  maxRetries: number;
  readOnly: boolean;
  codepageTableId?: string;
  codepageVersionTableId?: string;
  workspaceDir: string;
}

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const boolish = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.enum(['true', 'false', '1', '0', 'yes', 'no']).optional(),
);

const EnvSchema = z.object({
  QB_REALM: z.string().trim().min(1, 'QB_REALM is required (e.g. mycompany.quickbase.com)'),
  QB_USER_TOKEN: z.string().trim().min(1, 'QB_USER_TOKEN is required'),
  QB_APP_ID: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  QB_DEFAULT_TIMEOUT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1000).max(300_000).default(30_000)),
  QB_MAX_RETRIES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10).default(3)),
  QB_READ_ONLY: boolish,
  CODEPAGE_TABLE_ID: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  CODEPAGE_VERSION_TABLE_ID: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  QB_WORKSPACE_DIR: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

/** Accepts `acme.quickbase.com`, `https://acme.quickbase.com/` or `acme.quickbase.com/db/xyz`. */
export function normalizeRealm(input: string): string {
  const withoutScheme = input.trim().replace(/^https?:\/\//i, '');
  const host = withoutScheme.split(/[/?#]/)[0] ?? '';
  return host.toLowerCase();
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`);
    throw new ConfigError(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
  const e = parsed.data;
  const realm = normalizeRealm(e.QB_REALM);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(realm)) {
    throw new ConfigError(`QB_REALM "${e.QB_REALM}" does not look like a hostname such as mycompany.quickbase.com`);
  }
  return {
    realm,
    userToken: e.QB_USER_TOKEN,
    appId: e.QB_APP_ID,
    timeoutMs: e.QB_DEFAULT_TIMEOUT,
    maxRetries: e.QB_MAX_RETRIES,
    readOnly: e.QB_READ_ONLY === 'true' || e.QB_READ_ONLY === '1' || e.QB_READ_ONLY === 'yes',
    codepageTableId: e.CODEPAGE_TABLE_ID,
    codepageVersionTableId: e.CODEPAGE_VERSION_TABLE_ID,
    workspaceDir: e.QB_WORKSPACE_DIR ?? cwd,
  };
}
