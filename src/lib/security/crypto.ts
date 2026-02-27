import crypto from "crypto";
import { getAuthSecret } from "@/lib/server/session-secret";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
// Scrypt parameters – conservative but fast enough for a server-side KDF
// (N=2^15 ≈ 32768, r=8, p=1 gives ~100ms on modest hardware; fine for key derivation, not login)
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
// Fixed salt: the secret itself provides uniqueness; this salt binds the key to its purpose
const SCRYPT_SALT = Buffer.from("swiparr-guest-lending-v2");

const deriveKey = (secret: string): Buffer => {
  return crypto.scryptSync(secret, SCRYPT_SALT, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
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
  return `v2:${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
};

export const decryptValue = (payload: string, secret: string): string => {
  const parts = payload.split(":");
  if (parts.length !== 4) {
    return payload;
  }

  const version = parts[0];

  if (version === "v1") {
    // v1 tokens used a raw SHA-256 derived key.
    // These should have been wiped by the startup migration; refuse to decrypt them.
    throw new Error(
      "Encrypted value uses deprecated v1 format. " +
        "Guest-lending tokens have been invalidated by the security upgrade. " +
        "Please disable and re-enable guest lending to re-encrypt."
    );
  }

  if (version !== "v2") {
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
