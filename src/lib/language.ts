import ISO6391 from "iso-639-1";
import { iso6393To1 } from "iso-639-3";

const displayNames = (() => {
  if (typeof Intl === "undefined" || !("DisplayNames" in Intl)) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" });
  } catch {
    return null;
  }
})();

const getDisplayName = (tag: string): string | null => {
  if (!displayNames) return null;
  try {
    const name = displayNames.of(tag);
    if (!name) return null;
    if (name.toLowerCase() === tag.toLowerCase()) return null;
    return name;
  } catch {
    return null;
  }
};

const getNameFromIso6391 = (code: string): string | null => {
  const name = ISO6391.getName(code);
  return name || null;
};

const getNameFromIso6393 = (code: string): string | null => {
  const iso6391 = iso6393To1[code as keyof typeof iso6393To1];
  if (!iso6391) return null;
  return getNameFromIso6391(iso6391);
};

const lookupLanguageName = (rawTag: string): string | null => {
  const normalized = rawTag.replace(/_/g, "-").toLowerCase();
  const direct = getDisplayName(normalized);
  if (direct) return direct;

  const primary = normalized.split("-")[0];
  if (primary.length === 2) {
    return getNameFromIso6391(primary) || getDisplayName(primary);
  }

  if (primary.length === 3) {
    return getNameFromIso6393(primary) || getDisplayName(primary);
  }

  return null;
};

export const getLanguageLabel = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const looksLikeCode = /^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8})*$/.test(trimmed);
  if (!looksLikeCode) return trimmed;

  return lookupLanguageName(trimmed) || trimmed;
};
