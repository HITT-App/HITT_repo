import { useState, useEffect, useCallback } from 'react';
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
  is_following?: boolean;
}

export const useCommunityPosts = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for posts
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: communityProfiles } = await supabase
        .from('community_profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      // Fallback to main profiles table for users without community profiles
      const { data: mainProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Get user's likes
      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .not('post_id', 'is', null);
        userLikes = likes?.map(l => l.post_id as string) || [];
      }

      const communityProfileMap = new Map(communityProfiles?.map(p => [p.user_id, p]) || []);
      const mainProfileMap = new Map(mainProfiles?.map(p => [p.user_id, p]) || []);

      // Merge: prefer community profile, fall back to main profile
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

      const enrichedPosts: CommunityPost[] = (postsData || []).map(post => ({
        ...post,
        post_type: post.post_type as CommunityPost['post_type'],
        tags: post.tags || [],
        poll_options: post.poll_options as CommunityPost['poll_options'],
        workout_data: post.workout_data as CommunityPost['workout_data'],
        profile: profileMap.get(post.user_id) || undefined,
        is_liked: userLikes.includes(post.id),
      }));

      setPosts(enrichedPosts);
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

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('community_posts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_posts' },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_likes' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
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

        if (data) {
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

          setProfile({ ...data, is_following: isFollowing });
        } else {
          setProfile(null);
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
      const { data: commentsData, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profiles for comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('community_profiles')
        .select('user_id, display_name, username, avatar_url')
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

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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
