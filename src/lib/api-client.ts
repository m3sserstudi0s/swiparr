import axios from "axios";
import { getRuntimeConfig } from "./runtime-config";

const config = getRuntimeConfig();
const basePath = config.basePath || "";

export const apiClient = axios.create();

// Augment Axios Error type to include errorId
declare module 'axios' {
  export interface AxiosError {
    errorId?: string;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.errorId) {
      error.errorId = error.response.data.errorId;
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.request.use((config) => {
  // Only prepend if it's a relative path and NOT already prepended
  if (
    config.url?.startsWith("/") && 
    basePath && 
    !config.url.startsWith(basePath + "/") && 
    config.url !== basePath
  ) {
    config.url = `${basePath}${config.url}`;
  }
  return config;
});

// For TanStack Query, we use apiClient directly

