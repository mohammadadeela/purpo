import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.SESSION_SECRET = "test-session-secret-with-more-than-32-characters";
  process.env.ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.S3_ENDPOINT = "http://localhost:9000";
  process.env.S3_BUCKET = "test";
  process.env.S3_ACCESS_KEY = "test";
  process.env.S3_SECRET_KEY = "test";
  process.env.S3_PUBLIC_URL = "http://localhost:9000/test";
});

describe("secret envelopes", () => {
  it("round-trips only with the matching context", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/security");
    const encrypted = encryptSecret("provider-secret", "integration:one");
    expect(encrypted).not.toContain("provider-secret");
    expect(decryptSecret(encrypted, "integration:one")).toBe("provider-secret");
    expect(() => decryptSecret(encrypted, "integration:two")).toThrow();
  });
});
