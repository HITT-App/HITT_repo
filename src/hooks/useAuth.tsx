import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { log, logSecurityEvent, SecurityEventTypes, generateCorrelationId } from "@/lib/security-logger";
import { identifyUser, resetAnalyticsUser } from "@/lib/analytics";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string;
const GOOGLE_IOS_CLIENT_ID = "669743846703-uvnt80o7etiqai1ggodla7k3eqd1bddv.apps.googleusercontent.com";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialise the native social login plugin once, on mount.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isIOS = Capacitor.getPlatform() === "ios";
    // On Android, @capgo/capacitor-social-login's initialize() checks Apple's
    // native dependencies (JWT decode + CustomTabs) BEFORE registering the
    // Google provider. Those Android libs aren't in our build.gradle, so
    // passing `apple: {}` on Android causes the whole initialize to bail
    // silently — leaving Google unregistered and every Google login attempt
    // failing with "Cannot find provider 'google'". Apple Sign-In is only
    // required on iOS (Apple's App Store rule), so on Android we just skip
    // the Apple provider entirely — the Sign in with Apple button on the
    // Auth screen still renders but tapping it will surface a "not
    // available on this platform" error we can iterate on later.
    const initConfig: Parameters<typeof SocialLogin.initialize>[0] = {
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        mode: "online",
      },
    };
    if (isIOS) {
      // iOS uses the native ASAuthorization flow keyed off the app's bundle
      // ID, so no clientId is needed. Empty redirectUrl keeps it fully
      // native (no browser redirect).
      initConfig.apple = { redirectUrl: "" };
    }
    SocialLogin.initialize(initConfig).catch((e) => {
      console.error("SocialLogin init failed:", e);
    });
  }, []);

  useEffect(() => {
    const correlationId = generateCorrelationId();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          identifyUser(session.user.id, { email: session.user.email });
          logSecurityEvent(SecurityEventTypes.AUTH_SUCCESS, {
            correlationId,
            userId: session.user.id,
            eventType: "sign_in",
          });
          // Comprehensive HealthKit auth prompt — fires now so it's tied to a
          // signed-in session, not at app boot before the user has logged in.
          import("@/plugins/WatchPlugin").then(({ prepareWatchHealthAuth }) => {
            void prepareWatchHealthAuth();
          });
          // Persist the device's IANA timezone to profiles.time_zone so
          // the server-side workout-reminder cron interprets scheduled
          // times in the user's local wall clock (see migration
          // 20260703160000_workout_reminder_push.sql).
          (async () => {
            try {
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              if (!tz) return;
              const { data: existing } = await supabase
                .from("profiles")
                .select("time_zone")
                .eq("user_id", session.user.id)
                .maybeSingle();
              if (existing?.time_zone === tz) return;
              await supabase
                .from("profiles")
                .update({ time_zone: tz })
                .eq("user_id", session.user.id);
            } catch (err) {
              console.warn("[useAuth] time_zone sync skipped:", err);
            }
          })();
        } else if (event === "SIGNED_OUT") {
          resetAnalyticsUser();
          logSecurityEvent(SecurityEventTypes.AUTH_LOGOUT, {
            correlationId,
            eventType: "sign_out",
          });
        } else if (event === "TOKEN_REFRESHED") {
          log("debug", "Session token refreshed", { correlationId });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // On iOS, handle deep links for email confirmation / password reset.
    // Google sign-in is now handled natively by SocialLogin and never comes
    // through appUrlOpen, so this listener is only for email flows.
    let appUrlListener: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('hiitfitness://')) return;
        try {
          if (url.includes('code=')) {
            await supabase.auth.exchangeCodeForSession(url);
          } else if (url.includes('access_token=')) {
            const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
            const params = new URLSearchParams(fragment);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
          }
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            setLoading(false);
          }
        } catch (e) {
          console.error('Deep link auth error:', e);
          setLoading(false);
        }
      }).then(listener => { appUrlListener = listener; });
    }

    return () => {
      subscription.unsubscribe();
      appUrlListener?.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: Capacitor.isNativePlatform()
          ? 'hiitfitness://auth-callback'
          : `${window.location.origin}/`,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const correlationId = generateCorrelationId();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logSecurityEvent(SecurityEventTypes.AUTH_FAILURE, {
        correlationId,
        endpoint: "/auth/sign-in",
        eventType: "password_auth_failure",
      });
    }
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      // Native flow: use the SocialLogin plugin to get a Google ID token,
      // then hand it to Supabase via signInWithIdToken. No browser redirect,
      // no deep links — entirely native.
      try {
        // No `scopes` passed on purpose — `@capgo/capacitor-social-login`'s
        // Android login rejects any scopes list unless MainActivity.java is
        // extended per the plugin's docs. `email` + `profile` are OpenID
        // Connect base scopes that Google returns by default, so omitting
        // them costs nothing on either platform.
        const result = await SocialLogin.login({
          provider: "google",
          options: {},
        });

        // The plugin returns provider-specific data under result.result.
        // For Google we want the idToken.
        const googleResult = result.result as { idToken?: string; accessToken?: { token: string } } | null;
        const idToken = googleResult?.idToken;

        if (!idToken) {
          return { error: new Error("Google sign-in did not return an ID token") };
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

        if (error) return { error: error as Error | null };

        // Push session into React state — onAuthStateChange can be unreliable
        // immediately after a native bridge callback.
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          setLoading(false);
        }
        return { error: null };
      } catch (e: unknown) {
        const msg = (e as Error)?.message ?? String(e);
        if (msg.includes("cancel") || msg.includes("CANCEL")) {
          return { error: new Error("USER_CANCELLED") };
        }
        return { error: new Error(`Google sign-in failed: ${msg}`) };
      }
    }

    // Web flow: standard Supabase OAuth redirect.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error: error as Error | null };
  };

  const signInWithApple = async () => {
    if (Capacitor.isNativePlatform()) {
      // Native flow: the SocialLogin plugin runs Apple's ASAuthorization sheet
      // and returns an identity token (JWT), which we hand to Supabase via
      // signInWithIdToken. Supabase verifies it against Apple's public keys and
      // the app's bundle ID — no client secret, entirely native.
      try {
        const result = await SocialLogin.login({
          provider: "apple",
          options: { scopes: ["email", "name"] },
        });

        const appleResult = result.result as { idToken?: string | null } | null;
        const idToken = appleResult?.idToken;

        if (!idToken) {
          return { error: new Error("Apple sign-in did not return an ID token") };
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: idToken,
        });

        if (error) return { error: error as Error | null };

        // Push session into React state — onAuthStateChange can be unreliable
        // immediately after a native bridge callback.
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          setLoading(false);
        }
        return { error: null };
      } catch (e: unknown) {
        const msg = (e as Error)?.message ?? String(e);
        if (msg.includes("cancel") || msg.includes("CANCEL")) {
          return { error: new Error("USER_CANCELLED") };
        }
        return { error: new Error(`Apple sign-in failed: ${msg}`) };
      }
    }

    // Web flow: standard Supabase OAuth redirect. Requires an Apple Services ID
    // + client secret configured in Supabase — not set up yet (iOS-only for now),
    // so the Apple button is gated to native iOS in the UI.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Best-effort: also sign out of Google natively so the next sign-in
        // shows the account picker rather than silently re-using the cached one.
        try { await SocialLogin.logout({ provider: "google" }); } catch { /* ignore */ }
      }
      await supabase.auth.signOut();
    } catch {
      // Even if signOut fails (e.g. expired session), clear local state
    }

    // Wipe every user-scoped local flag / cache so the next user of the
    // device doesn't inherit tutorial state, body-scan notes, alarm
    // config etc. Device-scoped preferences (e.g. hitt.hk.device.token,
    // chatroom background) stay — they belong to the device, not the
    // user, and the STORAGE-01 audit whitelists them explicitly.
    if (typeof window !== 'undefined') {
      const KEYS = [
        'hiit_assessment_complete',
        'hiit-body-scan-summary',
        'hiit-body-scan-at',
        'hiit-ai-custom-response',
        'hiit-ai-custom-memory',
        'hiit_tutorial_complete',
        'sleepStartTime',
        'alarmEnabled',
        'alarmTime',
        'securityLogs',
        'hiit-plan-onboarding-done',
        'dailyCheckinSkipped',
        'push-banner-dismissed',
        'jarvis_onboarding_suppressed',
        'jarvis_last_greeted',
        // Login-flow flags handled elsewhere but safe to clear too
        'hiit_onboarding_complete',
      ];
      for (const k of KEYS) localStorage.removeItem(k);
      sessionStorage.removeItem('hiit_welcomed');
    }

    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const redirectTo = Capacitor.isNativePlatform()
      ? 'hiitfitness://auth-callback?view=update-password'
      : `${window.location.origin}/auth?view=update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: new Error("No email found") };
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: Capacitor.isNativePlatform()
          ? 'hiitfitness://auth-callback'
          : `${window.location.origin}/`,
      },
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signInWithGoogle, signInWithApple,
      signOut, resetPassword, updatePassword, resendVerificationEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
