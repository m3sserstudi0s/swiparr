import axios from 'axios';
import { getRuntimeConfig } from '../runtime-config';
import { config as appConfig } from '../config';
import { assertSafeUrl, getDefaultProviderBaseUrl } from '@/lib/security/url-guard';

const EMBY_URL = appConfig.EMBY_URL || 'http://localhost:8096';


// Create an axios instance with a timeout to prevent hanging requests
export const apiClient = axios.create({
  timeout: 60000, // 60 seconds
});

export const getEmbyUrl = (path: string, customBaseUrl?: string) => {
  const fallbackBase = getDefaultProviderBaseUrl();
  let base = (customBaseUrl || EMBY_URL || fallbackBase || '').replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = `http://${base}`;
  }
  const source = customBaseUrl ? (appConfig.app.providerLock ? "env" : "user") : "env";
  assertSafeUrl(base, { source });
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

export const getAuthHeaders = (deviceId: string) => {
  const auth = `Emby Client="Swiparr", Device="Web", DeviceId="${deviceId}", Version="1.0.0"`;
  return {
    'Authorization': auth,
  };
};

export const getAuthenticatedHeaders = (accessToken: string, deviceId: string) => {
  const auth = `Emby Token="${accessToken}", Client="Swiparr", Device="Web", DeviceId="${deviceId}", Version="1.0.0"`;
  return {
    'Authorization': auth,
  };
};

export const authenticateEmby = async (username: string, pw: string, deviceId: string, customBaseUrl?: string) => {
  const url = getEmbyUrl('Users/AuthenticateByName', customBaseUrl);
  const config = getRuntimeConfig()
  const response = await apiClient.post(
    url,
    {
      Username: username,
      Pw: pw,
      Password: pw,
      App: "Swiparr",
      Version: config.version,
      Device: "Web",
      DeviceId: deviceId
    },
    { headers: { ...getAuthHeaders(deviceId), 'Content-Type': 'application/json' } },
  );
  return response.data;
};
