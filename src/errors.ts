import { redact } from './logger.js';

/** Error returned by the Quickbase API, normalised. */
export class QuickBaseApiError extends Error {
  readonly status: number;
  readonly description?: string;
  readonly rayId?: string;
  readonly retryable: boolean;

  constructor(opts: { status: number; message: string; description?: string; rayId?: string }) {
    super(opts.message);
    this.name = 'QuickBaseApiError';
    this.status = opts.status;
    this.description = opts.description;
    this.rayId = opts.rayId;
    this.retryable = opts.status === 429 || opts.status >= 500;
  }
}

/** Network failure, timeout or an unusable response, as opposed to an API-level error. */
export class QuickBaseTransportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'QuickBaseTransportError';
  }
}

/** The caller asked for something invalid or unsupported (bad arguments, missing config, blocked path). */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

const STATUS_HINTS: Record<number, string> = {
  400: 'Bad request. Check the arguments (table/field IDs, query syntax).',
  401: 'Authentication failed. Check QB_USER_TOKEN and that it belongs to QB_REALM and is not expired.',
  403: 'Forbidden. The token user lacks permission for this resource.',
  404: 'Not found. Check the table/field/record/report ID and the app.',
  422: 'Quickbase rejected the data. Check field IDs, types and required fields.',
  429: 'Rate limited by Quickbase even after retries. Slow down and try again shortly.',
};

/** Turns any thrown value into a short, actionable, secret-free message for the model. */
export function describeError(error: unknown): string {
  if (error instanceof QuickBaseApiError) {
    const hint = STATUS_HINTS[error.status] ?? (error.status >= 500 ? 'Quickbase had a server error. Retry later.' : undefined);
    const parts = [`Quickbase API error ${error.status}: ${error.message}`];
    if (error.description && error.description !== error.message) parts.push(error.description);
    if (hint) parts.push(`Hint: ${hint}`);
    if (error.rayId) parts.push(`(qb-api-ray ${error.rayId})`);
    return redact(parts.join(' '));
  }
  if (error instanceof QuickBaseTransportError || error instanceof UsageError) {
    return redact(error.message);
  }
  if (error instanceof Error) {
    return redact(`Unexpected error: ${error.message}`);
  }
  return 'Unexpected error';
}
