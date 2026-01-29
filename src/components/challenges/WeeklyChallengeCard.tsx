import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Users, ChevronRight, Flame, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  target_value: number;
  current_progress: number;
  participant_count: number;
  ends_at: string;
  challenge_type: string;
}

export function WeeklyChallengeCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchActiveChallenge = async () => {
      try {
        // Get the current week's active challenge the user is enrolled in
        const { data: enrollments } = await supabase
          .from("challenge_enrollments")
          .select(`
            challenge_id,
            current_progress,
            challenges (
              id,
              title,
              description,
              target_value,
              challenge_type,
              ends_at
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("enrolled_at", { ascending: false })
          .limit(1);

        if (enrollments && enrollments.length > 0) {
          const enrollment = enrollments[0];
          const challengeData = enrollment.challenges as any;

          // Get participant count
          const { count } = await supabase
            .from("challenge_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("challenge_id", enrollment.challenge_id);

          setChallenge({
            id: challengeData.id,
            title: challengeData.title,
            description: challengeData.description,
            target_value: challengeData.target_value,
            current_progress: enrollment.current_progress || 0,
            participant_count: count || 0,
            ends_at: challengeData.ends_at,
            challenge_type: challengeData.challenge_type,
          });
        } else {
          // Show a featured challenge they could join
          const { data: featuredChallenges } = await supabase
            .from("challenges")
            .select("*")
            .eq("status", "active")
            .eq("is_featured", true)
            .order("created_at", { ascending: false })
            .limit(1);

          if (featuredChallenges && featuredChallenges.length > 0) {
            const featured = featuredChallenges[0];
            const { count } = await supabase
              .from("challenge_enrollments")
              .select("*", { count: "exact", head: true })
              .eq("challenge_id", featured.id);

            setChallenge({
              id: featured.id,
              title: featured.title,
              description: featured.description || "",
              target_value: featured.target_value,
              current_progress: 0,
              participant_count: count || 0,
              ends_at: featured.ends_at,
              challenge_type: featured.challenge_type,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching challenge:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveChallenge();
  }, [user]);

  if (loading) {
    return (
      <div className="mx-4 mb-4">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  const progressPercent = Math.min(
    (challenge.current_progress / challenge.target_value) * 100,
    100
  );
  const isEnrolled = challenge.current_progress > 0;
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const getIcon = () => {
    switch (challenge.challenge_type) {
      case "calories":
        return <Flame className="w-5 h-5 text-primary" />;
      case "workouts":
        return <Target className="w-5 h-5 text-primary" />;
      default:
        return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  const getUnit = () => {
    switch (challenge.challenge_type) {
      case "calories":
        return "cal";
      case "workouts":
        return "workouts";
      case "minutes":
        return "min";
      default:
        return "";
    }
  };

  return (
    <div className="mx-4 mb-4">
      <div className="bg-gradient-to-br from-primary/5 via-card to-primary/5 border border-border/60 rounded-2xl p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

        {/* Header */}
        <div className="flex items-start justify-between mb-3 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Weekly Challenge
              </h3>
              <p className="text-xs text-muted-foreground">{daysLeft} days left</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary"
            onClick={() => navigate(`/challenges/${challenge.id}`)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Challenge info */}
        <div className="mb-4">
          <h4 className="font-medium text-foreground mb-1">{challenge.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {challenge.description}
          </p>
        </div>

        {/* Progress */}
        {isEnrolled ? (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium text-foreground">
                {challenge.current_progress.toLocaleString()} /{" "}
                {challenge.target_value.toLocaleString()} {getUnit()}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        ) : (
          <Button
            className="w-full mb-3 bg-primary hover:bg-primary/90"
            onClick={() => navigate(`/challenges/${challenge.id}`)}
          >
            Join Challenge
          </Button>
        )}

        {/* Participants */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {challenge.participant_count.toLocaleString()} athletes participating
          </span>
        </div>
      </div>
    </div>
  );
}
