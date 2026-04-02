import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: (...args: any[]) => mockGetSession(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn() },
  },
}));

import { getProjects } from "../get-projects";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("getProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  it("scopes query to session userId with correct ordering", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.project.findMany.mockResolvedValue([]);

    await getProjects();

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  });

  it("returns projects array", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    const projects = [
      { id: "p1", name: "First", createdAt: new Date(), updatedAt: new Date() },
      { id: "p2", name: "Second", createdAt: new Date(), updatedAt: new Date() },
    ];
    mockPrisma.project.findMany.mockResolvedValue(projects as any);

    const result = await getProjects();
    expect(result).toEqual(projects);
    expect(result).toHaveLength(2);
  });
});
