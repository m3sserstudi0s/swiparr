import axios from 'axios';
import { getRuntimeConfig } from '../runtime-config';

const PLEX_URL = process.env.PLEX_URL || 'http://localhost:32400';

export const plexClient = axios.create({
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
  }
});

export const getPlexUrl = (path: string, customBaseUrl?: string) => {
  let base = (customBaseUrl || PLEX_URL).replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

export const getPlexHeaders = (token?: string) => {
  const headers: any = {
    'X-Plex-Client-Identifier': 'Swiparr',
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
