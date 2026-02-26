import axios from 'axios';

const PLEX_TV_API_URL = 'https://plex.tv/api/v2';

export interface PlexPin {
  id: number;
  code: string;
}

export interface PlexPinResponse {
  id: number;
  code: string;
  authToken?: string;
  user?: {
    id: string;
    uuid: string;
    username: string;
    email: string;
    thumb?: string;
  };
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
 * Creates a new PIN for Plex authentication
 * POST to https://plex.tv/api/v2/pins?strong=true
 */
export async function createPin(clientId: string): Promise<PlexPin> {
  const response = await axios.post(
    `${PLEX_TV_API_URL}/pins?strong=true`,
    {},
    {
      headers: getPlexHeaders(clientId),
      timeout: 30000,
    }
  );

  const data = response.data;
  
  return {
    id: data.id,
    code: data.code,
  };
}

/**
 * Polls a PIN to check its status
 * GET https://plex.tv/api/v2/pins/{id}
 * Returns authToken and user info if the PIN has been authorized
 */
export async function pollPin(pinId: number, clientId: string): Promise<PlexPinResponse | null> {
  try {
    const response = await axios.get(
      `${PLEX_TV_API_URL}/pins/${pinId}`,
      {
        headers: getPlexHeaders(clientId),
        timeout: 30000,
      }
    );

    const data = response.data;
    
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
  } catch (error: any) {
    if (error.response?.status === 404) {
      // 404 means the PIN hasn't been authorized yet or has expired
      return null;
    }
    throw error;
  }
}

/**
 * Builds the Plex authentication URL for PIN-based auth
 * Users will open this URL in their browser to authorize the app
 */
export function buildAuthUrl(pinCode: string, clientId: string, forwardUrl?: string): string {
  const params = new URLSearchParams({
    'code': pinCode,
    'clientID': clientId,
    'context[device][product]': 'Swiparr',
    'context[device][version]': '1.0.0',
    'context[device][platform]': 'Web',
    'context[device][device]': 'Web',
  });

  if (forwardUrl) {
    params.append('forwardUrl', forwardUrl);
  }

  return `https://app.plex.tv/auth#?${params.toString()}`;
}
