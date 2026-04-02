import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const mockCreateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  createSession: (...args: any[]) => mockCreateSession(...args),
  deleteSession: (...args: any[]) => mockDeleteSession(...args),
  getSession: (...args: any[]) => mockGetSession(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockHash = vi.fn();
const mockCompare = vi.fn();
vi.mock("bcrypt", () => ({
  default: {
    hash: (...args: any[]) => mockHash(...args),
    compare: (...args: any[]) => mockCompare(...args),
  },
}));

import { signUp, signIn, signOut, getUser } from "../index";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const mockPrisma = vi.mocked(prisma);

describe("signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue("hashed_password");
  });

  it("returns error when email is empty", async () => {
    const result = await signUp("", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("returns error when password is empty", async () => {
    const result = await signUp("test@test.com", "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("returns error when password < 8 chars", async () => {
    const result = await signUp("test@test.com", "short");
    expect(result.success).toBe(false);
    expect(result.error).toContain("8 characters");
  });

  it("returns error when user already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" } as any);
    const result = await signUp("taken@test.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already registered");
  });

  it("hashes password and creates user on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user",
      email: "new@test.com",
    } as any);

    const result = await signUp("new@test.com", "password123");

    expect(mockHash).toHaveBeenCalledWith("password123", 10);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: "new@test.com", password: "hashed_password" },
    });
    expect(mockCreateSession).toHaveBeenCalledWith("new-user", "new@test.com");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result.success).toBe(true);
  });

  it("returns generic error on exception", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("db down"));
    const result = await signUp("test@test.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("error occurred");
  });
});

describe("signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when fields are empty", async () => {
    const result = await signIn("", "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("returns error when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await signIn("no@test.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid credentials");
  });

  it("returns error on password mismatch", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed",
    } as any);
    mockCompare.mockResolvedValue(false);

    const result = await signIn("test@test.com", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid credentials");
  });

  it("creates session and returns success on valid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      password: "hashed",
    } as any);
    mockCompare.mockResolvedValue(true);

    const result = await signIn("test@test.com", "password123");

    expect(mockCreateSession).toHaveBeenCalledWith("user-1", "test@test.com");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result.success).toBe(true);
  });

  it("returns generic error on exception", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("db down"));
    const result = await signIn("test@test.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("error occurred");
  });
});

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes session, revalidates, and redirects", async () => {
    await signOut();
    expect(mockDeleteSession).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await getUser()).toBeNull();
  });

  it("returns user data when session exists", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      createdAt: new Date(),
    } as any);

    const user = await getUser();
    expect(user?.id).toBe("user-1");
    expect(user?.email).toBe("test@test.com");
  });

  it("returns null on prisma error", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.user.findUnique.mockRejectedValue(new Error("db error"));
    expect(await getUser()).toBeNull();
  });
});
