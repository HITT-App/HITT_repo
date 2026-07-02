import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  post_type: 'text' | 'poll' | 'before-after' | 'workout' | 'steps';
  category: string;
  tags: string[];
  image_url: string | null;
  poll_options: { options: string[]; votes: number[] } | null;
  before_image_url: string | null;
  after_image_url: string | null;
  workout_data: { duration?: number; calories?: number; type?: string } | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  is_liked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  is_liked?: boolean;
  replies?: CommunityComment[];
}

export interface CommunityProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_received: number;
  is_private: boolean;
  onboarding_completed: boolean;
  created_at: string;
  is_following?: boolean;
}

const PAGE_SIZE = 50;

/**
 * Fetch a page of posts joined with community_profiles, plus the current user's
 * liked-post IDs.  Returns raw enriched rows so both the initial load and
 * loadMore() can share the same logic.
 */
async function fetchPostsPage(
  userId: string | undefined,
  olderThan?: string, // cursor: created_at of the oldest already-loaded post
): Promise<{ enriched: CommunityPost[]; hasMore: boolean }> {
  // Single query: posts + community_profile join (left join so posts without
  // a community_profile still appear).
  let query = supabase
    .from('community_posts')
    .select('*')
    // Filter out posts from deleted accounts. delete-account soft-deletes
    // community_posts by setting deleted_at, so this hides them from every
    // feed the moment the user taps Delete — not 30 days later at purge.
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (olderThan) {
    query = query.lt('created_at', olderThan);
  }

  const { data: postsData, error } = await query;
  if (error) throw error;

  // Parallel: fetch main-profile fallbacks and user likes at the same time.
  const userIds = [...new Set((postsData || []).map(p => p.user_id))];

  const [mainProfilesResult, likesResult] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null; avatar_url: string | null }[] | null }),
    userId
      ? supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', userId)
          .not('post_id', 'is', null)
      : Promise.resolve({ data: [] as { post_id: string | null }[] | null }),
  ]);

  const mainProfileMap = new Map(
    (mainProfilesResult.data || []).map(p => [p.user_id, p])
  );
  const userLikedSet = new Set(
    (likesResult.data || []).map(l => l.post_id as string)
  );

  const enriched: CommunityPost[] = (postsData || []).map(post => {
    const mp = mainProfileMap.get(post.user_id);

    return {
      ...post,
      post_type: post.post_type as CommunityPost['post_type'],
      tags: post.tags || [],
      poll_options: post.poll_options as CommunityPost['poll_options'],
      workout_data: post.workout_data as CommunityPost['workout_data'],
      profile: {
        display_name: mp?.display_name || null,
        username: null,
        avatar_url: mp?.avatar_url || null,
      },
      is_liked: userLikedSet.has(post.id),
    };
  });

  return { enriched, hasMore: enriched.length === PAGE_SIZE };
}

