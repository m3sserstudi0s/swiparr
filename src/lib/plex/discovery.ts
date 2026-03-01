import { logger } from '../logger';

/**
 * Resolve the Plex server URL to use for API calls.
 *
 * PLEX_URL is required configuration, so the provided URL is used directly
 * without any plex.tv server discovery. Discovery was removed because it
 * replaced the operator-supplied URL with a *.plex.direct hostname that is
 * not resolvable inside isolated Docker networks.
 */
export async function resolveServerUrl(
  _userToken: string,
  providedUrl?: string,
  _clientId?: string
): Promise<{ serverUrl: string; machineId: string | null; accessToken: string | null } | null> {
  if (!providedUrl) {
    logger.warn('[PlexDiscovery] No server URL provided and discovery is disabled. Set PLEX_URL.');
    return null;
  }

  // Validate the URL is parseable before returning it.
  try {
    new URL(providedUrl);
  } catch {
    logger.warn('[PlexDiscovery] Provided server URL is not a valid URL:', { url: providedUrl });
    return null;
  }

  logger.info('[PlexDiscovery] Using provided server URL directly:', { url: providedUrl });
  return { serverUrl: providedUrl, machineId: null, accessToken: null };
}
