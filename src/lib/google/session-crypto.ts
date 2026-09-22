import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function sessionKey(): Buffer {
  const secret =
    process.env.GOOGLE_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "ci-dev-insecure-session-secret";
  return createHash("sha256").update(secret).digest();
}

export function sealPayload(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealPayload<T>(token: string): T | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(enc),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
