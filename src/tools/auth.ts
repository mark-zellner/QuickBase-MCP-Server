import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { defineTool } from './types.js';

const b64url = (buf: Buffer) => buf.toString('base64url');

export const authTools = [
  defineTool({
    name: 'quickbase_initiate_oauth',
    title: 'Start OAuth (PKCE)',
    description:
      'Build a Quickbase OAuth 2.0 authorization URL with PKCE (S256). Returns the URL, state and code_verifier. ' +
      'Keep the verifier; it is needed to exchange the code. Makes no network call.',
    inputSchema: {
      clientId: z.string().trim().min(1),
      redirectUri: z.url(),
      scopes: z.array(z.string().trim().min(1)).max(20).default(['read:table', 'write:table']),
    },
    write: false,
    handler: async ({ clientId, redirectUri, scopes }, { config }) => {
      const verifier = b64url(randomBytes(48));
      const challenge = b64url(createHash('sha256').update(verifier).digest());
      const state = b64url(randomBytes(16));
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return {
        authorizationUrl: `https://${config.realm}/oauth2/authorize?${params.toString()}`,
        state,
        codeVerifier: verifier,
        codeChallengeMethod: 'S256',
      };
    },
  }),
];
