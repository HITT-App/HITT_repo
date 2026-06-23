import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isToday, isFuture } from "date-fns";

export const CoachingCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: nextSession } = useQuery({
    queryKey: ["next-coaching-session", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coaches (name, avatar_url, title)
        `)
        .eq("user_id", user?.id)
        .eq("status", "scheduled")
        .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: coachingPrefs } = useQuery({
    queryKey: ["coaching-prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_preferences")
        .select("onboarding_completed")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasCompletedOnboarding = coachingPrefs?.onboarding_completed;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Personal Coaching
        </h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0"
          onClick={() => navigate("/browse-coaches")}
        >
          Browse coaches <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {nextSession ? (
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/coach-appointments")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {nextSession.coaches?.avatar_url ? (
                <img
                  src={nextSession.coaches.avatar_url}
                  alt={nextSession.coaches.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">👨‍🏫</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Next Session</p>
              <h3 className="font-semibold">{nextSession.coaches?.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>
                  {isToday(parseISO(nextSession.scheduled_date))
                    ? "Today"
                    : format(parseISO(nextSession.scheduled_date), "MMM d")}
                  {" at "}
                  {nextSession.scheduled_time}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {hasCompletedOnboarding
                  ? "Find Your Perfect Coach"
                  : "Get Matched with a Coach"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasCompletedOnboarding
                  ? "Book a session with a certified trainer"
                  : "Tell us your goals for personalized matches"}
              </p>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            onClick={() =>
              navigate(hasCompletedOnboarding ? "/browse-coaches" : "/coach-onboarding")
            }
          >
            {hasCompletedOnboarding ? "Browse Coaches" : "Get Started"}
          </Button>
        </Card>
      )}
    </div>
  );
};
