import { describe, it, expect } from "bun:test";
import { capSessions } from "./plan-cap";

describe("capSessions", () => {
  it("keeps the earliest sessions up to the limit", () => {
    expect(capSessions([{ d: 28 }, { d: 0 }, { d: 7 }], 2, s => s.d)).toEqual([{ d: 0 }, { d: 7 }]);
  });

  it("orders ISO dates", () => {
    const dates = ["2026-12-01", "2026-11-06"];
    expect(capSessions(dates, 5, d => d)).toEqual(["2026-11-06", "2026-12-01"]);
  });

  it("keeps same-day sessions in their original order", () => {
    const items = [{ d: 1, n: "a" }, { d: 1, n: "b" }];
    expect(capSessions(items, 2, s => s.d)).toEqual(items);
  });

  it("does not change the input", () => {
    const items = [{ d: 2 }, { d: 1 }];
    capSessions(items, 1, s => s.d);
    expect(items).toEqual([{ d: 2 }, { d: 1 }]);
  });
});
