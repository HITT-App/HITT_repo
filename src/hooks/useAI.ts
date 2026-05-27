import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AIMessage,
  Action,
  LogFoodPayload,
  StreamChunk,
  StreamStatus,
  UseAIReturn,
} from './useAI.types';

export type { AIMessage, Action, StreamStatus, UseAIReturn };
export * from './useAI.types';

export function useAI(): UseAIReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [pendingActions, setPendingActions] = useState<Action[]>([]);

  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Mirrors messages state so send() never reads a stale closure
  const messagesRef = useRef<AIMessage[]>([]);
  messagesRef.current = messages;

  // Load or create the canonical Jarvis singleton conversation on mount
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        // Use the oldest Jarvis conversation if duplicates somehow exist
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', 'Jarvis')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        let conversationId: string;

        if (existing) {
          conversationId = existing.id;
        } else {
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: 'Jarvis' })
            .select('id')
            .single();
          if (createError || !newConv) {
            console.error('[useAI] Failed to create Jarvis conversation:', createError);
            return;
          }
          conversationId = newConv.id;
        }

        conversationIdRef.current = conversationId;

        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(40);

        if (msgsError) {
          console.error('[useAI] Failed to load messages:', msgsError);
          return;
        }

        if (msgs) {
          setMessages(
            msgs.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              created_at: m.created_at,
            }))
          );
        }
      } catch (err) {
        console.error('[useAI] Init error:', err);
      }
    };

    init();
  }, [user]);

  // Silent write for log_food actions — no user confirmation needed
  const logFoodSilent = useCallback(async (payload: LogFoodPayload) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { error: insertError } = await supabase.from('meal_logs').insert({
      user_id: userId,
      custom_name: payload.name,
      category: payload.category,
      calories: Math.round(payload.calories),
      protein_grams: payload.protein,
      carbs_grams: payload.carbs,
      fat_grams: payload.fat,
      fiber_grams: payload.fiber,
      logged_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[useAI] logFood insert failed:', insertError);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) {
        setStatus('error');
        setError(new Error('Conversation not loaded yet'));
        return;
      }

      // Cancel any in-flight stream
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setStatus('error');
        setError(new Error('Not authenticated'));
        return;
      }

      // Optimistic user message
      const tempId = crypto.randomUUID();
      const optimisticMsg: AIMessage = {
        id: tempId,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setPendingActions([]);
      setStatus('streaming');
      setStreamingText('');
      setError(null);

      // Persist user message to DB
      const { data: persistedUser, error: persistError } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, role: 'user', content: text })
        .select('id, role, content, created_at')
        .single();

      if (!persistError && persistedUser) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? {
                  id: persistedUser.id,
                  role: 'user' as const,
                  content: persistedUser.content,
                  created_at: persistedUser.created_at,
                }
              : m
          )
        );
      }

      // Build context: current history + new message (last 40 for context window)
      const recentMessages = [
        ...messagesRef.current.map(({ role, content }) => ({ role, content })),
        { role: 'user' as const, content: text },
      ].slice(-40);

      const customMemory = localStorage.getItem('hiit-ai-custom-memory') || '';
      const customResponseStyle = localStorage.getItem('hiit-ai-custom-response') || '';

      abortRef.current = new AbortController();

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              'X-Response-Format': 'structured-v1',
            },
            body: JSON.stringify({
              messages: recentMessages,
              customMemory,
              customResponseStyle,
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errData.error || `AI request failed: ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assembledText = '';
        const emittedActions: Action[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const chunk = JSON.parse(data) as StreamChunk;

              if (chunk.type === 'text') {
                assembledText += chunk.delta;
                setStreamingText(assembledText);
              } else if (chunk.type === 'action') {
                emittedActions.push(chunk.action);
                setPendingActions(prev => [...prev, chunk.action]);
                // log_food is silent — handle immediately without user confirmation
                if (chunk.action.type === 'log_food') {
                  logFoodSilent(chunk.action.payload);
                }
              }
            } catch {
              // Malformed SSE chunk — skip
            }
          }
        }

        // Persist assistant message
        const { data: persistedAssistant } = await supabase
          .from('messages')
          .insert({ conversation_id: conversationId, role: 'assistant', content: assembledText })
          .select('id, created_at')
          .single();

        const assistantMsg: AIMessage = {
          id: persistedAssistant?.id ?? crypto.randomUUID(),
          role: 'assistant',
          content: assembledText,
          created_at: persistedAssistant?.created_at ?? new Date().toISOString(),
          actions: emittedActions.length > 0 ? emittedActions : undefined,
        };

        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setStatus('idle');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('idle');
          return;
        }
        console.error('[useAI] Stream error:', err);
        setStatus('error');
        setError(err as Error);
      } finally {
        abortRef.current = null;
      }
    },
    [logFoodSilent]
  );

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus('idle');
  }, []);

  const dismissAction = useCallback((actionIndex: number) => {
    setPendingActions(prev => prev.filter((_, i) => i !== actionIndex));
  }, []);

  return { messages, status, error, streamingText, pendingActions, send, abort, dismissAction };
}
