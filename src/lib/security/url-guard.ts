import { config } from "@/lib/config";

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

const PRIVATE_HOST_SUFFIXES = [
  ".local",
  ".lan",
  ".internal",
  ".localhost",
  ".localdomain",
  ".home",
  ".home.arpa",
];

const isPrivateIpv4 = (host: string): boolean => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
};

const isPrivateIpv6 = (host: string): boolean => {
  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  return false;
};

const isPrivateHostname = (host: string): boolean => {
  if (!host.includes(".")) return true;
  return PRIVATE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

export const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(host)) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":") && isPrivateIpv6(host)) return true;
  return false;
};

const parseAllowlist = (raw?: string): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

export const isAllowedHost = (hostname: string, allowlist?: string[]): boolean => {
  if (!allowlist || allowlist.length === 0) return false;
  const host = hostname.toLowerCase();
  return allowlist.some((allowed) => {
    if (allowed.startsWith("*.") && host.endsWith(allowed.slice(1))) return true;
    return host === allowed;
  });
};

export const getProviderAllowlist = (): string[] => {
  return parseAllowlist(config.security.plexImageAllowedHosts);
};

export const getAllowedPlexImageHosts = (): string[] => {
  return Array.from(new Set([...getConfiguredProviderHosts(), ...getProviderAllowlist()]));
};

export const getConfiguredProviderHosts = (): string[] => {
  const hosts: string[] = [];
  const urls = [config.server.url, config.server.publicUrl].filter(Boolean) as string[];
  for (const raw of urls) {
    try {
      const parsed = new URL(raw.startsWith("http") ? raw : `http://${raw}`);
      hosts.push(parsed.hostname.toLowerCase());
    } catch {
      continue;
    }
  }
  return hosts;
};

export const getDefaultProviderBaseUrl = (): string | undefined => {
  return config.server.url || undefined;
};

export const assertSafeUrl = (
  input: string,
  options?: { allowPrivate?: boolean; allowlist?: string[]; source?: "env" | "user" }
): URL => {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid URL protocol");
  }

  const allowPrivate =
    options?.allowPrivate ?? (options?.source === "env" ? true : config.security.allowPrivateProviderUrls);
  const allowlist = options?.allowlist;

  if (!allowPrivate && (isPrivateHost(parsed.hostname) || isPrivateHostname(parsed.hostname)) && !isAllowedHost(parsed.hostname, allowlist)) {
    throw new Error("Private network URLs are not allowed");
  }

  return parsed;
};
