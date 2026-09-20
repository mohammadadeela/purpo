import crypto from "node:crypto";
import { env } from "./env";

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

function masterKey() {
  const configured = env().ENCRYPTION_MASTER_KEY;
  const decoded = Buffer.from(configured, "base64");
  return decoded.length === 32 ? decoded : crypto.createHash("sha256").update(configured).digest();
}

export function encryptSecret(plaintext: string, context: string) {
  const iv = crypto.randomBytes(12);
  const dataKey = crypto.randomBytes(32);
  const dataCipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
  dataCipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([dataCipher.update(plaintext, "utf8"), dataCipher.final()]);
  const tag = dataCipher.getAuthTag();
  const wrapIv = crypto.randomBytes(12);
  const keyCipher = crypto.createCipheriv("aes-256-gcm", masterKey(), wrapIv);
  keyCipher.setAAD(Buffer.from(context));
  const wrappedKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
  return ["v1", iv, tag, ciphertext, wrapIv, keyCipher.getAuthTag(), wrappedKey].map((item) => typeof item === "string" ? item : item.toString("base64url")).join(".");
}

export function decryptSecret(envelope: string, context: string) {
  const [version, iv, tag, ciphertext, wrapIv, wrapTag, wrappedKey] = envelope.split(".");
  if (version !== "v1" || !wrappedKey) throw new Error("Unsupported encrypted secret envelope");
  const keyDecipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(wrapIv, "base64url"));
  keyDecipher.setAAD(Buffer.from(context));
  keyDecipher.setAuthTag(Buffer.from(wrapTag, "base64url"));
  const dataKey = Buffer.concat([keyDecipher.update(Buffer.from(wrappedKey, "base64url")), keyDecipher.final()]);
  const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string) {
  return value.length < 8 ? "••••••••" : `${value.slice(0, 3)}••••${value.slice(-3)}`;
}
