
CREATE TABLE public.chatroom_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chatroom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read chatroom" ON public.chatroom_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send messages" ON public.chatroom_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chatroom_messages;
