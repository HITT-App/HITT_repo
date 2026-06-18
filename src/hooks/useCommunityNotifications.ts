import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CommunityNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'follow' | 'comment' | 'comment_like' | 'mention' | 'friend_request' | 'friend_accept';
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
  actor?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useCommunityNotifications = () => {
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const channelName = useRef(`community-notifs-${Math.random().toString(36).slice(2)}`).current;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: notifData, error } = await supabase
        .from('community_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!notifData || notifData.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Get actor profiles from community_profiles and fallback to profiles
      const actorIds = [...new Set(notifData.map(n => n.actor_id))];
      const [{ data: communityProfiles }, { data: basicProfiles }] = await Promise.all([
        supabase
          .from('community_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', actorIds),
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', actorIds),
      ]);

      const profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
      // First add basic profiles as fallback
      basicProfiles?.forEach(p => profileMap.set(p.user_id, { display_name: p.display_name, username: null, avatar_url: p.avatar_url }));
      // Then override with community profiles (higher priority)
      communityProfiles?.forEach(p => profileMap.set(p.user_id, p));

      const enrichedNotifications: CommunityNotification[] = notifData.map(notif => ({
        ...notif,
        type: notif.type as CommunityNotification['type'],
        metadata: (notif as any).metadata || {},
        actor: profileMap.get(notif.actor_id),
      }));

      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const notif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notif && !notif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  };

  return { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refetch: fetchNotifications 
  };
};
