import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockVerifySession = vi.fn();
vi.mock("@/lib/auth", () => ({
  verifySession: (...args: any[]) => mockVerifySession(...args),
}));

import { middleware, config } from "../middleware";

function createMockRequest(pathname: string) {
  return {
    nextUrl: { pathname },
    cookies: { get: vi.fn() },
  } as any;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for /api/projects when unauthenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const response = await middleware(createMockRequest("/api/projects"));
    expect(response.status).toBe(401);
  });

  it("returns 401 for /api/filesystem when unauthenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const response = await middleware(createMockRequest("/api/filesystem"));
    expect(response.status).toBe(401);
  });

  it("returns 401 for /api/projects/123 (startsWith match)", async () => {
    mockVerifySession.mockResolvedValue(null);
    const response = await middleware(createMockRequest("/api/projects/123"));
    expect(response.status).toBe(401);
  });

  it("allows authenticated access to /api/projects", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user-1" });
    const response = await middleware(createMockRequest("/api/projects"));
    expect(response.status).toBe(200);
  });

  it("allows authenticated access to /api/filesystem", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user-1" });
    const response = await middleware(createMockRequest("/api/filesystem"));
    expect(response.status).toBe(200);
  });

  it("allows unauthenticated access to non-protected paths", async () => {
    mockVerifySession.mockResolvedValue(null);
    const response = await middleware(createMockRequest("/api/chat"));
    expect(response.status).toBe(200);
  });

  it("allows unauthenticated access to root", async () => {
    mockVerifySession.mockResolvedValue(null);
    const response = await middleware(createMockRequest("/"));
    expect(response.status).toBe(200);
  });

  it("exports config with matcher", () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
