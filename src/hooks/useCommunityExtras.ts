import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommunityProfile } from './useCommunity';

// =============== SEARCH USERS ===============
export const useSearchUsers = (query: string) => {
  const [users, setUsers] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        const { data, error } = await supabase
          .from('community_profiles')
          .select('*')
          // Respect the profile privacy flag — private accounts must
          // not be discoverable via search, even by exact-match on
          // username. Users who tick the private toggle in Profile
          // are trusting us to keep them out of every discovery path.
          .eq('is_private', false)
          .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .limit(20);

        if (error) throw error;

        // Get follow status for each user
        if (user && data && data.length > 0) {
          const userIds = data.map(u => u.user_id);
          const { data: follows } = await supabase
            .from('community_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', userIds);

          const followingSet = new Set(follows?.map(f => f.following_id) || []);

          setUsers(data.map(profile => ({
            ...profile,
            is_following: followingSet.has(profile.user_id),
          })));
        } else {
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query, user]);

  return { users, loading };
};

// =============== BLOCKED USERS ===============
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBlockedUsers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_blocks')
        .select('*')
        .eq('blocker_id', user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Get blocked user profiles
      const blockedIds = data.map(b => b.blocked_id);
      const { data: profiles } = await supabase
        .from('community_profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', blockedIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setBlockedUsers(data.map(block => ({
        ...block,
        blocked_user: profileMap.get(block.blocked_id),
      })));
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const blockUser = async (blockedId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
        });

      if (error) throw error;
      
      toast({
        title: 'User blocked',
        description: 'You will no longer see content from this user',
      });
      
      fetchBlockedUsers();
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to block user',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      if (error) throw error;
      
      toast({
        title: 'User unblocked',
        description: 'You can now see content from this user',
      });
      
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedId));
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { blockedUsers, loading, blockUser, unblockUser, refetch: fetchBlockedUsers };
};

// =============== SAVED POSTS ===============
export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export const useSavedPosts = () => {
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSavedPosts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_saved_posts')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setSavedPostIds(new Set(data?.map(s => s.post_id) || []));
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  const savePost = async (postId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save posts',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('community_saved_posts')
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (error) throw error;
      
      setSavedPostIds(prev => new Set([...prev, postId]));
      toast({
        title: 'Post saved',
        description: 'Added to your saved posts',
      });
      return true;
    } catch (error) {
      console.error('Error saving post:', error);
      return false;
    }
  };

  const unsavePost = async (postId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;
      
      setSavedPostIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      toast({
        title: 'Post removed',
        description: 'Removed from your saved posts',
      });
      return true;
    } catch (error) {
      console.error('Error unsaving post:', error);
      return false;
    }
  };

  const isPostSaved = (postId: string) => savedPostIds.has(postId);

  return { savedPostIds, loading, savePost, unsavePost, isPostSaved, refetch: fetchSavedPosts };
};

// =============== BROWSE USERS (for discovery) ===============
export const useBrowseUsers = () => {
  const [users, setUsers] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Get users the current user is NOT following.
        // Private accounts are excluded from browse for the same reason
        // they're excluded from search — the whole point of the toggle
        // is that other users can't stumble across them.
        let query = supabase
          .from('community_profiles')
          .select('*')
          .eq('is_private', false)
          .order('followers_count', { ascending: false })
          .limit(20);

        if (user) {
          query = query.neq('user_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (user && data && data.length > 0) {
          const userIds = data.map(u => u.user_id);
          const { data: follows } = await supabase
            .from('community_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', userIds);

          const followingSet = new Set(follows?.map(f => f.following_id) || []);

          setUsers(data.map(profile => ({
            ...profile,
            is_following: followingSet.has(profile.user_id),
          })));
        } else {
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  return { users, loading };
};

// =============== CONTENT REPORTS (App Store Guideline 1.2) ===============
export type ReportContentType = 'post' | 'comment' | 'story' | 'dm' | 'chatroom' | 'profile';
export type ReportReason =
  | 'spam' | 'harassment' | 'hate' | 'nudity' | 'violence' | 'self_harm' | 'scam' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'scam', label: 'Scam or misinformation' },
  { value: 'other', label: 'Something else' },
];

export const useReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const reportContent = async (args: {
    contentType: ReportContentType;
    contentId: string;
    reportedUserId?: string | null;
    reason: ReportReason;
    details?: string;
  }): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to report content.', variant: 'destructive' });
      return false;
    }
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        reported_user_id: args.reportedUserId ?? null,
        content_type: args.contentType,
        content_id: args.contentId,
        reason: args.reason,
        details: args.details?.trim() || null,
      });
      // A duplicate (same user, same item) is fine — they've already reported it.
      if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error;

      // Best-effort owner notification; never blocks the user.
      supabase.functions
        .invoke('notify-report', {
          body: { contentType: args.contentType, contentId: args.contentId, reason: args.reason },
        })
        .catch(() => {});

      toast({ title: 'Report received', description: 'Thanks — our team will review this within 24 hours.' });
      return true;
    } catch (e) {
      console.error('Error reporting content:', e);
      toast({ title: 'Error', description: 'Could not submit your report. Please try again.', variant: 'destructive' });
      return false;
    }
  };

  return { reportContent };
};
