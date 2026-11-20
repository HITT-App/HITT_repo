import { describe, it, expect } from "bun:test";
import { purgeGarminAiData } from "./garmin-ai-purge";

type Call = { table: string; op: string; filters: string[] };

function fakeAdmin(options: { purgeFrom: string | null; remainingItems?: unknown[]; failOn?: string }) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "", filters: [] };
    const builder: any = {
      select() { if (!call.op) call.op = "select"; return builder; },
      delete() { call.op = "delete"; return builder; },
      update() { call.op = "update"; return builder; },
      upsert() { call.op = "upsert"; return builder; },
      eq(c: string, v: string) { call.filters.push(`${c}=${v}`); return builder; },
      neq(c: string, v: string) { call.filters.push(`${c}!=${v}`); return builder; },
      gte(c: string, v: string) { call.filters.push(`${c}>=${v}`); return builder; },
      in(c: string) { call.filters.push(`${c} in`); return builder; },
      limit() { return builder; },
      maybeSingle() {
        return Promise.resolve({
          data: { ai_purge_from: options.purgeFrom, ai_memory_snapshot: { goal: "before" } },
          error: null,
        });
      },
      then(resolve: (value: unknown) => void) {
        calls.push(call);
        const error = options.failOn === `${call.op}:${table}` ? { message: "boom" } : null;
        let data: unknown = [];
        if (table === "conversations" && call.op === "select") data = [{ id: "c1" }];
        if (table === "user_workout_plans" && call.op === "select") data = [{ id: "p1" }];
        if (table === "user_workout_plan_items" && call.op === "select") data = options.remainingItems ?? [];
        resolve({ data, error });
      },
    };
    return builder;
  };
  return { admin: { from } as any, calls };
}

const has = (calls: Call[], op: string, table: string) => calls.some(c => c.op === op && c.table === table);

describe("purgeGarminAiData", () => {
  it("does nothing when there's no unpurged consent", async () => {
    const { admin, calls } = fakeAdmin({ purgeFrom: null });
    await purgeGarminAiData(admin, "u", { deletePlans: true });
    expect(calls).toEqual([]);
  });

  it("removes AI output since consent, restores memory and keeps plans by default", async () => {
    const { admin, calls } = fakeAdmin({ purgeFrom: "2026-11-05" });
    await purgeGarminAiData(admin, "u", { deletePlans: false });
    for (const table of ["messages", "conversations", "daily_insights", "activity_recommendations", "ai_generation_log"]) {
      expect(has(calls, "delete", table)).toBe(true);
    }
    expect(has(calls, "upsert", "user_memories")).toBe(true);
    expect(has(calls, "delete", "scheduled_workouts")).toBe(false);
    expect(has(calls, "delete", "user_workout_plans")).toBe(false);
    expect(calls.at(-1)).toMatchObject({ table: "garmin_connections", op: "update" });
  });

  it("deletes only uncompleted AI plans when the user chooses", async () => {
    const { admin, calls } = fakeAdmin({ purgeFrom: "2026-11-05" });
    await purgeGarminAiData(admin, "u", { deletePlans: true });
    const scheduled = calls.find(c => c.op === "delete" && c.table === "scheduled_workouts")!;
    expect(scheduled.filters).toEqual(["user_id=u", "workout_source=ai_generated", "created_at>=2026-11-05", "status!=completed"]);
    expect(has(calls, "delete", "user_workout_plans")).toBe(true);
  });

  it("keeps a plan that still has completed items", async () => {
    const { admin, calls } = fakeAdmin({ purgeFrom: "2026-11-05", remainingItems: [{ id: "i1" }] });
    await purgeGarminAiData(admin, "u", { deletePlans: true });
    expect(has(calls, "delete", "user_workout_plan_items")).toBe(true);
    expect(has(calls, "delete", "user_workout_plans")).toBe(false);
  });

  it("keeps the purge marker on failure, so a retry can finish", async () => {
    const { admin, calls } = fakeAdmin({ purgeFrom: "2026-11-05", failOn: "delete:ai_generation_log" });
    expect(purgeGarminAiData(admin, "u", { deletePlans: false })).rejects.toThrow("boom");
    await Bun.sleep(0);
    expect(has(calls, "update", "garmin_connections")).toBe(false);
  });
});
