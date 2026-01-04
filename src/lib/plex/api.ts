import axios from 'axios';
import { getRuntimeConfig } from '../runtime-config';

const PLEX_URL = process.env.PLEX_URL || 'http://localhost:32400';

// Create an axios instance with a timeout to prevent hanging requests
export const apiClient = axios.create({
  timeout: 15000, // 15 seconds
});

export const getPlexUrl = (path: string) => {
  let base = PLEX_URL.replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

// Standard Plex client headers required for all API calls
export const getPlexHeaders = (token?: string) => {
  const config = getRuntimeConfig();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Plex-Product': 'Swiparr',
    'X-Plex-Version': config.version || '1.0.0',
    'X-Plex-Client-Identifier': 'swiparr-app',
    'X-Plex-Platform': 'Web',
    'X-Plex-Device': 'Browser',
    'X-Plex-Device-Name': 'Swiparr',
  };
  
  if (token) {
    headers['X-Plex-Token'] = token;
  }
  
  return headers;
};

// Authenticate via Plex.tv (returns auth token)
export const authenticatePlex = async (username: string, password: string, clientId: string) => {
  const config = getRuntimeConfig();
  
  // Plex authentication is done through plex.tv API
  const response = await axios.post(
    'https://plex.tv/api/v2/users/signin',
    {
      login: username,
      password: password,
      rememberMe: true,
    },
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Plex-Product': 'Swiparr',
        'X-Plex-Version': config.version || '1.0.0',
        'X-Plex-Client-Identifier': clientId,
        'X-Plex-Platform': 'Web',
        'X-Plex-Device': 'Browser',
        'X-Plex-Device-Name': 'Swiparr',
      },
    }
  );
  
  return response.data;
};

// Request a PIN for OAuth-style authentication (like Plex Quick Connect)
export const requestPlexPin = async (clientId: string) => {
  const config = getRuntimeConfig();
  
  const response = await axios.post(
    'https://plex.tv/api/v2/pins',
    {
      strong: true,
      'X-Plex-Product': 'Swiparr',
      'X-Plex-Client-Identifier': clientId,
    },
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Plex-Product': 'Swiparr',
        'X-Plex-Version': config.version || '1.0.0',
        'X-Plex-Client-Identifier': clientId,
        'X-Plex-Platform': 'Web',
      },
    }
  );
  
  return response.data;
};

// Check if a PIN has been claimed
export const checkPlexPin = async (pinId: string | number, clientId: string) => {
  const config = getRuntimeConfig();
  
  const response = await axios.get(
    `https://plex.tv/api/v2/pins/${pinId}`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Product': 'Swiparr',
        'X-Plex-Version': config.version || '1.0.0',
        'X-Plex-Client-Identifier': clientId,
        'X-Plex-Platform': 'Web',
      },
    }
  );
  
  return response.data;
};

// Get user info from plex.tv using auth token
export const getPlexUser = async (authToken: string, clientId: string) => {
  const config = getRuntimeConfig();
  
  const response = await axios.get(
    'https://plex.tv/api/v2/user',
    {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': authToken,
        'X-Plex-Product': 'Swiparr',
        'X-Plex-Version': config.version || '1.0.0',
        'X-Plex-Client-Identifier': clientId,
        'X-Plex-Platform': 'Web',
      },
    }
  );
  
  return response.data;
};

// Verify the local Plex server is accessible with the given token
export const verifyPlexServer = async (token: string) => {
  const response = await apiClient.get(getPlexUrl('/'), {
    headers: getPlexHeaders(token),
  });
  
  return response.data;
};

// Get available servers for the authenticated user
export const getPlexServers = async (authToken: string, clientId: string) => {
  const config = getRuntimeConfig();
  
  const response = await axios.get(
    'https://plex.tv/api/v2/resources',
    {
      params: {
        includeHttps: 1,
        includeRelay: 0,
      },
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': authToken,
        'X-Plex-Product': 'Swiparr',
        'X-Plex-Version': config.version || '1.0.0',
        'X-Plex-Client-Identifier': clientId,
        'X-Plex-Platform': 'Web',
      },
    }
  );
  
  // Filter to only return Plex Media Servers
  return response.data.filter((resource: any) => resource.provides === 'server');
};
