import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReactionType = 'heart' | 'laugh' | 'wow' | 'fire' | 'muscle' | 'clap';

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  fire: '🔥',
  muscle: '💪',
  clap: '👏',
};

export interface ReactionSummary {
  [postId: string]: {
    counts: Partial<Record<ReactionType, number>>;
    total: number;
    userReaction: ReactionType | null;
  };
}

export const useReactions = (postIds: string[]) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionSummary>({});

  const fetchReactions = useCallback(async () => {
    if (postIds.length === 0) return;

    const { data } = await supabase
      .from('community_reactions')
      .select('post_id, reaction_type, user_id')
      .in('post_id', postIds);

    if (!data) return;

    const summary: ReactionSummary = {};
    for (const postId of postIds) {
      summary[postId] = { counts: {}, total: 0, userReaction: null };
    }

    for (const row of data) {
      const s = summary[row.post_id];
      if (!s) continue;
      const rt = row.reaction_type as ReactionType;
      s.counts[rt] = (s.counts[rt] || 0) + 1;
      s.total += 1;
      if (user && row.user_id === user.id) {
        s.userReaction = rt;
      }
    }

    setReactions(summary);
  }, [postIds.join(','), user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const react = async (postId: string, reactionType: ReactionType) => {
    if (!user) return false;

    const current = reactions[postId]?.userReaction;

    // Optimistic update
    setReactions(prev => {
      const s = { ...prev[postId] || { counts: {}, total: 0, userReaction: null } };
      const counts = { ...s.counts };

      if (current) {
        counts[current] = Math.max(0, (counts[current] || 1) - 1);
        if (counts[current] === 0) delete counts[current];
        s.total -= 1;
      }

      if (current !== reactionType) {
        counts[reactionType] = (counts[reactionType] || 0) + 1;
        s.total += 1;
        s.userReaction = reactionType;
      } else {
        s.userReaction = null;
      }

      s.counts = counts;
      return { ...prev, [postId]: s };
    });

    try {
      if (current === reactionType) {
        // Remove reaction
        await supabase
          .from('community_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        // Upsert reaction
        await supabase
          .from('community_reactions')
          .upsert(
            { user_id: user.id, post_id: postId, reaction_type: reactionType },
            { onConflict: 'user_id,post_id' }
          );
      }
      return true;
    } catch {
      fetchReactions(); // revert
      return false;
    }
  };

  const removeReaction = async (postId: string) => {
    if (!user) return false;
    const current = reactions[postId]?.userReaction;
    if (!current) return true;
    return react(postId, current);
  };

  return { reactions, react, removeReaction, refetch: fetchReactions };
};
