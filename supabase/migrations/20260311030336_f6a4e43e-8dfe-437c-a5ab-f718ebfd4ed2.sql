
-- Add is_pinned column to chatroom_messages
ALTER TABLE public.chatroom_messages ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Allow admins to DELETE chatroom messages
CREATE POLICY "Admins can delete chatroom messages"
ON public.chatroom_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE chatroom messages (for pinning)
CREATE POLICY "Admins can update chatroom messages"
ON public.chatroom_messages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
