import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Heart, MessageCircle, Bookmark, MoreHorizontal, Play, ChevronUp, Flame, Users, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useCommunityPosts, useCommunityActions, CommunityPost } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

const CommunityFeed = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("popular");
  const { posts, loading } = useCommunityPosts();
  const { likePost, unlikePost } = useCommunityActions();
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [likingPosts, setLikingPosts] = useState<string[]>([]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  };

  const toggleSave = (postId: string) => {
    setSavedPosts(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const handleLike = async (post: CommunityPost) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (likingPosts.includes(post.id)) return;
    
    setLikingPosts(prev => [...prev, post.id]);
    
    if (post.is_liked) {
      await unlikePost(post.id);
    } else {
      await likePost(post.id);
    }
    
    setLikingPosts(prev => prev.filter(id => id !== post.id));
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 bg-background z-10 px-4 py-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-4 gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer touch-manipulation" onClick={() => navigate("/community/profile")}>
            <AvatarImage src="" />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
              {user ? getInitials(user.email) : "U"}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-base font-semibold flex-1 text-center">Feed</h1>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => navigate("/community/create")}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9 bg-secondary/50 border-border/60 min-h-[44px]"
              onClick={() => navigate("/community/search")}
              readOnly
            />
          </div>
          <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 bg-secondary/50 min-h-[44px] rounded-xl">
            <TabsTrigger value="popular" className="gap-1.5 text-xs min-h-[40px] touch-manipulation rounded-lg">
              <Flame className="w-3.5 h-3.5" /> Popular
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1.5 text-xs min-h-[40px] touch-manipulation rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" /> Trending
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1.5 text-xs min-h-[40px] touch-manipulation rounded-lg">
              <Users className="w-3.5 h-3.5" /> Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Be the first to share something with the community!</p>
          <Button onClick={() => navigate("/community/create")}>
            <Plus className="w-4 h-4 mr-2" /> Create Post
          </Button>
        </div>
      )}

      {/* Posts */}
      <div className="divide-y divide-border/60">
        {posts.map((post) => (
          <article key={post.id} className="px-4 py-4">
            {/* Author */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer touch-manipulation" onClick={() => navigate(`/community/user/${post.user_id}`)}>
                <AvatarImage src={post.profile?.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                  {getInitials(post.profile?.display_name || post.profile?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">
                    {post.profile?.display_name || post.profile?.username || "Anonymous"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTimestamp(post.created_at)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-foreground mb-2">{post.content}</p>
            
            {/* Hashtags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-primary">#{tag}</span>
                ))}
              </div>
            )}

            {/* Media */}
            {post.post_type === "workout" && post.workout_data && (
              <Card className="p-4 mb-3 bg-muted/30">
                <div className="flex items-center gap-4">
                  {post.workout_data.duration && (
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/80 text-white px-2 py-0.5 rounded text-xs">{post.workout_data.duration}</span>
                      <span className="text-xs text-muted-foreground">Minutes</span>
                    </div>
                  )}
                  {post.workout_data.calories && (
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/80 text-white px-2 py-0.5 rounded text-xs">🔥 {post.workout_data.calories}</span>
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {post.image_url && (
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
              </div>
            )}

            {post.post_type === "poll" && post.poll_options && (
              <Card className="p-4 mb-3 bg-muted/30">
                <div className="space-y-2">
                  {post.poll_options.options.map((option, idx) => {
                    const totalVotes = post.poll_options!.votes.reduce((a, b) => a + b, 0);
                    const percentage = totalVotes > 0 ? Math.round((post.poll_options!.votes[idx] / totalVotes) * 100) : 0;
                    return (
                      <div key={idx} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{option}</span>
                          <span className="text-xs text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {post.poll_options.votes.reduce((a, b) => a + b, 0)} votes
                </p>
              </Card>
            )}

            {post.post_type === "before-after" && (post.before_image_url || post.after_image_url) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {post.before_image_url && (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={post.before_image_url} alt="Before" className="w-full aspect-[3/4] object-cover" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Before</span>
                  </div>
                )}
                {post.after_image_url && (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={post.after_image_url} alt="After" className="w-full aspect-[3/4] object-cover" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">After</span>
                  </div>
                )}
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3 sm:gap-4">
                <button 
                  className={`flex items-center gap-1 hover:text-primary transition-colors min-h-[44px] min-w-[44px] touch-manipulation ${post.is_liked ? "text-red-500" : ""}`}
                  onClick={() => handleLike(post)}
                  disabled={likingPosts.includes(post.id)}
                >
                  <Heart className={`w-5 h-5 sm:w-4 sm:h-4 ${post.is_liked ? "fill-current" : ""}`} /> 
                  <span className="text-xs">{formatNumber(post.likes_count)}</span>
                </button>
                <button 
                  className="flex items-center gap-1 hover:text-primary min-h-[44px] min-w-[44px] touch-manipulation"
                  onClick={() => navigate(`/community/post/${post.id}/comments`)}
                >
                  <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="text-xs">{post.comments_count}</span>
                </button>
              </div>
              <button 
                className={`flex items-center min-h-[44px] touch-manipulation hover:text-primary ${savedPosts.includes(post.id) ? "text-primary" : ""}`}
                onClick={() => toggleSave(post.id)}
              >
                <Bookmark className={`w-5 h-5 sm:w-4 sm:h-4 ${savedPosts.includes(post.id) ? "fill-current" : ""}`} />
                <span className="ml-1 text-xs">Save</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CommunityFeed;
