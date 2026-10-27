import type { z, ZodRawShape } from 'zod';
import type { Config } from '../config.js';
import type { QuickBaseClient } from '../quickbase/client.js';

export interface ToolContext {
  client: QuickBaseClient;
  config: Config;
}

export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface ToolDef<S extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  /** true when the tool changes data or schema in Quickbase (or on disk). Hidden when QB_READ_ONLY=true. */
  write: boolean;
  /** For write tools: destructive (deletes/overwrites) vs. additive. */
  destructive?: boolean;
  /** Safe to repeat with the same arguments. */
  idempotent?: boolean;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
}

/** Identity helper that keeps argument types inferred from the zod shape. */
export function defineTool<S extends ZodRawShape>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

const MAX_RESULT_CHARS = 200_000;

export function jsonResult(value: unknown): ToolResult {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? { ok: true }, null, 2);
  if (text.length > MAX_RESULT_CHARS) {
    text = `${text.slice(0, MAX_RESULT_CHARS)}\n… [truncated ${text.length - MAX_RESULT_CHARS} characters. Narrow the query with select/top/skip.]`;
  }
  return { content: [{ type: 'text', text }] };
}

export function errorResult(message: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
