import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CHAT_RETENTION_HOURS } from '@/lib/constants';
import type {
  AIMessage,
  Action,
  LogFoodPayload,
  RecommendWorkoutPayload,
  RecommendWorkoutPlanPayload,
  StreamChunk,
  StreamStatus,
  UseAIReturn,
} from './useAI.types';

// ─── Action payload validators ────────────────────────────────────────────────
// Server-side already validates, but we guard again here so a malformed payload
// never makes it into pendingActions and then crashes a card render.

function validateRecommendWorkout(payload: unknown): payload is RecommendWorkoutPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  if (p.source === 'catalogue') {
    return typeof p.id === 'string' && typeof p.name === 'string'
  }
  if (p.source === 'ai_generated') {
    return (
      typeof p.title === 'string' &&
      typeof p.description === 'string' &&
      Array.isArray(p.exercises_snapshot) &&
      (p.exercises_snapshot as unknown[]).length > 0 &&
      typeof p.estimated_duration_minutes === 'number'
    )
  }
  return false
}

function validateRecommendWorkoutPlan(payload: unknown): payload is RecommendWorkoutPlanPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return (
    typeof p.title === 'string' &&
    Array.isArray(p.workouts) &&
    (p.workouts as unknown[]).length > 0 &&
    (p.workouts as Record<string, unknown>[]).every(
      w => typeof w.title === 'string' && typeof w.scheduled_date === 'string' && Array.isArray(w.exercises)
    )
  )
}

function validateAction(action: unknown): action is Action {
  if (!action || typeof action !== 'object') return false
  const a = action as Record<string, unknown>
  switch (a.type) {
    case 'schedule_plan':
    case 'log_food':
    case 'recommend_recipe':
    case 'body_scan_prompt':
      return true // server-validated; trust
    case 'recommend_workout':
      return validateRecommendWorkout(a.payload)
    case 'recommend_workout_plan':
      return validateRecommendWorkoutPlan(a.payload)
    default:
      return false
  }
}

export type { AIMessage, Action, StreamStatus, UseAIReturn };
export * from './useAI.types';

// Returns a human-readable summary of log_food actions for storage as the
// non-synthetic assistant message, giving the AI a fulfilled-state signal on reload.
function logFoodSummary(actions: Action[]): string {
  const logs = actions.filter((a): a is { type: 'log_food'; payload: LogFoodPayload } => a.type === 'log_food')
  if (logs.length === 0) return ''
  return logs.map(a => `Food logged: ${a.payload.name} (${a.payload.calories} kcal), ${a.payload.category}`).join('. ')
}

