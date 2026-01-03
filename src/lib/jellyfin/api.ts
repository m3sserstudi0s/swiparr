import axios from 'axios';
import { getRuntimeConfig } from '../runtime-config';

const JELLYFIN_URL = process.env.JELLYFIN_URL || 'http://localhost:8096';

// Create an axios instance with a timeout to prevent hanging requests
export const apiClient = axios.create({
  timeout: 15000, // 15 seconds
});

export const getJellyfinUrl = (path: string) => {
  let base = JELLYFIN_URL.replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

export const getAuthHeaders = (deviceId: string) => {
  const auth = `MediaBrowser Client="Swiparr", Device="Web", DeviceId="${deviceId}", Version="1.0.0"`;
  return {
    'Authorization': auth,
  };
};

export const getAuthenticatedHeaders = (accessToken: string, deviceId: string) => {
  const auth = `MediaBrowser Token="${accessToken}", Client="Swiparr", Device="Web", DeviceId="${deviceId}", Version="1.0.0"`;
  return {
    'Authorization': auth,
  };
};

export const authenticateJellyfin = async (username: string, pw: string, deviceId: string) => {
  const url = getJellyfinUrl('Users/AuthenticateByName');
  const config = getRuntimeConfig()
  const response = await apiClient.post(
    url,
    {
      Username: username,
      Pw: pw,
      Password: pw, // Some versions prefer Password over Pw
      App: "Swiparr",
      Version: config.version,
      Device: "Web",
      DeviceId: deviceId
    },
    { headers: { ...getAuthHeaders(deviceId), 'Content-Type': 'application/json' } },
  );
  return response.data;
};

export const getQuickConnectEnabled = async () => {
  const url = getJellyfinUrl('QuickConnect/Enabled');
  const res = await apiClient.get(url);
  return res.data;
};

export const initiateQuickConnect = async (deviceId: string) => {
  const url = getJellyfinUrl('QuickConnect/Initiate');
  const res = await apiClient.post(url, null, { headers: getAuthHeaders(deviceId) });
  return res.data; // { Code, Secret, ... }
};

export const checkQuickConnect = async (secret: string, deviceId: string) => {
  const url = getJellyfinUrl('Users/AuthenticateWithQuickConnect');
  const res = await apiClient.post(
    url,
    {
      Secret: secret,
      App: "Swiparr",
      Version: "1.0.0",
      Device: "Web",
      DeviceId: deviceId
    },
    { headers: getAuthHeaders(deviceId) }
  );
  return res.data; // { User, AccessToken, ... } when authenticated
};