import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { log, logSecurityEvent, SecurityEventTypes, generateCorrelationId } from "@/lib/security-logger";
import { identifyUser, resetAnalyticsUser } from "@/lib/analytics";

const getOAuthRedirectUrl = () =>
  Capacitor.isNativePlatform()
    ? 'hiitfitness://auth-callback'
    : `${window.location.origin}/`;

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

  useEffect(() => {
    const correlationId = generateCorrelationId();
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log security events for auth state changes
        if (event === "SIGNED_IN" && session?.user) {
          identifyUser(session.user.id, { email: session.user.email });
          logSecurityEvent(SecurityEventTypes.AUTH_SUCCESS, {
            correlationId,
            userId: session.user.id,
            eventType: "sign_in",
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

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const correlationId = generateCorrelationId();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logSecurityEvent(SecurityEventTypes.AUTH_FAILURE, {
        correlationId,
        endpoint: "/auth/sign-in",
        eventType: "password_auth_failure",
        // Never log the actual email, just note that there was a failure
      });
    }
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if signOut fails (e.g. expired session), clear local state
    }
    // Force clear user state so UI redirects to auth
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?view=update-password`,
    });
    
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error: error as Error | null };
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      return { error: new Error("No email found") };
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendVerificationEmail,
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
