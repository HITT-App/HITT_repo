import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    loading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 
        "serviceWorker" in navigator && 
        "PushManager" in window && 
        "Notification" in window;

      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, loading: false }));
        return;
      }

      const permission = Notification.permission;
      
      // Check if user has an active subscription
      let isSubscribed = false;
      if (user) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        isSubscribed = (data?.length || 0) > 0;
      }

      setState({
        isSupported: true,
        isSubscribed,
        permission,
        loading: false,
      });
    };

    checkSupport();
  }, [user]);

  const getVapidPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
      if (error) throw error;
      return data.publicKey;
    } catch (error) {
      console.error("Failed to get VAPID key:", error);
      return null;
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        setState(prev => ({ ...prev, permission, loading: false }));
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error("Failed to get VAPID key");
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save subscription to backend
      const { error } = await supabase.functions.invoke("manage-push-subscription", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: "granted",
        loading: false,
      }));

      toast({
        title: "Notifications enabled",
        description: "You'll now receive push notifications.",
      });

      return true;
    } catch (error) {
      console.error("Subscription error:", error);
      setState(prev => ({ ...prev, loading: false }));
      toast({
        title: "Subscription failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [state.isSupported, user, getVapidPublicKey, toast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from backend
      const { error } = await supabase.functions.invoke("manage-push-subscription", {
        body: {
          action: "unsubscribe",
          subscription: subscription?.toJSON(),
        },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));

      toast({
        title: "Notifications disabled",
        description: "You won't receive push notifications anymore.",
      });

      return true;
    } catch (error) {
      console.error("Unsubscription error:", error);
      setState(prev => ({ ...prev, loading: false }));
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      });
      return false;
    }
  }, [state.isSupported, user, toast]);

  const updateTopics = useCallback(async (topics: string[]): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.functions.invoke("manage-push-subscription", {
        body: {
          action: "update-topics",
          topics,
        },
      });

      if (error) throw error;

      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });

      return true;
    } catch (error) {
      console.error("Topic update error:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    updateTopics,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
