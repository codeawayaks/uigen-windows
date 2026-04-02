import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("passes through a single class", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple class strings", () => {
    expect(cn("p-4", "m-2", "text-sm")).toBe("p-4 m-2 text-sm");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles conditional object syntax", () => {
    expect(cn({ "bg-red-500": true, "bg-blue-500": false })).toBe(
      "bg-red-500"
    );
  });

  it("handles array inputs", () => {
    expect(cn(["p-4", "m-2"])).toBe("p-4 m-2");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("p-4", undefined, null, "m-2")).toBe("p-4 m-2");
  });

  it("handles mixed types", () => {
    expect(
      cn("p-4", ["m-2"], { "text-sm": true, "text-lg": false }, undefined)
    ).toBe("p-4 m-2 text-sm");
  });
});
