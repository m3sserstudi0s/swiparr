import { PlexPin, PlexPinResponse } from "./pin-auth";

const PLEX_TV_API_URL = 'https://plex.tv/api/v2';
const CLIENT_ID_KEY = 'swiparr_plex_client_id';

/**
 * Get or create a stable client identifier for Plex
 */
export function getPlexClientId(): string {
  if (typeof window === 'undefined') return 'Swiparr-Server';
  
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function getPlexHeaders(clientId: string) {
  return {
    'X-Plex-Client-Identifier': clientId,
    'X-Plex-Product': 'Swiparr',
    'X-Plex-Version': '1.0.0',
    'X-Plex-Platform': 'Web',
    'X-Plex-Device': 'Web',
    'Accept': 'application/json',
  };
}

/**
 * Creates a new PIN for Plex authentication directly from the client
 */
export async function createPlexPinClient(): Promise<PlexPin> {
  const clientId = getPlexClientId();
  
  const response = await fetch(`${PLEX_TV_API_URL}/pins?strong=true`, {
    method: 'POST',
    headers: getPlexHeaders(clientId),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Plex PIN: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    code: data.code,
  };
}

/**
 * Polls a PIN status directly from the client
 */
export async function pollPlexPinClient(pinId: number): Promise<PlexPinResponse | null> {
  const clientId = getPlexClientId();
  
  const response = await fetch(`${PLEX_TV_API_URL}/pins/${pinId}`, {
    method: 'GET',
    headers: getPlexHeaders(clientId),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to poll Plex PIN: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    code: data.code,
    authToken: data.authToken,
    user: data.user ? {
      id: data.user.id?.toString(),
      uuid: data.user.uuid,
      username: data.user.username,
      email: data.user.email,
      thumb: data.user.thumb,
    } : undefined,
  };
}

/**
 * Builds the Plex authentication URL
 */
export function buildPlexAuthUrl(pinCode: string): string {
  const clientId = getPlexClientId();
  
  const params = new URLSearchParams({
    'code': pinCode,
    'clientID': clientId,
    'context[device][product]': 'Swiparr',
    'context[device][version]': '1.0.0',
    'context[device][platform]': 'Web',
    'context[device][device]': 'Web',
  });

  return `https://app.plex.tv/auth#?${params.toString()}`;
}
