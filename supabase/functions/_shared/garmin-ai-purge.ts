import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Removes what AI produced from the user's first unpurged consent onwards. Chats and memory
// can't be split into Garmin and non-Garmin parts, so everything since then goes, and the app
// warns about that first. Plans are the user's choice, and completed workouts always stay.
export async function purgeGarminAiData(
  admin: SupabaseClient,
  userId: string,
  options: { deletePlans: boolean },
): Promise<void> {
  const { data: connection, error: readError } = await admin
    .from("garmin_connections")
    .select("ai_purge_from, ai_memory_snapshot")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  const since = connection?.ai_purge_from;
  if (!since) return;

  const check = (result: { error: { message: string } | null }) => {
    if (result.error) throw new Error(result.error.message);
  };

  const conversations = await admin.from("conversations").select("id").eq("user_id", userId);
  check(conversations);
  const conversationIds = (conversations.data ?? []).map((c: { id: string }) => c.id);
  if (conversationIds.length) {
    check(await admin.from("messages").delete().in("conversation_id", conversationIds).gte("created_at", since));
  }
  check(await admin.from("conversations").delete().eq("user_id", userId).gte("created_at", since));
  // One row per user, overwritten in place, so created_at can't date it. It regenerates daily.
  check(await admin.from("daily_insights").delete().eq("user_id", userId));
  check(await admin.from("activity_recommendations").delete().eq("user_id", userId).gte("created_at", since));
  check(await admin.from("ai_generation_log").delete().eq("user_id", userId).gte("created_at", since));
  check(await admin.from("user_memories").upsert({
    user_id: userId,
    memory: connection.ai_memory_snapshot ?? {},
    updated_at: new Date().toISOString(),
  }));

  if (options.deletePlans) {
    check(await admin
      .from("scheduled_workouts")
      .delete()
      .eq("user_id", userId)
      .eq("workout_source", "ai_generated")
      .gte("created_at", since)
      .neq("status", "completed"));

    const plans = await admin.from("user_workout_plans").select("id").eq("user_id", userId).gte("created_at", since);
    check(plans);
    for (const { id } of (plans.data ?? []) as { id: string }[]) {
      check(await admin.from("user_workout_plan_items").delete().eq("plan_id", id).neq("status", "completed"));
      const remaining = await admin.from("user_workout_plan_items").select("id").eq("plan_id", id).limit(1);
      check(remaining);
      if (!remaining.data?.length) check(await admin.from("user_workout_plans").delete().eq("id", id));
    }
  }

  check(await admin
    .from("garmin_connections")
    .update({ ai_purge_from: null, ai_memory_snapshot: null })
    .eq("user_id", userId));
}
