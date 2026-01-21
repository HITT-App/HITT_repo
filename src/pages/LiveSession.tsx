import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Phone, Video, VideoOff, Mic, MicOff, MessageSquare, Clock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const LiveSession = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const showReviewInitially = searchParams.get("review") === "true";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(showReviewInitially);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
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
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coaching_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_minutes: Math.round(elapsed / 60),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      setShowEndDialog(false);
      setShowReviewDialog(true);
    },
    onError: () => {
      toast.error("Failed to complete session");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!session?.coaches?.id || !user?.id) throw new Error("Missing data");

      const { error } = await supabase.from("coach_reviews").insert({
        coach_id: session.coaches.id,
        user_id: user.id,
        session_id: id,
        rating,
        review_text: reviewText || null,
        experience_emoji: selectedEmoji,
        is_verified: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      navigate("/coach-appointments");
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sessionDuration = (session?.duration_minutes || 30) * 60;
  const progress = Math.min((elapsed / sessionDuration) * 100, 100);

  const emojis = [
    { emoji: "😍", label: "Loved it" },
    { emoji: "😊", label: "Great" },
    { emoji: "😐", label: "Okay" },
    { emoji: "😕", label: "Not great" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate("/coach-appointments")}>
            Back to Appointments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Coach Video (Full screen) */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {session.coaches?.avatar_url ? (
                <img
                  src={session.coaches.avatar_url}
                  alt={session.coaches.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">👨‍🏫</span>
              )}
            </div>
            <h2 className="text-xl font-semibold">{session.coaches?.name}</h2>
            <p className="text-white/60">{session.coaches?.title}</p>
            {!sessionStarted && (
              <p className="text-white/40 mt-2">Waiting to start...</p>
            )}
          </div>
        </div>

        {/* User Video (Small overlay) */}
        <div className="absolute bottom-4 right-4 w-32 h-44 rounded-xl bg-muted/80 flex items-center justify-center overflow-hidden">
          {isVideoOff ? (
            <VideoOff className="w-8 h-8 text-white/60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-muted flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-lg">{formatTime(elapsed)}</span>
            <span className="text-white/60">/ {session.duration_minutes}:00</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-20 left-4 right-4">
          <Progress value={progress} className="h-1 bg-white/20" />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-background/95 backdrop-blur-lg p-6">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className={`w-14 h-14 rounded-full ${isMuted ? "bg-destructive/20 border-destructive" : ""}`}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`w-14 h-14 rounded-full ${isVideoOff ? "bg-destructive/20 border-destructive" : ""}`}
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {!sessionStarted ? (
            <Button
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90"
              onClick={() => setSessionStarted(true)}
            >
              <Video className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-14 h-14 rounded-full"
              onClick={() => setShowEndDialog(true)}
            >
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </Button>
          )}
        </div>

        {!sessionStarted && (
          <p className="text-center text-muted-foreground mt-4">
            Tap the green button to start your session
          </p>
        )}
      </div>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session?</DialogTitle>
            <DialogDescription>
              You've been in this session for {formatTime(elapsed)}. Are you sure you want to end it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Continue Session
            </Button>
            <Button
              variant="destructive"
              onClick={() => completeSessionMutation.mutate()}
              disabled={completeSessionMutation.isPending}
            >
              {completeSessionMutation.isPending ? "Ending..." : "End Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">How was your session?</DialogTitle>
            <DialogDescription className="text-center">
              Rate your experience with {session.coaches?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Emoji Selection */}
            <div className="flex justify-center gap-4">
              {emojis.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    selectedEmoji === emoji
                      ? "bg-primary/20 scale-110"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>

            {/* Star Rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Review Text */}
            <Textarea
              placeholder="Tell us more about your experience (optional)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={() => submitReviewMutation.mutate()}
              disabled={rating === 0 || submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/coach-appointments")}
            >
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveSession;
