import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const GOOGLE_FIT_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";

export function useGoogleFit() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("google-fit-auth", {
        body: { action: "status" },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.data) {
        setIsConnected(res.data.connected);
        setLastSynced(res.data.last_synced_at);
      }
    } catch (e) {
      console.error("Status check failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(async () => {
    // Get the client ID from the edge function's env - we'll use a public endpoint approach
    // The client ID is public (it's in the OAuth redirect URL), so we store it as a VITE var too
    // For now, we use a known approach: redirect to Google OAuth
    const clientId = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID;
    if (!clientId) {
      // Fallback: fetch from a simple status-like call? No - client ID must be on frontend
      console.error("VITE_GOOGLE_FIT_CLIENT_ID not set");
      return;
    }

    const redirectUri = `${window.location.origin}/steps`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_FIT_SCOPE,
      access_type: "offline",
      prompt: "consent",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);

  const handleOAuthCallback = useCallback(
    async (code: string) => {
      if (!user) return false;
      try {
        const { data: session } = await supabase.auth.getSession();
        const redirectUri = `${window.location.origin}/steps`;
        const res = await supabase.functions.invoke("google-fit-auth", {
          body: { action: "exchange", code, redirect_uri: redirectUri },
          headers: { Authorization: `Bearer ${session.session?.access_token}` },
        });
        if (res.data?.success) {
          setIsConnected(true);
          return true;
        }
        console.error("Exchange failed:", res.data);
        return false;
      } catch (e) {
        console.error("OAuth callback failed:", e);
        return false;
      }
    },
    [user]
  );

  const disconnect = useCallback(async () => {
    if (!user) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke("google-fit-auth", {
        body: { action: "disconnect" },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      setIsConnected(false);
      setLastSynced(null);
    } catch (e) {
      console.error("Disconnect failed:", e);
    }
  }, [user]);

  const syncSteps = useCallback(async () => {
    if (!user) return null;
    setIsSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("google-fit-sync", {
        body: {},
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.data?.success) {
        setLastSynced(new Date().toISOString());
        return res.data.steps as number;
      }
      console.error("Sync failed:", res.data);
      return null;
    } catch (e) {
      console.error("Sync error:", e);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return {
    isConnected,
    isLoading,
    isSyncing,
    lastSynced,
    connect,
    disconnect,
    syncSteps,
    handleOAuthCallback,
    checkStatus,
  };
}
