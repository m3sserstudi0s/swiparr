import axios from 'axios';

const JELLYFIN_URL = process.env.JELLYFIN_URL || 'http://localhost:8096';

export const getJellyfinUrl = (path: string) => {
  const base = JELLYFIN_URL.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

export const getAuthHeaders = (deviceId: string) => ({
  'X-Emby-Authorization': `MediaBrowser Client="Swiparr", Device="Web", DeviceId="${deviceId}", Version="1.0.0"`,
});

export const getAuthenticatedHeaders = (accessToken: string, deviceId: string) => ({
  ...getAuthHeaders(deviceId),
  'X-Emby-Token': accessToken,
});

export const authenticateJellyfin = async (username: string, pw: string, deviceId: string) => {
  const url = getJellyfinUrl('Users/AuthenticateByName');
  const response = await axios.post(
    url,
    { Username: username, Pw: pw },
    { headers: { ...getAuthHeaders(deviceId), 'Content-Type': 'application/json' } },
  );
  return response.data;
};

export const getQuickConnectEnabled = async () => {
  const url = getJellyfinUrl('QuickConnect/Enabled');
  const res = await axios.get(url);
  return res.data;
};

export const initiateQuickConnect = async (deviceId: string) => {
  const url = getJellyfinUrl('QuickConnect/Initiate');
  const res = await axios.post(url, null, { headers: getAuthHeaders(deviceId) });
  return res.data; // { Code, Secret, ... }
};

export const checkQuickConnect = async (secret: string, deviceId: string) => {
  const url = getJellyfinUrl('Users/AuthenticateWithQuickConnect');
  const res = await axios.post(url, { Secret: secret }, { headers: getAuthHeaders(deviceId) });
  return res.data; // { User, AccessToken, ... } when authenticated
};