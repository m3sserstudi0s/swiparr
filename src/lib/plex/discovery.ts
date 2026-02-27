import axios from 'axios';
import { getPlexHeaders } from './api';
import { logger } from '../logger';

const PLEX_TV_API = 'https://plex.tv';

export interface PlexServerConnection {
  uri: string;
  local: boolean;
  protocol: string;
  address: string;
  port: number;
}

export interface PlexServer {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  provides: string;
  accessToken?: string;
  connections: PlexServerConnection[];
}

/**
 * Parse XML response from plex.tv/api/resources
 * Handles both single and multiple devices/connections
 */
function parsePlexResourcesXml(xml: string): PlexServer[] {
  const servers: PlexServer[] = [];
  
  // Parse Device elements
  const deviceRegex = /<Device[^>]*>/g;
  const devices: string[] = [];
  let match;
  while ((match = deviceRegex.exec(xml)) !== null) {
    devices.push(match[0]);
  }
  
  for (const deviceTag of devices) {
    // Extract device attributes
    const name = extractAttribute(deviceTag, 'name');
    const clientIdentifier = extractAttribute(deviceTag, 'clientIdentifier');
    const owned = extractAttribute(deviceTag, 'owned') === '1';
    const provides = extractAttribute(deviceTag, 'provides');
    const accessToken = extractAttribute(deviceTag, 'accessToken');
    
    // Skip non-server devices
    if (provides !== 'server') {
      continue;
    }
    
    // Find Connection elements for this device
    const connections = extractConnectionsForDevice(xml, deviceTag);
    
    if (connections.length > 0) {
      servers.push({
        name,
        clientIdentifier,
        owned,
        provides,
        accessToken,
        connections,
      });
    }
  }
  
  return servers;
}

function extractAttribute(tag: string, attrName: string): string {
  const regex = new RegExp(`${attrName}="([^"]*)"`);
  const match = tag.match(regex);
  return match ? match[1] : '';
}

function extractConnectionsForDevice(xml: string, deviceTag: string): PlexServerConnection[] {
  const connections: PlexServerConnection[] = [];
  
  // Find the position of this device tag
  const deviceIndex = xml.indexOf(deviceTag);
  if (deviceIndex === -1) return connections;
  
  // Find the closing tag or next device tag
  const nextDeviceIndex = xml.indexOf('<Device', deviceIndex + 1);
  const deviceXml = nextDeviceIndex !== -1 
    ? xml.substring(deviceIndex, nextDeviceIndex)
    : xml.substring(deviceIndex);
  
  // Parse Connection elements within this device
  const connRegex = /<Connection[^>]*\/>/g;
  let connMatch;
  while ((connMatch = connRegex.exec(deviceXml)) !== null) {
    const connTag = connMatch[0];
    
    const uri = extractAttribute(connTag, 'uri');
    const address = extractAttribute(connTag, 'address');
    const portStr = extractAttribute(connTag, 'port');
    const localStr = extractAttribute(connTag, 'local');
    const protocol = extractAttribute(connTag, 'protocol') || 'http';
    
    if (uri) {
      connections.push({
        uri,
        local: localStr === '1' || localStr === 'true',
        protocol,
        address,
        port: parseInt(portStr) || 32400,
      });
    }
  }
  
  return connections;
}

/**
 * Convert an IP address to a .plex.direct hostname
 * Format: <IP-with-dashes>.<machine-id>.plex.direct
 */
export function ipToPlexDirect(ip: string, machineId: string): string {
  const ipWithDashes = ip.replace(/\./g, '-');
  return `${ipWithDashes}.${machineId}.plex.direct`;
}

/**
 * Check if a URL uses an IP address instead of a hostname
 */
export function isIpAddress(host: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4Regex.test(host);
}

/**
 * Convert a URL with IP to .plex.direct URL
 */
export function convertToPlexDirectUrl(url: string, machineId: string): string {
  try {
    const urlObj = new URL(url);
    if (isIpAddress(urlObj.hostname)) {
      const plexDirectHost = ipToPlexDirect(urlObj.hostname, machineId);
      urlObj.hostname = plexDirectHost;
      return urlObj.toString();
    }
    return url;
  } catch (error) {
    logger.warn('[PlexDiscovery] Failed to convert URL to .plex.direct:', { url, error });
    return url;
  }
}