export function useAI(): UseAIReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AIMessage[]>([]);
  messagesRef.current = messages;

  // Load or create the canonical Jarvis singleton conversation on mount
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
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

        const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('id, role, content, created_at, synthetic')
          .eq('conversation_id', conversationId)
          .gte('created_at', cutoff)
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
              synthetic: (m as any).synthetic ?? false,
            }))
          );
        }
      } catch (err) {
        console.error('[useAI] Init error:', err);
      } finally {
        setIsInitialized(true);
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

  // Shared SSE stream executor. Reads chunks, updates streamingText + pendingActions.
  // Returns assembled text and collected actions when the stream ends.
  const runStream = useCallback(
    async (
      messages: Array<{ role: string; content: string }>,
      accessToken: string,
      signal: AbortSignal,
    ): Promise<{ text: string; actions: Action[] }> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Response-Format': 'structured-v1',
          },
          body: JSON.stringify({
            messages,
            customMemory: localStorage.getItem('hiit-ai-custom-memory') || '',
            customResponseStyle: localStorage.getItem('hiit-ai-custom-response') || '',
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `AI request failed: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      const actions: Action[] = [];

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
              text += chunk.delta;
              setStreamingText(text);
            } else if (chunk.type === 'action') {
              if (!validateAction(chunk.action)) {
                console.warn('[useAI] Dropping invalid action:', chunk.action);
                continue;
              }
              actions.push(chunk.action);
              setPendingActions(prev => [...prev, chunk.action]);
              if (chunk.action.type === 'log_food') {
                logFoodSilent(chunk.action.payload);
              }
            }
          } catch {
            // Malformed SSE chunk — skip
          }
        }
      }

      return { text, actions };
    },
    [logFoodSilent]
  );

  const send = useCallback(
    async (text: string) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) {
        setStatus('error');
        setError(new Error('Conversation not loaded yet'));
        return;
      }

      if (abortRef.current) abortRef.current.abort();

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setStatus('error');
        setError(new Error('Not authenticated'));
        return;
      }

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

      // Fire-and-forget cleanup of stale messages for this conversation.
      const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
      supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .lt('created_at', cutoff)
        .then(({ error }) => {
          if (error) console.error('Chat history cleanup failed:', error);
        });

      const recentMessages = [
        ...messagesRef.current
          .filter(m => !m.synthetic && (m.created_at ?? '') >= cutoff)
          .map(({ role, content }) => ({ role, content })),
        { role: 'user' as const, content: text },
      ].slice(-40);

      abortRef.current = new AbortController();

      try {
        const { text: assembledText, actions: emittedActions } = await runStream(
          recentMessages,
          session.access_token,
          abortRef.current.signal,
        );

        const effectiveContent = assembledText.trim() || logFoodSummary(emittedActions);
        // Log-summary messages (no AI text, only food logged silently) are stored as
        // synthetic so they're excluded from AI context but remain visible in the chat UI.
        const isLogSummary = !assembledText.trim() && emittedActions.some(a => a.type === 'log_food');

        let persistedAssistant: { id: string; created_at: string } | null = null;
        if (effectiveContent) {
          const { data } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, role: 'assistant', content: effectiveContent, synthetic: isLogSummary })
            .select('id, created_at')
            .single();
          persistedAssistant = data;
        }

        if (effectiveContent) {
          const assistantMsg: AIMessage = {
            id: persistedAssistant?.id ?? crypto.randomUUID(),
            role: 'assistant',
            content: effectiveContent,
            created_at: persistedAssistant?.created_at ?? new Date().toISOString(),
            synthetic: isLogSummary,
            actions: emittedActions.length > 0 ? emittedActions : undefined,
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
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
    [runStream]
  );

  // Like send(), but the prompt is not persisted or shown as a user message.
  // Used for system-driven triggers (greeting, goals flow) where the prompt is internal.
  const greet = useCallback(
    async (prompt: string) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) return;

      if (abortRef.current) abortRef.current.abort();

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;

      setPendingActions([]);
      setStatus('streaming');
      setStreamingText('');
      setError(null);

      const greetCutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
      const recentMessages = [
        ...messagesRef.current
          .filter(m => !m.synthetic && (m.created_at ?? '') >= greetCutoff)
          .map(({ role, content }) => ({ role, content })),
        { role: 'user' as const, content: prompt },
      ].slice(-40);

      abortRef.current = new AbortController();

      try {
        const { text: assembledText, actions: emittedActions } = await runStream(
          recentMessages,
          session.access_token,
          abortRef.current.signal,
        );

        const effectiveContent = assembledText.trim() || logFoodSummary(emittedActions);
        const isLogSummary = !assembledText.trim() && emittedActions.some(a => a.type === 'log_food');

        let persistedAssistant: { id: string; created_at: string } | null = null;
        if (effectiveContent) {
          const { data } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, role: 'assistant', content: effectiveContent, synthetic: isLogSummary })
            .select('id, created_at')
            .single();
          persistedAssistant = data;
        }

        // Fire-and-forget cleanup
        supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId)
          .lt('created_at', greetCutoff)
          .then(({ error }) => {
            if (error) console.error('Chat history cleanup failed:', error);
          });

        if (effectiveContent) {
          const assistantMsg: AIMessage = {
            id: persistedAssistant?.id ?? crypto.randomUUID(),
            role: 'assistant',
            content: effectiveContent,
            created_at: persistedAssistant?.created_at ?? new Date().toISOString(),
            synthetic: isLogSummary,
            actions: emittedActions.length > 0 ? emittedActions : undefined,
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
        setStreamingText('');
        setStatus('idle');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('idle');
          return;
        }
        console.error('[useAI] Greet error:', err);
        setStatus('error');
        setError(err as Error);
      } finally {
        abortRef.current = null;
      }
    },
    [runStream]
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

  // Persists a synthetic assistant message to DB + state.
  // Visible in chat history across sessions, but excluded from AI context window.
  const appendAssistantMessage = useCallback(async (text: string) => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;

    const { data: persisted } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: text, synthetic: true })
      .select('id, created_at')
      .single();

    // Fire-and-forget cleanup
    const appendCutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .lt('created_at', appendCutoff)
      .then(({ error }) => {
        if (error) console.error('Chat history cleanup failed:', error);
      });

    const msg: AIMessage = {
      id: persisted?.id ?? crypto.randomUUID(),
      role: 'assistant',
      content: text,
      created_at: persisted?.created_at ?? new Date().toISOString(),
      synthetic: true,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  return {
    messages,
    status,
    error,
    streamingText,
    pendingActions,
    isInitialized,
    send,
    greet,
    abort,
    dismissAction,
    appendAssistantMessage,
  };
}
