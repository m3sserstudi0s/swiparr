import axios from "axios";
import { getRuntimeConfig } from "./runtime-config";

const config = getRuntimeConfig();
const basePath = config.basePath || "";

export const apiClient = axios.create();

apiClient.interceptors.request.use((config) => {
  if (config.url?.startsWith("/") && basePath && !config.url.startsWith(basePath)) {
    config.url = `${basePath}${config.url}`;
  }
  return config;
});

// For SWR fetchers
export const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);
