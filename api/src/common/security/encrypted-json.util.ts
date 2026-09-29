import { webcrypto as crypto } from "crypto";

export type EncryptedTransportPayload = {
  version: "safetybox-json-v1";
  iv: string;
  ciphertext: string;
};

const TOKEN_SALT = "safetybox-json-transport";

const deriveKey = async (token: string) => {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(TOKEN_SALT),
      iterations: 200000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptTransportPayload = async <T>(payload: T, token: string) => {
  const key = await deriveKey(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return {
    version: "safetybox-json-v1" as const,
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(new Uint8Array(ciphertext)).toString("base64"),
  };
};

export const decryptTransportPayload = async <T>(
  payload: EncryptedTransportPayload,
  token: string,
): Promise<T> => {
  const key = await deriveKey(token);
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
};