export const useCommunityPosts = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // cursor = created_at of the oldest post currently in state
  const cursorRef = useRef<string | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();

  // Initial / full refresh — replaces the entire posts array
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { enriched, hasMore: more } = await fetchPostsPage(user?.id);
      cursorRef.current = enriched.length > 0
        ? enriched[enriched.length - 1].created_at
        : undefined;
      setHasMore(more);
      setPosts(enriched);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Append the next page older than the current cursor
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const { enriched, hasMore: more } = await fetchPostsPage(user?.id, cursorRef.current);
      if (enriched.length > 0) {
        cursorRef.current = enriched[enriched.length - 1].created_at;
        setPosts(prev => [...prev, ...enriched]);
      }
      setHasMore(more);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, hasMore]);

  useEffect(() => {
    fetchPosts();

    // Realtime: targeted local-state updates instead of full re-fetches.
    // Per-instance channel name avoids collisions when the hook mounts twice.
    const channel = supabase
      .channel(`community-posts-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        async (payload) => {
          // Fetch the single new post with its joined profile so we can prepend it
          const newRow = payload.new as { id: string; user_id: string; created_at: string };
          try {
            const { data, error } = await supabase
              .from('community_posts')
              .select('*, community_profiles(display_name, username, avatar_url)')
              .eq('id', newRow.id)
              .single();
            if (error || !data) return;

            const cp = data.community_profiles as {
              display_name: string | null;
              username: string | null;
              avatar_url: string | null;
            } | null;

            // Fallback profile fetch only if community profile is missing
            let mp: { display_name: string | null; avatar_url: string | null } | undefined;
            if (!cp) {
              const { data: mpData } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('user_id', newRow.user_id)
                .single();
              mp = mpData ?? undefined;
            }

            const newPost: CommunityPost = {
              ...data,
              post_type: data.post_type as CommunityPost['post_type'],
              tags: data.tags || [],
              poll_options: data.poll_options as CommunityPost['poll_options'],
              workout_data: data.workout_data as CommunityPost['workout_data'],
              community_profiles: undefined,
              profile: {
                display_name: cp?.display_name || mp?.display_name || null,
                username: cp?.username || null,
                avatar_url: cp?.avatar_url || mp?.avatar_url || null,
              },
              is_liked: false,
            };
            setPosts(prev => [newPost, ...prev]);
          } catch (e) {
            console.error('Realtime INSERT error:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_posts' },
        (payload) => {
          const updated = payload.new as { id: string } & Partial<CommunityPost>;
          setPosts(prev =>
            prev.map(p =>
              p.id === updated.id
                ? {
                    ...p,
                    ...updated,
                    post_type: (updated.post_type ?? p.post_type) as CommunityPost['post_type'],
                    tags: updated.tags ?? p.tags,
                    poll_options: (updated.poll_options ?? p.poll_options) as CommunityPost['poll_options'],
                    workout_data: (updated.workout_data ?? p.workout_data) as CommunityPost['workout_data'],
                    // Preserve joined/derived fields that aren't in the raw DB row
                    profile: p.profile,
                    is_liked: p.is_liked,
                  }
                : p
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_posts' },
        (payload) => {
          const deleted = payload.old as { id: string };
          setPosts(prev => prev.filter(p => p.id !== deleted.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_likes' },
        (payload) => {
          // The DB trigger maintains likes_count; reflect the new count locally.
          const like = payload.new as { post_id: string | null; likes_count?: number };
          if (!like.post_id) return;
          setPosts(prev =>
            prev.map(p =>
              p.id === like.post_id
                ? { ...p, likes_count: p.likes_count + 1 }
                : p
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_likes' },
        (payload) => {
          const like = payload.old as { post_id: string | null };
          if (!like.post_id) return;
          setPosts(prev =>
            prev.map(p =>
              p.id === like.post_id
                ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return { posts, loading, loadingMore, hasMore, loadMore, refetch: fetchPosts };
};

export const useCommunityProfile = (userId?: string) => {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('community_profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Check if current user follows this user
        let isFollowing = false;
        if (user && user.id !== targetUserId) {
          const { data: followData } = await supabase
            .from('community_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .single();
          isFollowing = !!followData;
        }

        if (data) {
          // If community profile has no display_name/avatar, fall back to main profile
          if (!data.display_name || !data.avatar_url) {
            const { data: mainProfile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', targetUserId)
              .single();
            if (mainProfile) {
              data.display_name = data.display_name || mainProfile.display_name;
              data.avatar_url = data.avatar_url || mainProfile.avatar_url;
            }
          }
          setProfile({ ...data, is_following: isFollowing });
        } else {
          // No community profile — build one from main profiles table
          const { data: mainProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .single();

          if (mainProfile) {
            setProfile({
              id: mainProfile.id,
              user_id: mainProfile.user_id,
              username: null,
              display_name: mainProfile.display_name,
              bio: null,
              avatar_url: mainProfile.avatar_url,
              banner_url: null,
              followers_count: 0,
              following_count: 0,
              posts_count: 0,
              likes_received: 0,
              is_private: false,
              onboarding_completed: false,
              created_at: mainProfile.created_at,
              is_following: isFollowing,
            });
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUserId, user]);

  return { profile, loading };
};

export const useCommunityActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createPost = async (postData: {
    content: string;
    post_type: string;
    category: string;
    tags: string[];
    image_url?: string;
    poll_options?: { options: string[]; votes: number[] };
    before_image_url?: string;
    after_image_url?: string;
    workout_data?: { duration?: number; calories?: number; type?: string };
  }) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a post',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: postData.content,
          post_type: postData.post_type,
          category: postData.category,
          tags: postData.tags,
          image_url: postData.image_url,
          poll_options: postData.poll_options,
          before_image_url: postData.before_image_url,
          after_image_url: postData.after_image_url,
          workout_data: postData.workout_data,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post created successfully!',
      });

      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deletePost = async (postId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      });

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
      return false;
    }
  };

  const likePost = async (postId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to like posts',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('community_likes')
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error liking post:', error);
      return false;
    }
  };

  const unlikePost = async (postId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unliking post:', error);
      return false;
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to follow users',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('community_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  };

  const castVote = async (postId: string, optionIndex: number) => {
    if (!user) {
      toast({
        title: 'Sign in to vote',
        description: 'You must be logged in to vote on polls',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('community_poll_votes')
        .insert({
          post_id: postId,
          user_id: user.id,
          option_index: optionIndex,
        });

      if (error) {
        // 23505 = unique_violation — user already voted on this poll
        if ((error as { code?: string }).code === '23505') {
          toast({
            title: "You've already voted",
            description: 'Only one vote per poll',
          });
          return false;
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error casting vote:', error);
      toast({
        title: 'Error',
        description: 'Failed to record your vote',
        variant: 'destructive',
      });
      return false;
    }
  };

  const createOrUpdateProfile = async (profileData: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    is_private?: boolean;
    onboarding_completed?: boolean;
  }) => {
    if (!user) return null;

    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('community_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('community_profiles')
          .update(profileData)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('community_profiles')
          .insert({
            user_id: user.id,
            ...profileData,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    createPost,
    deletePost,
    likePost,
    unlikePost,
    followUser,
    unfollowUser,
    castVote,
    createOrUpdateProfile,
  };
};

export const useCommunityComments = (postId: string) => {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch comments and the current user's blocklist in parallel so we can
      // hide comments from blocked authors on the client.
      const [commentsResult, blocksResult] = await Promise.all([
        supabase
          .from('community_comments')
          .select('*')
          .eq('post_id', postId)
          // Hide comments from soft-deleted accounts immediately.
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        user
          ? supabase
              .from('community_blocks')
              .select('blocked_id')
              .eq('blocker_id', user.id)
          : Promise.resolve({ data: [] as { blocked_id: string }[] | null }),
      ]);
      const { data: rawCommentsData, error } = commentsResult;
      const blockedIds = new Set((blocksResult.data || []).map(b => b.blocked_id));
      const commentsData = (rawCommentsData || []).filter(c => !blockedIds.has(c.user_id));

      if (error) throw error;

      // Get profiles for comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: communityProfiles } = await supabase
        .from('community_profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const { data: mainProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Get user's likes
      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .not('comment_id', 'is', null);
        userLikes = likes?.map(l => l.comment_id as string) || [];
      }

      const communityProfileMap = new Map(communityProfiles?.map(p => [p.user_id, p]) || []);
      const mainProfileMap = new Map(mainProfiles?.map(p => [p.user_id, p]) || []);

      const profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
      for (const uid of userIds) {
        const cp = communityProfileMap.get(uid);
        const mp = mainProfileMap.get(uid);
        profileMap.set(uid, {
          display_name: cp?.display_name || mp?.display_name || null,
          username: cp?.username || null,
          avatar_url: cp?.avatar_url || mp?.avatar_url || null,
        });
      }

      // Organize comments with replies
      const topLevelComments: CommunityComment[] = [];
      const replyMap = new Map<string, CommunityComment[]>();

      (commentsData || []).forEach(comment => {
        const enrichedComment: CommunityComment = {
          ...comment,
          profile: profileMap.get(comment.user_id) || undefined,
          is_liked: userLikes.includes(comment.id),
          replies: [],
        };

        if (comment.parent_id) {
          const replies = replyMap.get(comment.parent_id) || [];
          replies.push(enrichedComment);
          replyMap.set(comment.parent_id, replies);
        } else {
          topLevelComments.push(enrichedComment);
        }
      });

      // Attach replies to parent comments
      topLevelComments.forEach(comment => {
        comment.replies = replyMap.get(comment.id) || [];
      });

      setComments(topLevelComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments_${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, postId]);

  const addComment = async (content: string, parentId?: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to comment',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      // Refetch so the new row appears in the list immediately —
      // previously the insert succeeded silently and the UI only
      // caught up on the next component mount.
      await fetchComments();
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
      return null;
    }
  };

  const likeComment = async (commentId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_likes')
        .insert({
          user_id: user.id,
          comment_id: commentId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error liking comment:', error);
      return false;
    }
  };

  const unlikeComment = async (commentId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unliking comment:', error);
      return false;
    }
  };

  return { comments, loading, addComment, likeComment, unlikeComment, refetch: fetchComments };
};
