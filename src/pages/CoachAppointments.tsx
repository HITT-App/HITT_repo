import { useState } from "react";
import { ArrowLeft, Calendar, Clock, MapPin, Video, MoreVertical, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { toast } from "sonner";

const CoachAppointments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["coaching-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(`
          *,
          coaches (
            id,
            name,
            avatar_url,
            title,
            specialties
          )
        `)
        .eq("user_id", user?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      const { error } = await supabase
        .from("coaching_sessions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      toast.success("Session cancelled successfully");
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedSession(null);
    },
    onError: () => {
      toast.error("Failed to cancel session");
    },
  });

  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) => s.status === "scheduled" && isAfter(parseISO(s.scheduled_date), now)
  );
  const pastSessions = sessions.filter(
    (s) => s.status === "completed" || isBefore(parseISO(s.scheduled_date), now)
  );
  const cancelledSessions = sessions.filter((s) => s.status === "cancelled");

  const handleCancelSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedSession) {
      cancelMutation.mutate({ sessionId: selectedSession, reason: cancelReason });
    }
  };

  const SessionCard = ({ session, showActions = true }: { session: any; showActions?: boolean }) => {
    const sessionDate = parseISO(session.scheduled_date);
    const isSessionToday = isToday(sessionDate);
    const canJoin = isSessionToday && session.status === "scheduled";

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {session.coaches?.avatar_url ? (
                <img
                  src={session.coaches.avatar_url}
                  alt={session.coaches.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">👨‍🏫</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{session.coaches?.name}</h3>
              <p className="text-sm text-muted-foreground">{session.coaches?.title}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(sessionDate, "MMM d, yyyy")}</span>
                <Clock className="w-4 h-4 ml-2" />
                <span>{session.scheduled_time}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {session.session_type === "video-call" ? (
                  <Badge variant="secondary" className="text-xs">
                    <Video className="w-3 h-3 mr-1" /> Video Call
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" /> In-Person
                  </Badge>
                )}
                <Badge
                  variant={
                    session.status === "scheduled"
                      ? "default"
                      : session.status === "completed"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {session.status}
                </Badge>
              </div>
            </div>
          </div>

          {showActions && session.status === "scheduled" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/book-coach/${session.coach_id}`)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Reschedule
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleCancelSession(session.id)}
                >
                  <X className="w-4 h-4 mr-2" /> Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {canJoin && (
          <Button
            className="w-full mt-4"
            onClick={() => navigate(`/live-session/${session.id}`)}
          >
            <Video className="w-4 h-4 mr-2" /> Join Session
          </Button>
        )}

        {session.status === "completed" && !session.rating && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => navigate(`/live-session/${session.id}?review=true`)}
          >
            Leave a Review
          </Button>
        )}
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">My Appointments</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastSessions.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                <Button onClick={() => navigate("/browse-coaches")}>
                  Book a Session
                </Button>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-4">
            {pastSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No past sessions
              </div>
            ) : (
              pastSessions.map((session) => (
                <SessionCard key={session.id} session={session} showActions={false} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-4">
            {cancelledSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No cancelled sessions
              </div>
            ) : (
              cancelledSessions.map((session) => (
                <SessionCard key={session.id} session={session} showActions={false} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Session
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachAppointments;
