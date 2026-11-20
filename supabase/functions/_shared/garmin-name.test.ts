import { describe, expect, it } from "bun:test";
import { hiitName } from "./garmin-name.ts";

describe("hiitName", () => {
  it("puts HIIT in front", () => expect(hiitName("Run", "Workout")).toBe("HIIT Run"));
  it("doesn't double it up", () => expect(hiitName("HIIT Tabata", "Workout")).toBe("HIIT Tabata"));
  it("only skips a whole word", () => expect(hiitName("Hiitness", "Workout")).toBe("HIIT Hiitness"));
  it("falls back when the name is blank", () => expect(hiitName("  ", "Route")).toBe("HIIT Route"));
});
