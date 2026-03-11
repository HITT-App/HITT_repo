
ALTER TABLE public.chatroom_messages
  ADD COLUMN message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN media_url text,
  ADD COLUMN reply_to_id uuid REFERENCES public.chatroom_messages(id);
