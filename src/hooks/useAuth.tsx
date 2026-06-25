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
    SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        mode: "online",
      },
    }).catch((e) => {
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
        const result = await SocialLogin.login({
          provider: "google",
          options: { scopes: ["email", "profile"] },
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
      signUp, signIn, signInWithGoogle,
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
