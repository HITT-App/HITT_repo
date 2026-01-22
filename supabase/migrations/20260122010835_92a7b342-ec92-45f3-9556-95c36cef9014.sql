-- Fix function search paths for security
ALTER FUNCTION public.create_like_notification() SET search_path = public;
ALTER FUNCTION public.create_follow_notification() SET search_path = public;
ALTER FUNCTION public.create_comment_notification() SET search_path = public;
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = public;

-- Drop the overly permissive INSERT policy and create a proper one
DROP POLICY "System can create notifications" ON public.community_notifications;

-- Notifications can be inserted by triggers (SECURITY DEFINER functions) or the actor themselves
CREATE POLICY "Actors can create notifications"
ON public.community_notifications FOR INSERT
WITH CHECK (auth.uid() = actor_id);