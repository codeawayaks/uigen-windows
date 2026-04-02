import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: (...args: any[]) => mockGetSession(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
  },
}));

import { getProject } from "../get-project";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(getProject("proj-1")).rejects.toThrow("Unauthorized");
  });

  it("throws Project not found when null", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(getProject("missing")).rejects.toThrow("Project not found");
  });

  it("scopes query to session userId", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      name: "Test",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await getProject("proj-1");

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-1", userId: "user-1" },
    });
  });

  it("returns parsed project with JSON fields", async () => {
    const messages = [{ role: "user", content: "hi" }];
    const data = { "/App.jsx": { content: "code" } };

    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      name: "Test",
      messages: JSON.stringify(messages),
      data: JSON.stringify(data),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    } as any);

    const result = await getProject("proj-1");
    expect(result.messages).toEqual(messages);
    expect(result.data).toEqual(data);
    expect(result.id).toBe("proj-1");
  });
});
