import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CHAT_RETENTION_HOURS } from '@/lib/constants';

export type { ActivityLevel } from './useHealthProfile';

interface RichContent {
  type: 'goal_progress' | 'hydration' | 'heart_rate' | 'workout' | 'recipe' | 
        'nutrition' | 'activity_suggestion' | 'hiit_score' | 'blood_pressure' | 
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
  if (lowerContent.includes('hiit') || lowerContent.includes('score') || lowerContent.includes('fitness score')) {
    return { type: 'hiit_score' };
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

export function useAIChat(conversationId: string | null, healthProfile?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async (convId: string) => {
    const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .gte('created_at', cutoff)
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

  // Convert blob URL to base64 data URL
  const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendMessage = useCallback(async (content: string, convId: string, imageUrl?: string) => {
    if (!user || (!content.trim() && !imageUrl)) return;

    const userMessage: Message = { 
      role: 'user', 
      content: content.trim() || (imageUrl ? "What exercises can I do with this equipment?" : ""),
      imageUrl
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: userMessage.content,
    });

    // Fire-and-forget cleanup of stale messages for this conversation.
    const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    supabase
      .from('messages')
      .delete()
      .eq('conversation_id', convId)
      .lt('created_at', cutoff)
      .then(({ error }) => {
        if (error) console.error('Chat history cleanup failed:', error);
      });

    let assistantContent = '';
    let imageBase64: string | undefined;

    try {
      // Convert blob URL to base64 if we have an image
      if (imageUrl) {
        try {
          imageBase64 = await blobUrlToBase64(imageUrl);
        } catch (err) {
          console.error('Failed to convert image:', err);
        }
      }

      // Prepare messages for API, including image data for multimodal
      const apiMessages = [...messages, userMessage].map(m => {
        // For the current message with image, include base64 data
        if (m === userMessage && imageBase64) {
          return { 
            role: m.role, 
            content: m.content || "What exercises can I do with this equipment?",
            imageData: imageBase64
          };
        }
        return { role: m.role, content: m.content };
      });

      // Get the current user's session token for authenticated requests
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('You must be logged in to use the AI coach');
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          hasImage: !!imageUrl,
          imageData: imageBase64,
          customResponse: localStorage.getItem('hiit-ai-custom-response') ?? '',
          customMemory: localStorage.getItem('hiit-ai-custom-memory') ?? '',
          healthProfile: healthProfile ?? '',
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
