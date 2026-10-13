import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Hash kata sandi dengan scrypt + salt acak. Format: s2$<salt-hex>$<hash-hex>. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `s2$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s2") return false;
  const [, salt, hashHex] = parts;
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
