import { ChevronRight, Calendar, Video, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Session {
  id: string;
  coachName: string;
  coachAvatar?: string;
  specialty: string;
  rating: number;
  sessionType: string;
  date: string;
  time: string;
}

interface CoachSessionSectionProps {
  sessions?: Session[];
  upcomingCount?: number;
}

export function CoachSessionSection({
  sessions = [],
  upcomingCount = 2,
}: CoachSessionSectionProps) {
  const navigate = useNavigate();

  const defaultSession: Session = {
    id: "1",
    coachName: "Coach Aivanjul U. Wu",
    coachAvatar: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&q=80",
    specialty: "Cardio Expert",
    rating: 4.6,
    sessionType: "Upper Body Training 101",
    date: "Mon, 17 Feb at 10:23 AM",
    time: "10:23 AM",
  };

  const displaySession = sessions[0] || defaultSession;

  if (sessions.length === 0 && !defaultSession) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Fitness Coach Session</h2>
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/browse-coaches")}
          >
            See All
          </Button>
        </div>
        
        <Card className="p-4 bg-card border border-border/60">
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Avatar key={i} className="w-10 h-10 border-2 border-background -ml-2 first:ml-0">
                <AvatarFallback className="bg-secondary text-xs">C{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            You don't have any coach appointment.
          </p>
          <Button
            variant="link"
            className="text-primary p-0 h-auto"
            onClick={() => navigate("/browse-coaches")}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Explore Fitness Coach
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Fitness Coach Session</h2>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/coach-appointments")}
        >
          See All
        </Button>
      </div>
      
      <Card className="p-4 bg-card border border-border/60">
        {/* Coach Info */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={displaySession.coachAvatar} alt={displaySession.coachName} />
            <AvatarFallback>{displaySession.coachName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-foreground">{displaySession.coachName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{displaySession.specialty}</span>
              <span>•</span>
              <span className="text-primary">★ {displaySession.rating} (997)</span>
            </div>
          </div>
        </div>

        {/* Session Type */}
        <p className="text-sm text-foreground mb-1">{displaySession.sessionType}</p>
        <p className="text-xs text-muted-foreground mb-4">{displaySession.date}</p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => navigate(`/live-session/${displaySession.id}`)}
          >
            <Video className="w-4 h-4 mr-2" />
            Reschedule
          </Button>
          <Button 
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>

        {/* Upcoming Notice */}
        {upcomingCount > 0 && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-xs text-primary flex-1">
              You have {upcomingCount} upcoming appointments. Make sure you are ready.
            </p>
            <button className="text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
