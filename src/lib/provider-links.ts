import { ProviderType } from "@/lib/providers/types";

interface ProviderDetailsUrlParams {
  provider: ProviderType | string;
  serverPublicUrl: string;
  machineId?: string | null;
  itemId: string;
}

export function getProviderDetailsUrl({ provider, serverPublicUrl, machineId, itemId }: ProviderDetailsUrlParams): string {
  const base = serverPublicUrl.replace(/\/$/, "");

  if (provider === "plex") {
    const context = 'source:content.library~0~2'
    const key = encodeURIComponent(`/library/metadata/${itemId}`);
    const plexContext = encodeURIComponent(context || "source:content.library~0~2");
    const machineSegment = machineId ? `/server/${machineId}` : "";
    return `${base}/web/index.html#!${machineSegment}/details?key=${key}&context=${plexContext}`;
  }

  return `${base}/web/index.html#/details?id=${itemId}&context=home`;
}
