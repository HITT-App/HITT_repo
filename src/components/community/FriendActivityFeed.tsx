import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Flame, Heart, HandMetal, Clock, Dumbbell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface FriendActivity {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  workout_title: string;
  duration_minutes: number;
  completed_at: string;
  userReaction?: string | null;
}

const reactions = [
  { emoji: "🔥", icon: Flame, name: "fire" },
  { emoji: "👏", icon: HandMetal, name: "clap" },
  { emoji: "❤️", icon: Heart, name: "heart" },
];

export function FriendActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFriendActivities = async () => {
      try {
        // Get users the current user follows
        const { data: follows } = await supabase
          .from("community_follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (!follows || follows.length === 0) {
          setActivities([]);
          setLoading(false);
          return;
        }

        const followingIds = follows.map((f) => f.following_id);

        // Get recent workout completions from followed users
        const { data: workoutProgress } = await supabase
          .from("workout_progress")
          .select(`
            id,
            user_id,
            workout_id,
            duration_seconds,
            completed_at,
            workouts (title)
          `)
          .in("user_id", followingIds)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10);

        if (!workoutProgress) {
          setActivities([]);
          setLoading(false);
          return;
        }

        // Get profiles for these users
        const userIds = [...new Set(workoutProgress.map((w) => w.user_id))];
        const { data: profiles } = await supabase
          .from("community_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        const formattedActivities: FriendActivity[] = workoutProgress.map((wp) => {
          const profile = profileMap.get(wp.user_id);
          return {
            id: wp.id,
            user_id: wp.user_id,
            display_name: profile?.display_name || "Athlete",
            avatar_url: profile?.avatar_url,
            workout_title: (wp.workouts as any)?.title || "Workout",
            duration_minutes: Math.floor((wp.duration_seconds || 0) / 60),
            completed_at: wp.completed_at!,
          };
        });

        setActivities(formattedActivities);
      } catch (error) {
        console.error("Error fetching friend activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendActivities();

    // Subscribe to realtime updates — per-instance channel name avoids
    // duplicate-subscription crashes when the component mounts elsewhere.
    const channel = supabase
      .channel(`friend-workouts-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workout_progress",
        },
        () => {
          fetchFriendActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleReaction = (activityId: string, reactionName: string) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? { ...a, userReaction: a.userReaction === reactionName ? null : reactionName }
          : a
      )
    );
  };

  if (loading) {
    return (
      <div className="mx-4 mb-4">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show if no friend activity
  }

  return (
    <div className="mx-4 mb-4">
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Friend Activity
        </h3>
        <div className="space-y-4">
          {activities.slice(0, 3).map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {activity.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.display_name}</span>{" "}
                  completed{" "}
                  <span className="font-medium">{activity.workout_title}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(activity.completed_at), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {activity.duration_minutes} min
                  </span>
                </div>
                {/* Reactions */}
                <div className="flex gap-1 mt-2">
                  {reactions.map((reaction) => (
                    <Button
                      key={reaction.name}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 rounded-full text-xs",
                        activity.userReaction === reaction.name
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleReaction(activity.id, reaction.name)}
                    >
                      {reaction.emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
