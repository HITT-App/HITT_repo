/**
 * Task #111 — on returning from an external share, put the user back where they were
 * and offer to post the same activity to the HITT feed.
 *
 * Mounted once, globally, inside the router (it needs useNavigate + useLocation).
 *
 * Deliberately opt-in: nothing reaches the community feed unless the user taps
 * "Post to feed" here. Auto-posting as a side effect of sharing to WhatsApp would be
 * a privacy surprise.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityActions } from '@/hooks/useCommunity';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  clearPendingShare,
  readPendingShare,
  readPendingShareImage,
  type PendingShare,
} from '@/lib/pending-share';

export function ShareToFeedPrompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createPost } = useCommunityActions();
  const { uploadImage } = useImageUpload();

  const [pending, setPending] = useState<PendingShare | null>(null);
  const [posting, setPosting] = useState(false);
  // A restore is a one-shot per record: without this the effect would fight the user
  // if they navigated away from returnRoute while the dialog was still open.
  const restoredRef = useRef(false);

  const check = useCallback(() => {
    if (!user) return;
    const record = readPendingShare();
    if (!record) return;
    setPending(record);

    // Cold return: the WebView was killed and BrowserRouter booted at "/". Put them back.
    // Warm return: already on the right route, so this is a no-op.
    if (!restoredRef.current && location.pathname !== record.returnRoute.split('?')[0]) {
      restoredRef.current = true;
      navigate(record.returnRoute, { replace: true });
    }
  }, [user, navigate, location.pathname]);

  // Boot (covers the cold path — the record outlives the WebView).
  useEffect(() => {
    check();
    // Intentionally once on mount; resume is handled by the listener below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Resume (covers the warm path — no reload happens, so nothing else would fire).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      const onVisible = () => { if (document.visibilityState === 'visible') check(); };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
    const handle = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) check();
    });
    return () => { handle.then(h => h.remove()); };
  }, [check]);

  const dismiss = async () => {
    setPending(null);
    restoredRef.current = false;
    await clearPendingShare();
  };

  const handlePost = async () => {
    if (!pending) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;

      if (pending.hasImage) {
        const blob = await readPendingShareImage();
        if (blob) {
          const file = new File([blob], `hiit-share-${pending.createdAt}.png`, { type: 'image/png' });
          // A failed upload must not lose the post — fall through to text-only.
          imageUrl = (await uploadImage(file)) ?? undefined;
        }
      }

      const created = await createPost({
        content: pending.shareText,
        post_type: 'workout',
        category: 'general',
        tags: pending.activityType ? [pending.activityType] : [],
        image_url: imageUrl,
      });

      // createPost surfaces its own error toast; keep the dialog open so the
      // user can retry rather than silently dropping what they asked for.
      if (created) await dismiss();
    } finally {
      setPosting(false);
    }
  };

  if (!pending || !user) return null;

  return (
    <Dialog open onOpenChange={open => { if (!open && !posting) void dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Also post to the HITT feed?</DialogTitle>
          <DialogDescription>
            Share “{pending.activityTitle}” with the community as well.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss} disabled={posting} className="flex-1">
            No thanks
          </Button>
          <Button onClick={handlePost} disabled={posting} className="flex-1 gap-2">
            {posting && <Loader2 className="w-4 h-4 animate-spin" />}
            Post to feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