/**
 * Fetch user's Plex servers from plex.tv
 */
export async function getUserServers(userToken: string, clientId?: string): Promise<PlexServer[]> {
  try {
    logger.info('[PlexDiscovery] Fetching user servers from plex.tv');
    
    const response = await axios.get(`${PLEX_TV_API}/api/resources`, {
      headers: {
        ...getPlexHeaders(userToken, clientId),
        'Accept': 'application/xml',
      },
      params: {
        includeHttps: '1',
        includeRelay: '1',
      },
      timeout: 30000,
    });
    
    const servers = parsePlexResourcesXml(response.data);
    
    logger.info('[PlexDiscovery] Found servers:', {
      count: servers.length,
      names: servers.map(s => s.name),
    });
    
    return servers;
  } catch (error) {
    logger.error('[PlexDiscovery] Failed to fetch user servers:', error);
    return [];
  }
}

/**
 * Find the best connection for a target server
 * Priority:
 * 1. Local HTTPS connection (including .plex.direct)
 * 2. Local HTTP connection
 * 3. Remote HTTPS connection
 * 4. Remote HTTP connection (including relay)
 */
function findBestConnection(server: PlexServer, targetMachineId?: string): PlexServerConnection | null {
  const connections = server.connections;
  
  if (connections.length === 0) {
    return null;
  }
  
  // Prioritize local connections over remote
  const localConnections = connections.filter(c => c.local);
  const remoteConnections = connections.filter(c => !c.local);
  
  // Prioritize HTTPS over HTTP
  const prioritizeConnections = (conns: PlexServerConnection[]) => {
    const https = conns.filter(c => c.protocol === 'https' || c.uri.startsWith('https://'));
    const http = conns.filter(c => c.protocol !== 'https' && !c.uri.startsWith('https://'));
    return [...https, ...http];
  };
  
  const prioritizedLocal = prioritizeConnections(localConnections);
  const prioritizedRemote = prioritizeConnections(remoteConnections);
  
  // Return first available connection in priority order
  const allPrioritized = [...prioritizedLocal, ...prioritizedRemote];
  
  return allPrioritized[0] || null;
}

/**
 * Find the best server connection for the user
 * If targetMachineId is provided, will try to match that specific server
 */
export async function findBestServerConnection(
  userToken: string,
  targetMachineId?: string,
  clientId?: string
): Promise<{ serverUrl: string | null; machineId: string | null; accessToken: string | null }> {
  try {
    const servers = await getUserServers(userToken, clientId);
    
    if (servers.length === 0) {
      logger.warn('[PlexDiscovery] No servers found for user');
      return { serverUrl: null, machineId: null, accessToken: null };
    }
    
    // Filter to accessible servers (owned or shared with access token)
    const accessibleServers = servers.filter(s => 
      s.owned || s.accessToken
    );
    
    if (accessibleServers.length === 0) {
      logger.warn('[PlexDiscovery] No accessible servers found');
      return { serverUrl: null, machineId: null, accessToken: null };
    }
    
    // Find target server
    let targetServer = targetMachineId 
      ? accessibleServers.find(s => s.clientIdentifier === targetMachineId)
      : null;
    
    // If no specific target or not found, use first accessible server
    if (!targetServer) {
      targetServer = accessibleServers[0];
      logger.info('[PlexDiscovery] Using first accessible server:', { name: targetServer.name });
    } else {
      logger.info('[PlexDiscovery] Found target server:', { name: targetServer.name, machineId: targetMachineId });
    }
    
    const bestConnection = findBestConnection(targetServer, targetMachineId);
    
    if (!bestConnection) {
      logger.warn('[PlexDiscovery] No valid connection found for server:', { name: targetServer.name });
      return { serverUrl: null, machineId: null, accessToken: null };
    }
    
    // For shared servers, use the shared access token
    const isSharedServer = !targetServer.owned && !!targetServer.accessToken;
    const accessToken: string | null = isSharedServer && targetServer.accessToken ? targetServer.accessToken : null;
    
    logger.info('[PlexDiscovery] Best connection found:', {
      server: targetServer.name,
      uri: bestConnection.uri,
      local: bestConnection.local,
      protocol: bestConnection.protocol,
      isShared: isSharedServer,
    });
    
    return {
      serverUrl: bestConnection.uri,
      machineId: targetServer.clientIdentifier,
      accessToken,
    };
  } catch (error) {
    logger.error('[PlexDiscovery] Error finding best server connection:', error);
    return { serverUrl: null, machineId: null, accessToken: null };
  }
}

