import { Filters } from "./session";

export interface UserSession {
  Id: string;
  Name: string;
  AccessToken?: string;
  DeviceId: string;
  isAdmin?: boolean;
  wasMadeAdmin?: boolean;
  isGuest?: boolean;
  provider?: string;
  providerConfig?: {
    serverUrl?: string;
    tmdbToken?: string;
  };
}

export interface SessionData {
  user: UserSession;
  sessionCode?: string;
  isLoggedIn: boolean;
  soloFilters?: Filters;
  tempDeviceId?: string;
  providerConfig?: {
    serverUrl?: string;
    tmdbToken?: string;
  };
}
