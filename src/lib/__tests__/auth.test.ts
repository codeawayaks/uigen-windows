import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
vi.mock("jose", () => {
  const builder = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: (...args: any[]) => mockSign(...args),
  };
  return {
    SignJWT: vi.fn(() => builder),
    jwtVerify: vi.fn(),
  };
});

import { createSession, getSession, deleteSession, verifySession } from "../auth";
import { jwtVerify } from "jose";

const mockJwtVerify = vi.mocked(jwtVerify);

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSign.mockResolvedValue("mock-jwt-token");
  });

  describe("createSession", () => {
    it("sets cookie with correct options", async () => {
      await createSession("user-1", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledOnce();
      const [name, token, options] = mockCookieStore.set.mock.calls[0];

      expect(name).toBe("auth-token");
      expect(token).toBe("mock-jwt-token");
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.path).toBe("/");
    });

    it("sets expiry approximately 7 days out", async () => {
      await createSession("user-1", "test@example.com");

      const options = mockCookieStore.set.mock.calls[0][2];
      const expiryMs = options.expires.getTime() - Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiryMs).toBeGreaterThan(sevenDaysMs - 5000);
      expect(expiryMs).toBeLessThanOrEqual(sevenDaysMs);
    });
  });

  describe("getSession", () => {
    it("returns payload with valid token", async () => {
      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      mockJwtVerify.mockResolvedValue({
        payload: { userId: "user-1", email: "test@example.com" },
        protectedHeader: { alg: "HS256" },
      } as any);

      const session = await getSession();
      expect(session?.userId).toBe("user-1");
      expect(session?.email).toBe("test@example.com");
    });

    it("returns null when no cookie", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      expect(await getSession()).toBeNull();
    });

    it("returns null for invalid token", async () => {
      mockCookieStore.get.mockReturnValue({ value: "garbage" });
      mockJwtVerify.mockRejectedValue(new Error("invalid"));
      expect(await getSession()).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("deletes the auth cookie", async () => {
      await deleteSession();
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    it("returns payload from NextRequest cookie", async () => {
      const mockRequest = {
        cookies: { get: vi.fn().mockReturnValue({ value: "req-token" }) },
      } as any;

      mockJwtVerify.mockResolvedValue({
        payload: { userId: "user-2", email: "user2@test.com" },
        protectedHeader: { alg: "HS256" },
      } as any);

      const session = await verifySession(mockRequest);
      expect(session?.userId).toBe("user-2");
      expect(session?.email).toBe("user2@test.com");
    });

    it("returns null when no cookie in request", async () => {
      const mockRequest = {
        cookies: { get: vi.fn().mockReturnValue(undefined) },
      } as any;

      expect(await verifySession(mockRequest)).toBeNull();
    });

    it("returns null for invalid token in request", async () => {
      const mockRequest = {
        cookies: { get: vi.fn().mockReturnValue({ value: "bad" }) },
      } as any;

      mockJwtVerify.mockRejectedValue(new Error("invalid"));
      expect(await verifySession(mockRequest)).toBeNull();
    });
  });
});
