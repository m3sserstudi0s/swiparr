import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import https from 'https';
import { config as appConfig } from '../config';
import { resolveServerUrl } from './discovery';
import { assertSafeUrl, assertSafeResolvedUrl, getDefaultProviderBaseUrl } from '@/lib/security/url-guard';
import { logger } from '@/lib/logger';

const PLEX_URL = appConfig.PLEX_URL || 'http://localhost:32400';

export const plexClient = axios.create({
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
  },
});

/**
 * TLS error codes emitted by Node.js when a server presents a self-signed or
 * otherwise untrusted certificate.
 */
const TLS_ERROR_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function isTlsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const code = (err.code as string) || ((err.cause as Record<string, unknown>)?.code as string);
  return TLS_ERROR_CODES.has(code);
}

/**
 * Returns true when self-signed certificate bypass is permitted:
 * - Always allowed when PROVIDER_LOCK=true (operator-configured server URL).
 * - Allowed when PROVIDER_LOCK=false only if ALLOW_PRIVATE_PROVIDER_URLS=true.
 */
function canBypassSelfSigned(): boolean {
  if (appConfig.app.providerLock) return true;
  return appConfig.security.allowPrivateProviderUrls;
}

/**
 * Drop-in replacement for plexClient.request() that automatically retries
 * with TLS certificate validation disabled when:
 *   1. The server returns a self-signed / untrusted certificate error, AND
 *   2. canBypassSelfSigned() returns true.
 *
 * A warning is logged when the bypass is applied so operators are aware.
 */
export async function plexRequest<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  try {
    return await plexClient.request<T>(config);
  } catch (error: unknown) {
    if (isTlsError(error) && canBypassSelfSigned()) {
      logger.warn(
        '[PlexClient] TLS certificate error detected (self-signed or untrusted). ' +
        'Retrying with certificate validation disabled. ' +
        'This is allowed because ' +
        (appConfig.app.providerLock ? 'PROVIDER_LOCK=true' : 'ALLOW_PRIVATE_PROVIDER_URLS=true') + '.'
      );
      const insecureClient = axios.create({
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      return await insecureClient.request<T>(config);
    }
    throw error;
  }
}

export const getPlexUrl = (path: string, customBaseUrl?: string): string => {
  const fallbackBase = getDefaultProviderBaseUrl();
  let base = (customBaseUrl || PLEX_URL || fallbackBase || '').replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const source = customBaseUrl ? (appConfig.app.providerLock ? "env" : "user") : "env";
  // Synchronous structural + private-IP check (pattern matching only).
  // For user-supplied URLs, callers that need full DNS-resolution protection
  // should additionally call assertSafeResolvedUrl (M9).
  assertSafeUrl(base, { source });
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

/**
 * Validate a user-supplied Plex server base URL including post-DNS-resolution
 * private-IP checks (SSRF defence, M9).  Call this once before using a URL
 * that originated from untrusted input (e.g. at authentication time).
 */
export const assertSafePlexServerUrl = async (serverUrl: string): Promise<void> => {
  const source = appConfig.app.providerLock ? "env" : "user";
  if (source === "user") {
    await assertSafeResolvedUrl(serverUrl, { source });
  } else {
    assertSafeUrl(serverUrl, { source });
  }
};

export const getPlexHeaders = (token?: string, clientId?: string) => {
  const headers: any = {
    'X-Plex-Client-Identifier': clientId || 'Swiparr',
    'X-Plex-Product': 'Swiparr',
    'X-Plex-Version': '1.0.0',
    'X-Plex-Platform': 'Web',
    'X-Plex-Device': 'Web',
    'Accept': 'application/json',
  };
  if (token) {
    headers['X-Plex-Token'] = token;
  }
  return headers;
};

export const authenticatePlex = async (token: string, customBaseUrl?: string) => {
  // Plex "authentication" with a token is just verifying the token works
  const url = getPlexUrl('myplex/account', customBaseUrl);
  const response = await plexRequest({
    method: 'get',
    url,
    headers: getPlexHeaders(token),
  });
  return response.data;
};

/**
 * Resolve the Plex server URL to use for API calls.
 * PLEX_URL is required configuration; no plex.tv discovery is performed.
 *
 * @param token - Plex authentication token (unused, kept for API compatibility)
 * @param providedUrl - The configured server URL (from PLEX_URL env var or session)
 * @returns Object with serverUrl, machineId, and accessToken
 */
export async function getBestServerUrl(
  token: string,
  providedUrl?: string,
  clientId?: string
): Promise<{ serverUrl: string; machineId: string | null; accessToken: string | null } | null> {
  return resolveServerUrl(token, providedUrl, clientId);
}
