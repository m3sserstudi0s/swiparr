import axios from 'axios';
import https from 'https';
import { getRuntimeConfig } from '../runtime-config';
import { config as appConfig } from '../config';
import { resolveServerUrl } from './discovery';
import { logger } from '../logger';
import { assertSafeUrl, getDefaultProviderBaseUrl } from '@/lib/security/url-guard';

const PLEX_URL = appConfig.PLEX_URL || 'http://localhost:32400';

const httpsAgent = appConfig.security.plexAllowSelfSigned
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

export const plexClient = axios.create({
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
  },
  ...(httpsAgent ? { httpsAgent } : {}),
});

export const getPlexUrl = (path: string, customBaseUrl?: string) => {
  const fallbackBase = getDefaultProviderBaseUrl();
  let base = (customBaseUrl || PLEX_URL || fallbackBase || '').replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const source = customBaseUrl ? (appConfig.app.providerLock ? "env" : "user") : "env";
  assertSafeUrl(base, { source });
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
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
  const response = await plexClient.get(url, {
    headers: getPlexHeaders(token),
  });
  return response.data;
};

/**
 * Get the best Plex server URL using auto-discovery
 * This will:
 * 1. Try to discover servers from plex.tv using the provided token
 * 2. Find the best connection (preferring local HTTPS)
 * 3. Return the discovered URL or fall back to the provided URL
 * 
 * @param token - Plex authentication token
 * @param providedUrl - Optional user-provided URL to fall back to
 * @returns Object with serverUrl, machineId, and accessToken (if shared server)
 */
export async function getBestServerUrl(
  token: string,
  providedUrl?: string,
  clientId?: string
): Promise<{ serverUrl: string; machineId: string | null; accessToken: string | null } | null> {
  try {
    logger.info('[PlexAPI] Discovering best server connection');
    
    const result = await resolveServerUrl(token, providedUrl, clientId);
    
    if (result) {
      logger.info('[PlexAPI] Server URL resolved:', {
        url: result.serverUrl,
        machineId: result.machineId,
        isShared: !!result.accessToken,
      });
      return result;
    }
    
    // If no servers found and no provided URL, return null
    logger.warn('[PlexAPI] Could not resolve server URL');
    return null;
  } catch (error) {
    logger.error('[PlexAPI] Error during server discovery:', error);
    // Fall back to provided URL on error
    if (providedUrl) {
      return { serverUrl: providedUrl, machineId: null, accessToken: null };
    }
    return null;
  }
}
