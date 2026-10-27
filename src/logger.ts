/**
 * stderr-only logger. stdout belongs to the MCP stdio transport, so nothing in
 * this package may write to it. Secrets are masked before anything is printed.
 */
let secrets: string[] = [];

export function registerSecret(value: string | undefined): void {
  if (value && value.length >= 6 && !secrets.includes(value)) secrets.push(value);
}

export function resetSecrets(): void {
  secrets = [];
}

export function redact(text: string): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join('***');
  return out.replace(/(QB-(?:USER|TEMP)-TOKEN\s+)\S+/gi, '$1***');
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
const order: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

function threshold(): number {
  const raw = (process.env.QB_LOG_LEVEL ?? 'warn').toLowerCase() as LogLevel;
  return order[raw] ?? order.warn;
}

export function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  if (order[level] > threshold()) return;
  const line = extra ? `${message} ${JSON.stringify(extra)}` : message;
  process.stderr.write(`[quickbase-mcp] ${level.toUpperCase()} ${redact(line)}\n`);
}
