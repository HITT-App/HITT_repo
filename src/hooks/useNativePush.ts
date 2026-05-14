import { useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useNativePush() {
  const { user } = useAuth();

  const register = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    const { receive } = await PushNotifications.checkPermissions();

    let status = receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const result = await PushNotifications.requestPermissions();
      status = result.receive;
    }

    if (status !== "granted") return;

    await PushNotifications.register();
  }, [user]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    // Save device token to DB when APNs issues one
    const tokenListener = PushNotifications.addListener("registration", async (token) => {
      await supabase.from("device_push_tokens").upsert(
        { user_id: user.id, token: token.value, platform: "ios", updated_at: new Date().toISOString() },
        { onConflict: "token" }
      );
    });

    // Handle remote push tapped while app is in background/closed
    const actionListener = PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data;
      if (data?.url) window.location.href = data.url;
    });

    // Handle local notification (PB share reminders) tapped
    const localActionListener = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const deepLink = action.notification.extra?.deepLink;
      if (typeof deepLink === 'string') window.location.href = deepLink;
    });

    register();

    return () => {
      tokenListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
      localActionListener.then((l) => l.remove());
    };
  }, [user, register]);
}
