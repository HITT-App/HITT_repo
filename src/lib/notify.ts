import { supabase } from "@/integrations/supabase/client";

export async function notifyUser(
  userId: string,
  category: "workout" | "nutrition" | "coaching" | "community" | "social" | "admin",
  title: string,
  body: string,
  url?: string
) {
  try {
    await supabase.functions.invoke("notify-user", {
      body: { user_id: userId, category, title, body, url },
    });
  } catch {
    // Notifications are best-effort — never block the main flow
  }
}
