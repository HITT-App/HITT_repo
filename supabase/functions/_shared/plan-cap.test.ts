import { describe, it, expect } from "bun:test";
import { capSessions, sessionDayIndexes } from "./plan-cap";

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

describe("sessionDayIndexes", () => {
  it("spreads sessions evenly and starts today", () => {
    expect(sessionDayIndexes(4, 8)).toEqual([0, 2, 4, 6]);
    expect(sessionDayIndexes(12, 16)).toEqual([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]);
  });

  it("never uses a day twice or runs past the end", () => {
    expect(sessionDayIndexes(10, 4)).toEqual([0, 1, 2, 3]);
  });
});
