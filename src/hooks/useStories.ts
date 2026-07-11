import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Story {
  id: string;
  user_id: string;
  story_type: string;
  media_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  expires_at: string;
  is_viewed?: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username?: string | null;
  };
}

export interface StoryGroup {
  user_id: string;
  profile: Story["profile"];
  stories: Story[];
  has_unviewed: boolean;
}

export const useStories = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const fetchStories = async () => {
    if (!user) return;

    try {
      // Fetch active stories
      const { data: stories, error } = await supabase
        .from("community_stories")
        .select("*")
        .eq("moderation_hidden", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch viewed story IDs
      const { data: views } = await supabase
        .from("community_story_views")
        .select("story_id")
        .eq("user_id", user.id);

      const viewedSet = new Set((views || []).map((v) => v.story_id));
      setViewedIds(viewedSet);

      // Fetch profiles for story authors
      const userIds = [...new Set((stories || []).map((s) => s.user_id))];
      
      let profilesMap: Record<string, Story["profile"]> = {};
      if (userIds.length > 0) {
        const { data: communityProfiles } = await supabase
          .from("community_profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const { data: mainProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        userIds.forEach((uid) => {
          const cp = communityProfiles?.find((p) => p.user_id === uid);
          const mp = mainProfiles?.find((p) => p.user_id === uid);
          profilesMap[uid] = {
            display_name: cp?.display_name || mp?.display_name || "User",
            avatar_url: cp?.avatar_url || mp?.avatar_url || null,
            username: cp?.username || null,
          };
        });
      }

      // Group by user
      const groups: Record<string, StoryGroup> = {};
      (stories || []).forEach((s) => {
        if (!groups[s.user_id]) {
          groups[s.user_id] = {
            user_id: s.user_id,
            profile: profilesMap[s.user_id] || { display_name: "User", avatar_url: null },
            stories: [],
            has_unviewed: false,
          };
        }
        const story: Story = { ...s, is_viewed: viewedSet.has(s.id), profile: profilesMap[s.user_id] };
        groups[s.user_id].stories.push(story);
        if (!viewedSet.has(s.id)) {
          groups[s.user_id].has_unviewed = true;
        }
      });

      // Sort: current user first, then unviewed first
      const sorted = Object.values(groups).sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        if (a.has_unviewed && !b.has_unviewed) return -1;
        if (!a.has_unviewed && b.has_unviewed) return 1;
        return 0;
      });

      setStoryGroups(sorted);
    } catch (err) {
      console.error("Error fetching stories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [user]);

  const markViewed = async (storyId: string) => {
    if (!user || viewedIds.has(storyId)) return;

    setViewedIds((prev) => new Set([...prev, storyId]));

    await supabase
      .from("community_story_views")
      .upsert({ story_id: storyId, user_id: user.id }, { onConflict: "story_id,user_id" });
  };

  const createStory = async (data: {
    story_type: string;
    media_url?: string | null;
    text_content?: string | null;
    background_color?: string;
  }) => {
    if (!user) return null;

    const { data: story, error } = await supabase
      .from("community_stories")
      .insert({
        user_id: user.id,
        story_type: data.story_type,
        media_url: data.media_url || null,
        text_content: data.text_content || null,
        background_color: data.background_color || "#1a1a2e",
      })
      .select()
      .single();

    if (error) throw error;

    await fetchStories();
    return story;
  };

  const deleteStory = async (storyId: string) => {
    await supabase.from("community_stories").delete().eq("id", storyId);
    await fetchStories();
  };

  return { storyGroups, loading, createStory, deleteStory, markViewed, refetch: fetchStories };
};