/**
 * Convert an IP-based server URL to a .plex.direct URL if needed
 * This helps avoid TLS certificate errors when using local HTTPS
 */
export async function resolveServerUrl(
  userToken: string,
  providedUrl?: string,
  clientId?: string
): Promise<{ serverUrl: string; machineId: string | null; accessToken: string | null } | null> {
  // If a URL is provided and uses a hostname (not IP), use it directly
  if (providedUrl) {
    try {
      const urlObj = new URL(providedUrl);
      if (!isIpAddress(urlObj.hostname)) {
        logger.info('[PlexDiscovery] Using provided URL with hostname:', { url: providedUrl });
        return { serverUrl: providedUrl, machineId: null, accessToken: null };
      }
    } catch {
      // Invalid URL, continue to discovery
    }
  }

   // If a URL is provided with an IP address, try to find the matching server via
  // discovery so we can resolve its machineId and get a .plex.direct URL.
  // We match by comparing the IP address and port of the provided URL against
  // each server's connections — this prevents picking the wrong server when the
  // user has multiple Plex servers linked to their account.
  if (providedUrl) {
    try {
      const providedUrlObj = new URL(providedUrl);
      const providedHost = providedUrlObj.hostname;
      const providedPort = parseInt(providedUrlObj.port) || (providedUrlObj.protocol === 'https:' ? 443 : 80);

      const servers = await getUserServers(userToken, clientId);
      const accessibleServers = servers.filter(s => s.owned || s.accessToken);

      // Find the server whose connections include the provided IP+port
      const matchedServer = accessibleServers.find(server =>
        server.connections.some(conn => {
          try {
            const connUrl = new URL(conn.uri);
            const connHost = connUrl.hostname;
            const connPort = parseInt(connUrl.port) || (connUrl.protocol === 'https:' ? 443 : 80);
            // Match by IP address and port
            return connHost === providedHost && connPort === providedPort;
          } catch {
            return false;
          }
        })
      );

      if (matchedServer) {
        const bestConnection = findBestConnection(matchedServer);
        const isSharedServer = !matchedServer.owned && !!matchedServer.accessToken;
        const accessToken: string | null = isSharedServer && matchedServer.accessToken ? matchedServer.accessToken : null;

        if (bestConnection) {
          logger.info('[PlexDiscovery] Matched provided IP URL to server:', {
            server: matchedServer.name,
            machineId: matchedServer.clientIdentifier,
            resolvedUri: bestConnection.uri,
          });
          return {
            serverUrl: bestConnection.uri,
            machineId: matchedServer.clientIdentifier,
            accessToken,
          };
        }
      }

      // No matching server found — fall back to the provided URL as-is
      logger.warn('[PlexDiscovery] Could not match provided IP URL to any discovered server, using it directly:', { url: providedUrl });
      return { serverUrl: providedUrl, machineId: null, accessToken: null };
    } catch (error) {
      logger.warn('[PlexDiscovery] Discovery failed while matching IP URL, falling back to provided URL:', { url: providedUrl, error });
      return { serverUrl: providedUrl, machineId: null, accessToken: null };
    }
  }

  // No URL provided — discover and use the first accessible server
  const discovered = await findBestServerConnection(userToken, undefined, clientId);

  if (discovered.serverUrl) {
    return {
      serverUrl: discovered.serverUrl,
      machineId: discovered.machineId,
      accessToken: discovered.accessToken,
    };
  }

  return null;
}
