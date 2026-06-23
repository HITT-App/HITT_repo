import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  last_message?: DirectMessage;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: convData, error } = await supabase
        .from('community_conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      if (!convData || convData.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = convData.map(c => c.id);
      
      // Get other user profiles
      const otherUserIds = convData.map(c => 
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      );

      // Batch queries to avoid N+1 problem
      const [profilesResult, allMessagesResult] = await Promise.all([
        supabase
          .from('community_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', otherUserIds),
        supabase
          .from('community_messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      ]);

      const profiles = profilesResult.data;
      const allMessages = allMessagesResult.data || [];
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Group messages by conversation for efficient lookup
      const messagesByConv = new Map<string, typeof allMessages>();
      allMessages.forEach(msg => {
        const convMsgs = messagesByConv.get(msg.conversation_id) || [];
        convMsgs.push(msg);
        messagesByConv.set(msg.conversation_id, convMsgs);
      });

      const enrichedConversations = convData.map((conv) => {
        const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        const convMessages = messagesByConv.get(conv.id) || [];
        
        // Get last message (already sorted by created_at desc)
        const lastMsg = convMessages[0];
        
        // Count unread messages from the other user
        const unreadCount = convMessages.filter(
          msg => !msg.is_read && msg.sender_id !== user.id
        ).length;

        return {
          ...conv,
          other_user: profileMap.get(otherUserId),
          last_message: lastMsg || undefined,
          unread_count: unreadCount,
        };
      });

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    const channel = supabase
      .channel(`conversations-updates-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_conversations' },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, user]);

  return { conversations, loading, refetch: fetchConversations };
};

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('community_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as DirectMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, conversationId]);

  return { messages, loading, refetch: fetchMessages };
};

export const useDirectMessageActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getOrCreateConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('community_conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from('community_conversations')
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      return null;
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('community_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return null;
    }
  };

  return { getOrCreateConversation, sendMessage };
};
