import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: (...args: any[]) => mockGetSession(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { create: vi.fn() },
  },
}));

import { createProject } from "../create-project";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws Unauthorized when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unauthorized");
  });

  it("creates project with correct data", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    const mockProject = { id: "proj-1", name: "Test" };
    mockPrisma.project.create.mockResolvedValue(mockProject as any);

    const messages = [{ role: "user", content: "hi" }];
    const data = { "/App.jsx": { content: "code" } };

    await createProject({ name: "Test", messages, data });

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Test",
        userId: "user-1",
        messages: JSON.stringify(messages),
        data: JSON.stringify(data),
      },
    });
  });

  it("returns the created project", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });
    const mockProject = { id: "proj-1", name: "Test" };
    mockPrisma.project.create.mockResolvedValue(mockProject as any);

    const result = await createProject({ name: "Test", messages: [], data: {} });
    expect(result).toEqual(mockProject);
  });
});
