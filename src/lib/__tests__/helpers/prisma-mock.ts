import { vi } from "vitest";

export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  project: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};
