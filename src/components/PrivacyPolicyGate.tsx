import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { needsPolicyAgreement, PRIVACY_POLICY_VERSION, recordPolicyAcceptance } from "@/lib/privacyPolicy";

export function PrivacyPolicyNotice({ onRead, onAgree, onSignOut, saving, error }: {
  onRead: () => void;
  onAgree: () => void;
  onSignOut: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[200] bg-background flex flex-col overflow-y-auto px-6"
      style={{
        paddingTop: "calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 24px)",
        paddingBottom: "calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 24px)",
      }}
    >
      <div className="flex-1 flex flex-col justify-center text-center gap-4 min-h-[180px]">
        <h1 className="text-2xl font-bold text-foreground">We've updated our Privacy Policy</h1>
        <p className="text-muted-foreground">Please read and agree to continue using HIIT.</p>
        <button type="button" className="text-primary font-medium underline min-h-11" onClick={onRead}>
          Read the Privacy Policy
        </button>
      </div>
      <div className="flex flex-col gap-3 shrink-0">
        {error && <p role="alert" className="text-sm text-destructive text-center">{error}</p>}
        <Button className="w-full h-12 rounded-2xl" disabled={saving} onClick={onAgree}>
          {saving ? "Saving…" : "Agree and continue"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground min-h-11"
          disabled={saving}
          onClick={() => setConfirmingSignOut(true)}
        >
          Not now: sign out
        </button>
      </div>
      <AlertDialog open={confirmingSignOut} onOpenChange={setConfirmingSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of HIIT?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing will be deleted. You'll be asked to agree next time you sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={onSignOut}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PrivacyPolicyGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;
  const queryKey = ["privacy-policy", userId, PRIVACY_POLICY_VERSION];
  // Email sign-ups ticked the agree box, which is carried in their account details.
  const agreedAtSignUp = user?.user_metadata?.accepted_policy_version === PRIVACY_POLICY_VERSION;

  const { data: needsAgreement, isLoading } = useQuery({
    queryKey,
    queryFn: () => needsPolicyAgreement(userId!),
    enabled: !!userId && !agreedAtSignUp,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (agreedAtSignUp && userId) {
      recordPolicyAcceptance(userId, Capacitor.getPlatform()).catch(() => undefined);
    }
  }, [agreedAtSignUp, userId]);

  if (!agreedAtSignUp && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (agreedAtSignUp || !needsAgreement || !userId) return <>{children}</>;

  const agree = async () => {
    setSaving(true);
    setError(null);
    try {
      await recordPolicyAcceptance(userId, Capacitor.getPlatform());
      queryClient.setQueryData(queryKey, false);
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PrivacyPolicyNotice
      onRead={() => navigate("/privacy")}
      onAgree={() => void agree()}
      onSignOut={() => void signOut()}
      saving={saving}
      error={error}
    />
  );
}
