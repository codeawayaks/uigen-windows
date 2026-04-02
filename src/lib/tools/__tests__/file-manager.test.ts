import { describe, it, expect, beforeEach, vi } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";

vi.mock("ai", () => ({
  tool: (config: any) => config,
}));

import { buildFileManagerTool } from "../file-manager";

describe("buildFileManagerTool", () => {
  let fs: VirtualFileSystem;
  let mgr: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fs = new VirtualFileSystem();
    mgr = buildFileManagerTool(fs);
  });

  it("has a description", () => {
    expect(mgr.description).toBeDefined();
  });

  describe("rename", () => {
    it("renames a file successfully", async () => {
      fs.createFileWithParents("/old.txt", "content");
      const result = await mgr.execute({ command: "rename", path: "/old.txt", new_path: "/new.txt" });
      expect(result.success).toBe(true);
      expect(fs.exists("/new.txt")).toBe(true);
      expect(fs.exists("/old.txt")).toBe(false);
    });

    it("returns error when new_path is missing", async () => {
      fs.createFileWithParents("/file.txt", "content");
      const result = await mgr.execute({ command: "rename", path: "/file.txt" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("new_path");
    });

    it("returns failure for non-existent file", async () => {
      const result = await mgr.execute({ command: "rename", path: "/missing.txt", new_path: "/new.txt" });
      expect(result.success).toBe(false);
    });

    it("preserves file content after rename", async () => {
      fs.createFileWithParents("/src.txt", "preserved content");
      await mgr.execute({ command: "rename", path: "/src.txt", new_path: "/dst.txt" });
      expect(fs.readFile("/dst.txt")).toBe("preserved content");
    });
  });

  describe("delete", () => {
    it("deletes a file successfully", async () => {
      fs.createFileWithParents("/target.txt", "data");
      const result = await mgr.execute({ command: "delete", path: "/target.txt" });
      expect(result.success).toBe(true);
      expect(fs.exists("/target.txt")).toBe(false);
    });

    it("returns failure for non-existent file", async () => {
      const result = await mgr.execute({ command: "delete", path: "/ghost.txt" });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid command", () => {
    it("returns error for unknown command", async () => {
      const result = await mgr.execute({ command: "copy" as any, path: "/file.txt" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid command");
    });
  });
});
