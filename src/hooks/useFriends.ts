import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export interface FriendRecord {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

export const useFriends = (targetUserId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendRecord, setFriendRecord] = useState<FriendRecord | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    const { data } = await supabase
      .from('user_friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
      .limit(1);

    if (data && data.length > 0) {
      const record = data[0];
      setFriendRecord(record);
      if (record.status === 'accepted') {
        setFriendStatus('accepted');
      } else if (record.user_id === user.id) {
        setFriendStatus('pending_sent');
      } else {
        setFriendStatus('pending_received');
      }
    } else {
      setFriendStatus('none');
      setFriendRecord(null);
    }
  }, [user?.id, targetUserId]);

  const fetchFriendCount = useCallback(async () => {
    if (!targetUserId) return;
    const { count } = await supabase
      .from('user_friends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);
    setFriendCount(count || 0);
  }, [targetUserId]);

  useEffect(() => {
    fetchStatus();
    fetchFriendCount();
  }, [fetchStatus, fetchFriendCount]);

  const sendRequest = async () => {
    if (!user || !targetUserId) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_friends')
        .insert({ user_id: user.id, friend_id: targetUserId, status: 'pending' });
      if (error) throw error;
      setFriendStatus('pending_sent');
      toast({ title: 'Friend request sent!' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (recordId?: string) => {
    const id = recordId || friendRecord?.id;
    if (!user || !id) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_friends')
        .update({ status: 'accepted' })
        .eq('id', id);
      if (error) throw error;
      setFriendStatus('accepted');
      toast({ title: 'Friend request accepted!' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const declineRequest = async (recordId?: string) => {
    const id = recordId || friendRecord?.id;
    if (!user || !id) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_friends')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setFriendStatus('none');
      setFriendRecord(null);
      toast({ title: 'Friend request declined' });
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!friendRecord) return false;
    return declineRequest(friendRecord.id);
  };

  return {
    friendStatus,
    friendRecord,
    friendCount,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    refetch: fetchStatus,
  };
};
