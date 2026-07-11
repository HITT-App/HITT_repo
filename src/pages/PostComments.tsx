import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Send, Paperclip, Smile, Mic, Loader2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommunityComments } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ReportSheet } from "@/components/community/ReportSheet";

const PostComments = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useAuth();
  const { comments, loading, addComment, likeComment, unlikeComment } = useCommunityComments(postId || "");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likingComments, setLikingComments] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<{ contentId: string; reportedUserId: string | null } | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false }) + " ago";
    } catch {
      return "recently";
    }
  };

  const handleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (likingComments.includes(commentId)) return;
    
    setLikingComments(prev => [...prev, commentId]);
    
    if (isLiked) {
      await unlikeComment(commentId);
    } else {
      await likeComment(commentId);
    }
    
    setLikingComments(prev => prev.filter(id => id !== commentId));
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setSubmitting(true);
    await addComment(newComment);
    setNewComment("");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">All Comments</h1>
        {/* Spacer so the title stays centred in the flex row now that
            the trailing settings cog is gone. */}
        <div className="w-10" />
      </header>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-24 space-y-6">
          {comments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            </div>
          )}
          
          {comments.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(comment.profile?.display_name || comment.profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.profile?.display_name || comment.profile?.username || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{comment.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <button 
                      className={`flex items-center gap-1 transition-colors ${comment.is_liked ? "text-red-500" : ""}`}
                      onClick={() => handleLike(comment.id, comment.is_liked || false)}
                      disabled={likingComments.includes(comment.id)}
                    >
                      <Heart className={`w-4 h-4 ${comment.is_liked ? "fill-current" : ""}`} />
                      {comment.likes_count}
                    </button>
                    {comment.replies && comment.replies.length > 0 && (
                      <span className="flex items-center gap-1">
                        💬 {comment.replies.length} replies
                      </span>
                    )}
                    {comment.user_id !== user?.id && (
                      <button
                        className="flex items-center gap-1 transition-colors hover:text-foreground"
                        onClick={() => setReportTarget({ contentId: comment.id, reportedUserId: comment.user_id })}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Report
                      </button>
                    )}
                  </div>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 space-y-4 border-l-2 border-border pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={reply.profile?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(reply.profile?.display_name || reply.profile?.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {reply.profile?.display_name || reply.profile?.username || "Anonymous"}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatTimestamp(reply.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Comment Input */}
      <div className="shrink-0 p-4 border-t border-border bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder={user ? "Type to write comment..." : "Log in to comment"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="pr-20"
              disabled={!user}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <Button 
            size="icon" 
            className="bg-primary hover:bg-primary/90 rounded-full shrink-0"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting || !user}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Report comment dialog */}
      {reportTarget && (
        <ReportSheet
          open={!!reportTarget}
          onOpenChange={(o) => { if (!o) setReportTarget(null); }}
          contentType="comment"
          contentId={reportTarget.contentId}
          reportedUserId={reportTarget.reportedUserId}
        />
      )}
    </div>
  );
};

export default PostComments;
