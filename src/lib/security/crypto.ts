import crypto from "crypto";
import { getAuthSecret } from "@/lib/server/session-secret";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;

const deriveKey = (secret: string): Buffer => {
  return crypto.createHash("sha256").update(secret).digest().subarray(0, KEY_LENGTH);
};

export const getGuestLendingSecret = async (): Promise<string> => {
  return getAuthSecret();
};

export const encryptValue = (value: string, secret: string): string => {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
};

export const decryptValue = (payload: string, secret: string): string => {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    return payload;
  }
  const [, ivRaw, dataRaw, tagRaw] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivRaw, "base64");
  const data = Buffer.from(dataRaw, "base64");
  const tag = Buffer.from(tagRaw, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
};
