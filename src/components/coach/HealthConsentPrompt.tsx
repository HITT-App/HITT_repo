import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// First-use consent for sending Apple Health / HealthKit-derived data to the
// third-party AI provider (App Store Guideline 5.1.3). Shown once — the first
// time the user opens the AI coach — as an explicit opt-in. The server-side gate
// stays default-OFF until the user opts in here (or later in Settings), so no
// Apple Health data reaches the AI before they answer.
const askedKey = (uid: string) => `hiit-health-ai-consent-asked-${uid}`;

export function HealthConsentPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    if (localStorage.getItem(askedKey(uid)) === 'true') return;
    // Don't ask again if they've already opted in (e.g. via Settings).
    supabase
      .from('profiles')
      .select('ai_health_consent')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.ai_health_consent === true) {
          localStorage.setItem(askedKey(uid), 'true');
        } else {
          setOpen(true);
        }
      });
  }, [user]);

  const answer = async (consent: boolean) => {
    setOpen(false);
    if (!user) return;
    localStorage.setItem(askedKey(user.id), 'true');
    if (consent) {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_health_consent: true })
        .eq('user_id', user.id);
      if (!error) {
        toast({
          title: 'Coaching personalised',
          description: 'You can turn this off anytime in Settings.',
        });
      }
    }
  };

  if (!open) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Personalise coaching with your health data?</AlertDialogTitle>
          <AlertDialogDescription>
            HIIT can use your activity, heart rate, and sleep — including data from Apple
            Health — to tailor your AI coaching. This is sent to our AI provider (Google) to
            generate your coaching and is never used to train their models or for advertising.
            You can turn it off anytime in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => answer(false)}>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={() => answer(true)}>Yes, use my health data</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
