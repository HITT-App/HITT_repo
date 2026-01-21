import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RichContent {
  type: 'goal_progress' | 'hydration' | 'heart_rate' | 'workout' | 'recipe' | 
        'nutrition' | 'activity_suggestion' | 'sandow_score' | 'blood_pressure' | 
        'steps' | 'sleep' | 'weight' | 'workout_list' | 'select_options' | 'image_analysis';
  data?: any;
}

export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  richContent?: RichContent;
  imageUrl?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

// Keywords to detect what rich content to show
const detectRichContent = (content: string): RichContent | undefined => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('goal') && (lowerContent.includes('progress') || lowerContent.includes('hit'))) {
    return { type: 'goal_progress' };
  }
  if (lowerContent.includes('hydration') || lowerContent.includes('water') || lowerContent.includes('drink')) {
    return { type: 'hydration' };
  }
  if (lowerContent.includes('heart rate') || lowerContent.includes('bpm') || lowerContent.includes('heartrate')) {
    return { type: 'heart_rate' };
  }
  if (lowerContent.includes('workout') && lowerContent.includes('recommend')) {
    return { type: 'workout' };
  }
  if (lowerContent.includes('recipe') || lowerContent.includes('meal') || lowerContent.includes('food')) {
    return { type: 'recipe' };
  }
  if (lowerContent.includes('nutrition') || lowerContent.includes('eat')) {
    return { type: 'nutrition' };
  }
  if (lowerContent.includes('activity') && lowerContent.includes('suggest')) {
    return { type: 'activity_suggestion' };
  }
  if (lowerContent.includes('sandow') || lowerContent.includes('score') || lowerContent.includes('fitness score')) {
    return { type: 'sandow_score' };
  }
  if (lowerContent.includes('blood pressure') || lowerContent.includes('bp')) {
    return { type: 'blood_pressure' };
  }
  if (lowerContent.includes('step') && !lowerContent.includes('next step')) {
    return { type: 'steps' };
  }
  if (lowerContent.includes('sleep')) {
    return { type: 'sleep' };
  }
  if (lowerContent.includes('weight') || lowerContent.includes('bmi')) {
    return { type: 'weight' };
  }
  if (lowerContent.includes('workout') && lowerContent.includes('list')) {
    return { type: 'workout_list' };
  }
  if (lowerContent.includes('muscle') || lowerContent.includes('learn more')) {
    return { type: 'select_options' };
  }
  
  return undefined;
};

export function useAIChat(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      return;
    }

    setMessages(data.map(m => ({ 
      id: m.id, 
      role: m.role as 'user' | 'assistant', 
      content: m.content,
      richContent: detectRichContent(m.content)
    })));
  }, []);

  const sendMessage = useCallback(async (content: string, convId: string, imageUrl?: string) => {
    if (!user || (!content.trim() && !imageUrl)) return;

    const userMessage: Message = { 
      role: 'user', 
      content: content.trim(),
      imageUrl
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: content.trim(),
    });

    let assistantContent = '';

    try {
      // Prepare messages for API, including image context if present
      const apiMessages = [...messages, userMessage].map(m => {
        if (m.imageUrl) {
          return { 
            role: m.role, 
            content: `[User uploaded an image] ${m.content}` 
          };
        }
        return { role: m.role, content: m.content };
      });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          hasImage: !!imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message to update progressively
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              const richContent = detectRichContent(assistantContent);
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant') {
                  updated[lastIdx] = { 
                    ...updated[lastIdx], 
                    content: assistantContent,
                    richContent
                  };
                }
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, put back and wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (assistantContent) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: assistantContent,
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  }, [user, messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMessages,
    setMessages,
  };
}
