import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockAnthropic } = vi.hoisted(() => ({
  mockAnthropic: vi.fn(() => "real-model"),
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: mockAnthropic }));

import { MockLanguageModel, getLanguageModel } from "../provider";

describe("MockLanguageModel", () => {
  let model: MockLanguageModel;

  beforeEach(() => {
    model = new MockLanguageModel("test-model");
  });

  it("has correct properties", () => {
    expect(model.specificationVersion).toBe("v3");
    expect(model.provider).toBe("mock");
    expect(model.modelId).toBe("test-model");
    expect(model.supportedUrls).toEqual({});
  });

  it("doGenerate returns content with tool calls for step 0", async () => {
    const result = await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "make a counter" }] }],
    } as any);

    expect(result.content).toBeDefined();
    const toolCalls = result.content.filter((c: any) => c.type === "tool-call");
    expect(toolCalls.length).toBeGreaterThan(0);
    expect(toolCalls[0].toolName).toBe("str_replace_editor");
    expect(result.finishReason.unified).toBe("tool-calls");
    expect(result.usage).toBeDefined();
  });

  it("detects form component type", async () => {
    const result = await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "create a contact form" }] }],
    } as any);

    const toolCalls = result.content.filter((c: any) => c.type === "tool-call");
    const input = JSON.parse(toolCalls[0].input);
    expect(input.path).toBe("/App.jsx");
    expect(input.file_text).toContain("ContactForm");
  });

  it("detects card component type", async () => {
    const result = await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "show me a card" }] }],
    } as any);

    const toolCalls = result.content.filter((c: any) => c.type === "tool-call");
    const input = JSON.parse(toolCalls[0].input);
    expect(input.file_text).toContain("Card");
  });

  it("doStream returns a ReadableStream", async () => {
    const result = await model.doStream({
      prompt: [{ role: "user", content: [{ type: "text", text: "counter" }] }],
    } as any);

    expect(result.stream).toBeInstanceOf(ReadableStream);

    const reader = result.stream.getReader();
    const chunks: any[] = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) chunks.push(value);
    }

    expect(chunks.some((c) => c.type === "text-delta")).toBe(true);
    expect(chunks.some((c) => c.type === "tool-input-start")).toBe(true);
    expect(chunks.some((c) => c.type === "finish")).toBe(true);
  });
});

describe("getLanguageModel", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("returns MockLanguageModel when no API key", () => {
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  it("returns MockLanguageModel when API key is empty", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  it("returns real model when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const model = getLanguageModel();
    expect(mockAnthropic).toHaveBeenCalledWith("claude-haiku-4-5");
    expect(model).toBe("real-model");
  });
});
