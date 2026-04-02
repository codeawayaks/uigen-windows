import { describe, it, expect, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildStrReplaceTool } from "../str-replace";

describe("buildStrReplaceTool", () => {
  let fs: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fs = new VirtualFileSystem();
    tool = buildStrReplaceTool(fs);
  });

  it("returns tool with inputSchema", () => {
    expect(tool.inputSchema).toBeDefined();
  });

  describe("view", () => {
    it("returns file contents", async () => {
      fs.createFileWithParents("/test.txt", "line1\nline2\nline3");
      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
      });
      expect(result).toContain("line1");
      expect(result).toContain("line2");
    });

    it("returns subset with view_range", async () => {
      fs.createFileWithParents("/test.txt", "line1\nline2\nline3\nline4");
      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
        view_range: [2, 3],
      });
      expect(result).toContain("line2");
      expect(result).toContain("line3");
      expect(result).not.toContain("line4");
    });

    it("returns error for non-existent file", async () => {
      const result = await tool.execute({
        command: "view",
        path: "/missing.txt",
      });
      expect(result).toContain("not found");
    });
  });

  describe("create", () => {
    it("creates a file", async () => {
      await tool.execute({
        command: "create",
        path: "/new.txt",
        file_text: "hello world",
      });
      expect(fs.readFile("/new.txt")).toBe("hello world");
    });

    it("creates file with empty content", async () => {
      await tool.execute({ command: "create", path: "/empty.txt" });
      expect(fs.exists("/empty.txt")).toBe(true);
      expect(fs.readFile("/empty.txt")).toBe("");
    });
  });

  describe("str_replace", () => {
    it("replaces text in file", async () => {
      fs.createFileWithParents("/test.txt", "hello world");
      await tool.execute({
        command: "str_replace",
        path: "/test.txt",
        old_str: "world",
        new_str: "vitest",
      });
      expect(fs.readFile("/test.txt")).toBe("hello vitest");
    });
  });

  describe("insert", () => {
    it("inserts text at specified line", async () => {
      fs.createFileWithParents("/test.txt", "line1\nline3");
      await tool.execute({
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
        new_str: "line2",
      });
      const content = fs.readFile("/test.txt");
      expect(content).toContain("line2");
    });

    it("inserts at line 0 by default", async () => {
      fs.createFileWithParents("/test.txt", "existing");
      await tool.execute({
        command: "insert",
        path: "/test.txt",
        new_str: "prepended",
      });
      const content = fs.readFile("/test.txt");
      expect(content).toContain("prepended");
    });
  });

  describe("undo_edit", () => {
    it("returns unsupported error", async () => {
      const result = await tool.execute({
        command: "undo_edit",
        path: "/test.txt",
      });
      expect(result).toContain("not supported");
    });
  });
});
