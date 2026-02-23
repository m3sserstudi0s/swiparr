export type ProviderTagType = "years" | "genres" | "ratings" | "libraries";

export function tagConfig(key: string): string {
  return `config:${key}`;
}

export function tagUserSettings(userId: string): string {
  return `user_settings:${userId}`;
}

export function tagProvider(provider: string, type: ProviderTagType): string {
  return `${provider}-${type}`;
}

export function tagBlur(itemId?: string): string {
  return itemId ? `blur:${itemId}` : "blur";
}
