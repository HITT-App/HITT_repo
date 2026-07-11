import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Trash2, Loader2, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ReportSheet } from "@/components/community/ReportSheet";

const StoryViewer = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const { storyGroups, markViewed, deleteStory, loading } = useStories();

  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ contentId: string; reportedUserId: string | null } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);

  const STORY_DURATION = 5000; // 5 seconds per story
  const TICK = 50;

  // Find the starting group index based on userId
  useEffect(() => {
    if (userId && storyGroups.length > 0) {
      const idx = storyGroups.findIndex((g) => g.user_id === userId);
      if (idx >= 0) setGroupIndex(idx);
    }
  }, [userId, storyGroups]);

  const currentGroup: StoryGroup | undefined = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Mark as viewed
  useEffect(() => {
    if (currentStory && !currentStory.is_viewed) {
      markViewed(currentStory.id);
    }
  }, [currentStory?.id]);

  const goNextRef = useRef<() => void>(() => {});

  // Progress timer
  useEffect(() => {
    setProgress(0);
    if (paused) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK / STORY_DURATION) * 100;
        if (next >= 100) {
          goNextRef.current();
          return 0;
        }
        return next;
      });
    }, TICK);

    return () => clearInterval(timerRef.current);
  }, [storyIndex, groupIndex, paused]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentGroup, storyIndex, groupIndex, storyGroups.length, navigate]);

  goNextRef.current = goNext;

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(0);
      setProgress(0);
    }
  }, [storyIndex, groupIndex]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    touchStartRef.current = { x, time: Date.now() };
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    setPaused(false);
    if (!touchStartRef.current) return;

    const endX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const dx = endX - touchStartRef.current.x;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // If it was a tap (short press, small movement)
    if (dt < 300 && Math.abs(dx) < 30) {
      const screenWidth = window.innerWidth;
      if (endX < screenWidth / 3) {
        goPrev();
      } else {
        goNext();
      }
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    clearInterval(timerRef.current);
    await deleteStory(currentStory.id);
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentGroup || !currentStory) {
    navigate(-1);
    return null;
  }

  const isOwn = user?.id === currentGroup.user_id;

  return (
    <div className="h-screen bg-black flex flex-col select-none">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-[calc(env(safe-area-inset-top)+8px)]">
        {currentGroup.stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width:
                  i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+18px)]">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-white/30">
            <AvatarImage src={currentGroup.profile?.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {(currentGroup.profile?.display_name || "U")[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-white text-sm font-semibold">
              {isOwn ? "Your Story" : currentGroup.profile?.display_name || "User"}
            </span>
            <span className="text-white/60 text-xs ml-2">
              {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOwn ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={handleDelete}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => {
                setPaused(true);
                setReportTarget({ contentId: currentStory.id, reportedUserId: currentGroup.user_id });
              }}
            >
              <Flag className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Story content */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        {currentStory.story_type === "text" ? (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: currentStory.background_color || "#1a1a2e" }}
          >
            <p className="text-white text-2xl font-bold text-center leading-relaxed">
              {currentStory.text_content}
            </p>
          </div>
        ) : currentStory.story_type === "video" ? (
          <video
            key={currentStory.id}
            src={currentStory.media_url || ""}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full relative">
            <img
              key={currentStory.id}
              src={currentStory.media_url || ""}
              alt=""
              className="w-full h-full object-contain"
            />
            {currentStory.text_content && (
              <div className="absolute bottom-20 left-0 right-0 px-6">
                <p className="text-white text-lg font-semibold text-center drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3">
                  {currentStory.text_content}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report story dialog */}
      {reportTarget && (
        <ReportSheet
          open={!!reportTarget}
          onOpenChange={(o) => { if (!o) { setReportTarget(null); setPaused(false); } }}
          contentType="story"
          contentId={reportTarget.contentId}
          reportedUserId={reportTarget.reportedUserId}
        />
      )}
    </div>
  );
};

export default StoryViewer;
