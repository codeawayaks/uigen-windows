import { describe, it, expect, beforeEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

describe("anon-work-tracker", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("setHasAnonWork", () => {
    it("sets storage when messages > 0", () => {
      setHasAnonWork([{ role: "user", content: "hello" }], { "/": {} });
      expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
    });

    it("sets storage when fileSystemData has > 1 key", () => {
      setHasAnonWork([], { "/": {}, "/App.jsx": {} });
      expect(sessionStorage.getItem("uigen_has_anon_work")).toBe("true");
    });

    it("skips when empty messages and single-key data", () => {
      setHasAnonWork([], { "/": {} });
      expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
    });

    it("serializes data correctly", () => {
      const messages = [{ role: "user", content: "test" }];
      const fsData = { "/": {}, "/App.jsx": { content: "code" } };
      setHasAnonWork(messages, fsData);

      const stored = JSON.parse(
        sessionStorage.getItem("uigen_anon_data") || "{}"
      );
      expect(stored.messages).toEqual(messages);
      expect(stored.fileSystemData).toEqual(fsData);
    });
  });

  describe("getHasAnonWork", () => {
    it("returns false when nothing in storage", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    it("returns true after setHasAnonWork", () => {
      setHasAnonWork([{ role: "user", content: "hi" }], {});
      expect(getHasAnonWork()).toBe(true);
    });

    it("returns false after clearAnonWork", () => {
      setHasAnonWork([{ role: "user", content: "hi" }], {});
      clearAnonWork();
      expect(getHasAnonWork()).toBe(false);
    });
  });

  describe("getAnonWorkData", () => {
    it("returns null when no data", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    it("returns parsed data after set", () => {
      const messages = [{ role: "user", content: "test" }];
      const fsData = { "/App.jsx": { content: "code" } };
      setHasAnonWork(messages, fsData);

      const result = getAnonWorkData();
      expect(result?.messages).toEqual(messages);
      expect(result?.fileSystemData).toEqual(fsData);
    });

    it("returns null on invalid JSON", () => {
      sessionStorage.setItem("uigen_anon_data", "not-json");
      expect(getAnonWorkData()).toBeNull();
    });
  });

  describe("clearAnonWork", () => {
    it("removes both keys from storage", () => {
      setHasAnonWork([{ role: "user", content: "hi" }], { "/a": {} });
      clearAnonWork();
      expect(sessionStorage.getItem("uigen_has_anon_work")).toBeNull();
      expect(sessionStorage.getItem("uigen_anon_data")).toBeNull();
    });
  });
});
