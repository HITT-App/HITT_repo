import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { HEmoji } from "@/components/HEmoji";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Heart, MessageCircle, Bookmark, MoreHorizontal,
  Flame, Users, TrendingUp, Loader2, Share2, Sparkles,
  Send, Pencil, Trash2, EyeOff, Bell, Trophy, Ban,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommunityPosts, useCommunityActions, CommunityPost } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCommunityProfile } from "@/hooks/useCommunity";
import { useSavedPosts, useBlockedUsers } from "@/hooks/useCommunityExtras";
import { useReactions, ReactionType } from "@/hooks/useReactions";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
import { useStories } from "@/hooks/useStories";
import { ReactionPicker } from "@/components/community/ReactionPicker";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DeletePostDialog from "@/components/community/DeletePostDialog";

const CommunityFeed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("popular");
  const { posts, loading, loadingMore, hasMore, loadMore, refetch } = useCommunityPosts();
  const { likePost, unlikePost, deletePost, castVote } = useCommunityActions();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { profile: communityProfile } = useCommunityProfile();
  const { isPostSaved, savePost, unsavePost } = useSavedPosts();
  const { blockedUsers, blockUser } = useBlockedUsers();
  const { unreadCount } = useCommunityNotifications();
  const { storyGroups } = useStories();
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [likingPosts, setLikingPosts] = useState<string[]>([]);
  const [likeAnimations, setLikeAnimations] = useState<string[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ userId: string; displayName: string } | null>(null);
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, { is_liked: boolean; likes_count: number }>>({});
  // postId -> the option index the user voted for (set from DB on mount, then optimistically on click).
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  // postId -> local vote-count array, applied on top of post.poll_options.votes for immediate UI feedback.
  const [optimisticPollCounts, setOptimisticPollCounts] = useState<Record<string, number[]>>({});
  const [votingPosts, setVotingPosts] = useState<string[]>([]);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Reactions hook
  const postIds = useMemo(() => posts.map(p => p.id), [posts]);
  const { reactions, react: reactToPost } = useReactions(postIds);

  // Fetch following list for "Following" tab
  useEffect(() => {
    if (!user) return;
    const fetchFollowing = async () => {
      const { data } = await supabase
        .from('community_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      setFollowingIds(new Set(data?.map(f => f.following_id) || []));
    };
    fetchFollowing();
  }, [user]);

  // Fetch user's poll votes for any polls in the current feed
  useEffect(() => {
    if (!user) return;
    const pollIds = posts.filter(p => p.post_type === 'poll').map(p => p.id);
    if (pollIds.length === 0) return;
    const fetchVotes = async () => {
      const { data } = await supabase
        .from('community_poll_votes')
        .select('post_id, option_index')
        .eq('user_id', user.id)
        .in('post_id', pollIds);
      if (data && data.length > 0) {
        setPollVotes(prev => {
          const next = { ...prev };
          for (const v of data) next[v.post_id] = v.option_index;
          return next;
        });
      }
    };
    fetchVotes();
  }, [user, posts]);

  // Infinite scroll: trigger loadMore when the sentinel enters the viewport
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Tab filtering — also exclude posts from users the current user has blocked.
  const blockedUserIds = useMemo(
    () => new Set(blockedUsers.map(b => b.blocked_id)),
    [blockedUsers],
  );
  const filteredPosts = useMemo(() => {
    let result = posts.filter(
      (p) => !hiddenPosts.includes(p.id) && !blockedUserIds.has(p.user_id),
    );
    if (activeTab === "trending") {
      result = [...result].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (activeTab === "following") {
      result = result.filter((p) => followingIds.has(p.user_id));
    }
    return result;
  }, [posts, hiddenPosts, blockedUserIds, activeTab, followingIds]);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const success = await deletePost(pendingDeleteId);
    if (success) refetch();
    setPendingDeleteId(null);
  };

  const handleHidePost = (postId: string) => {
    setHiddenPosts((prev) => [...prev, postId]);
  };

  const handleConfirmBlock = async () => {
    if (!pendingBlock) return;
    await blockUser(pendingBlock.userId);
    setPendingBlock(null);
  };

  const myDisplayName = communityProfile?.display_name || profile?.display_name || user?.email || "";
  const presetAvatar = (seed: string | null | undefined) => {
    const s = seed || '';
    const idx = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 12;
    return `/avatars/avatar-${String(idx + 1).padStart(2, '0')}.jpg`;
  };
  const myAvatarUrl = communityProfile?.avatar_url || profile?.avatar_url || presetAvatar(myDisplayName);

  const tabs = [
    { key: "popular", label: "For You", icon: Sparkles },
    { key: "trending", label: "Trending", icon: Flame },
    { key: "following", label: "Following", icon: Users },
  ];

  const toggleSave = async (postId: string) => {
    if (!user) { navigate("/auth"); return; }
    if (isPostSaved(postId)) {
      await unsavePost(postId);
    } else {
      await savePost(postId);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!user) { navigate("/auth"); return; }
    if (likingPosts.includes(post.id)) return;

    setLikingPosts((prev) => [...prev, post.id]);

    const currentIsLiked = optimisticLikes[post.id]?.is_liked ?? post.is_liked;
    const currentCount = optimisticLikes[post.id]?.likes_count ?? post.likes_count;

    // Optimistic update
    const newIsLiked = !currentIsLiked;
    const newCount = newIsLiked ? currentCount + 1 : currentCount - 1;
    setOptimisticLikes((prev) => ({ ...prev, [post.id]: { is_liked: newIsLiked, likes_count: newCount } }));

    if (!currentIsLiked) {
      setLikeAnimations((prev) => [...prev, post.id]);
      setTimeout(() => setLikeAnimations((prev) => prev.filter((id) => id !== post.id)), 600);
    }

    const success = currentIsLiked ? await unlikePost(post.id) : await likePost(post.id);

    if (!success) {
      // Revert on failure
      setOptimisticLikes((prev) => ({ ...prev, [post.id]: { is_liked: currentIsLiked!, likes_count: currentCount } }));
    }

    setLikingPosts((prev) => prev.filter((id) => id !== post.id));
  };

  const handleVote = async (post: CommunityPost, optionIndex: number) => {
    if (!user) { navigate("/auth"); return; }
    if (pollVotes[post.id] !== undefined) return; // already voted
    if (votingPosts.includes(post.id)) return;
    if (!post.poll_options) return;

    setVotingPosts(prev => [...prev, post.id]);

    // Optimistic: mark this option as the user's vote and bump its count.
    const baseVotes = post.poll_options.votes;
    const nextCounts = baseVotes.slice();
    nextCounts[optionIndex] = (nextCounts[optionIndex] || 0) + 1;
    setOptimisticPollCounts(prev => ({ ...prev, [post.id]: nextCounts }));
    setPollVotes(prev => ({ ...prev, [post.id]: optionIndex }));

    const success = await castVote(post.id, optionIndex);

    if (!success) {
      // Revert
      setOptimisticPollCounts(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setPollVotes(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    }

    setVotingPosts(prev => prev.filter(id => id !== post.id));
  };

  const handleDoubleTapLike = (post: CommunityPost) => {
    const currentIsLiked = optimisticLikes[post.id]?.is_liked ?? post.is_liked;
    if (!currentIsLiked) handleLike(post);
  };

  const handleShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community/post/${post.id}/comments`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Check out this post", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Post link copied to clipboard" });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "now";
      if (diffMin < 60) return `${diffMin}m`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH}h`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return `${diffD}d`;
      return formatDistanceToNow(d, { addSuffix: false });
    } catch {
      return "now";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const shouldTruncate = (content: string) => content.length > 180;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-4 overflow-x-hidden">
      {/* Sticky header */}
      <header className="sticky top-0 bg-background/90 backdrop-blur-sm z-20 border-b border-border/40" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 0px)" }}>
        {/* Top row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <Avatar
              className="w-9 h-9 ring-2 ring-primary/20 cursor-pointer touch-manipulation"
              onClick={() => navigate("/profile")}
            >
              <AvatarImage src={myAvatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getInitials(myDisplayName)}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-lg font-bold tracking-tight">Feed</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full touch-manipulation"
              onClick={() => navigate("/community/chatroom")}
              aria-label="Chat"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full touch-manipulation"
              onClick={() => navigate("/leaderboard")}
              aria-label="Leaderboard"
            >
              <Trophy className="w-[18px] h-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full touch-manipulation relative"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full touch-manipulation"
              onClick={() => navigate("/community/search")}
            >
              <Search className="w-[18px] h-[18px]" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 rounded-full touch-manipulation"
              onClick={() => navigate("/community/create")}
            >
              <Plus className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-manipulation",
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Stories row */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Add Story button */}
        <button
          onClick={() => navigate("/community/create-story")}
          className="flex flex-col items-center gap-1 shrink-0 touch-manipulation"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Your Story</span>
        </button>

        {/* Real stories from database */}
        {storyGroups.map((group) => {
          const isOwn = group.user_id === user?.id;
          return (
            <button
              key={`story-${group.user_id}`}
              onClick={() => navigate(`/community/story/${group.user_id}`)}
              className="flex flex-col items-center gap-1 shrink-0 touch-manipulation"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl p-[2px]",
                group.has_unviewed
                  ? "bg-gradient-to-br from-primary to-orange-500"
                  : "bg-gradient-to-br from-muted to-muted-foreground/20"
              )}>
                <Avatar className="w-full h-full rounded-[14px]">
                  <AvatarImage src={group.profile?.avatar_url || ""} className="rounded-[14px]" />
                  <AvatarFallback className="rounded-[14px] bg-secondary text-xs font-medium">
                    {(group.profile?.display_name || "U")[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground truncate w-16 text-center">
                {isOwn ? "Your Story" : group.profile?.display_name?.split(" ")[0] || "User"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Composer prompt */}
      <div
        className="mx-3 mb-3 flex items-center gap-3 bg-card rounded-2xl border border-border/40 px-3.5 py-3 cursor-pointer touch-manipulation active:scale-[0.99] transition-transform"
        onClick={() => navigate("/community/create")}
      >
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={myAvatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {getInitials(myDisplayName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground flex-1">What's on your mind?</span>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-bold mb-2">
            {activeTab === "following" ? "No posts from people you follow" : "Your feed is empty"}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-[260px]">
            {activeTab === "following"
              ? "Follow people to see their posts here!"
              : "Follow people or create your first post to get started!"}
          </p>
          <Button onClick={() => activeTab === "following" ? navigate("/community/search") : navigate("/community/create")} className="rounded-full px-6">
            {activeTab === "following" ? (
              <><Search className="w-4 h-4 mr-1.5" /> Find People</>
            ) : (
              <><Plus className="w-4 h-4 mr-1.5" /> Create Post</>
            )}
          </Button>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-2 px-3">
        {filteredPosts.map((post) => {
          const isExpanded = expandedPosts.includes(post.id);
          const truncate = shouldTruncate(post.content);
          const isSaved = isPostSaved(post.id);
          const isLikeAnimating = likeAnimations.includes(post.id);
          const postIsLiked = optimisticLikes[post.id]?.is_liked ?? post.is_liked;
          const postLikesCount = optimisticLikes[post.id]?.likes_count ?? post.likes_count;

          return (
            <article
              key={post.id}
              className="bg-card rounded-2xl border border-border/40 overflow-hidden"
            >
              {/* Author row */}
              <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
                <Avatar
                  className="w-10 h-10 cursor-pointer touch-manipulation ring-1 ring-border/40"
                  onClick={() => navigate(`/community/user/${post.user_id}`)}
                >
                  <AvatarImage src={post.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                    {getInitials(post.profile?.display_name || post.profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-semibold text-sm truncate cursor-pointer"
                      onClick={() => navigate(`/community/user/${post.user_id}`)}
                    >
                      {post.profile?.display_name || post.profile?.username || "Anonymous"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatTimestamp(post.created_at)}
                    </span>
                    {post.category && post.category !== "general" && (
                      <>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <span className="text-[10px] text-primary/70 font-medium capitalize">{post.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground touch-manipulation shrink-0"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {user && post.user_id === user.id ? (
                      <>
                        <DropdownMenuItem onClick={() => navigate(`/community/create?edit=${post.id}`)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setPendingDeleteId(post.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleHidePost(post.id)}>
                          <EyeOff className="w-4 h-4 mr-2" /> Hide
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setPendingBlock({
                            userId: post.user_id,
                            displayName: post.profile?.display_name || post.profile?.username || "this user",
                          })}
                        >
                          <Ban className="w-4 h-4 mr-2" /> Block user
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <div
                className="px-3.5 pb-2"
                onDoubleClick={() => handleDoubleTapLike(post)}
              >
                <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {truncate && !isExpanded ? post.content.slice(0, 180) + "..." : post.content}
                </p>
                {truncate && !isExpanded && (
                  <button
                    className="text-xs text-primary font-medium mt-0.5 touch-manipulation"
                    onClick={() => setExpandedPosts((prev) => [...prev, post.id])}
                  >
                    Read more
                  </button>
                )}
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3.5 pb-2.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] text-primary/80 font-medium bg-primary/5 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Media - Image */}
              {post.image_url && (
                <div
                  className="relative mx-3.5 mb-2.5 rounded-xl overflow-hidden"
                  onDoubleClick={() => handleDoubleTapLike(post)}
                >
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                  />
                  {isLikeAnimating && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg animate-ping" />
                    </div>
                  )}
                </div>
              )}

              {/* Workout card */}
              {post.post_type === "workout" && post.workout_data && (
                <div className="mx-3.5 mb-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-3.5 border border-primary/10">
                  <div className="flex items-center gap-4">
                    {post.workout_data.type && (
                      <span className="text-xs font-semibold text-primary capitalize">{post.workout_data.type}</span>
                    )}
                    {post.workout_data.duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{post.workout_data.duration}</span> min
                      </div>
                    )}
                    {post.workout_data.calories && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HEmoji name="streak" size={16} style={{verticalAlign:'middle'}}/> <span className="font-bold text-foreground">{post.workout_data.calories}</span> kcal
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Poll */}
              {post.post_type === "poll" && post.poll_options && (() => {
                const votesArr = optimisticPollCounts[post.id] ?? post.poll_options.votes;
                const totalVotes = votesArr.reduce((a, b) => a + b, 0);
                const myVote = pollVotes[post.id];
                const hasVoted = myVote !== undefined;
                const isVoting = votingPosts.includes(post.id);
                return (
                  <div className="mx-3.5 mb-2.5 space-y-2">
                    {post.poll_options.options.map((option, idx) => {
                      const pct = totalVotes > 0 ? Math.round((votesArr[idx] / totalVotes) * 100) : 0;
                      const isMine = myVote === idx;
                      return (
                        <button
                          key={idx}
                          disabled={hasVoted || isVoting}
                          onClick={(e) => { e.stopPropagation(); handleVote(post, idx); }}
                          className={cn(
                            "w-full relative rounded-xl border overflow-hidden text-left p-3 touch-manipulation transition-colors",
                            isMine ? "border-primary/60 ring-1 ring-primary/30" : "border-border/60",
                            !hasVoted && !isVoting && "hover:border-primary/30 cursor-pointer",
                            (hasVoted || isVoting) && "cursor-default",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-xl transition-all",
                              isMine ? "bg-primary/20" : "bg-primary/8",
                            )}
                            style={{ width: hasVoted ? `${pct}%` : "0%" }}
                          />
                          <div className="relative flex justify-between items-center">
                            <span className="text-sm font-medium">{option}</span>
                            {hasVoted && (
                              <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    <p className="text-[11px] text-muted-foreground px-1">
                      {totalVotes} vote{totalVotes === 1 ? "" : "s"}{hasVoted ? " · You voted" : ""}
                    </p>
                  </div>
                );
              })()}

              {/* Before/After */}
              {post.post_type === "before-after" && (post.before_image_url || post.after_image_url) && (
                <div className="grid grid-cols-2 gap-1.5 mx-3.5 mb-2.5">
                  {post.before_image_url && (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={post.before_image_url} alt="Before" className="w-full aspect-[3/4] object-cover" loading="lazy" />
                      <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded-full">Before</span>
                    </div>
                  )}
                  {post.after_image_url && (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={post.after_image_url} alt="After" className="w-full aspect-[3/4] object-cover" loading="lazy" />
                      <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">After</span>
                    </div>
                  )}
                </div>
              )}

              {/* Engagement bar */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-border/30">
                <div className="flex items-center gap-1">
                  {/* Reactions */}
                  <ReactionPicker
                    userReaction={reactions[post.id]?.userReaction || null}
                    counts={reactions[post.id]?.counts || {}}
                    total={reactions[post.id]?.total || postLikesCount}
                    onReact={(type: ReactionType) => reactToPost(post.id, type)}
                    disabled={likingPosts.includes(post.id)}
                    formatNumber={formatNumber}
                  />

                  {/* Comment */}
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-muted-foreground hover:bg-secondary/60 transition-all touch-manipulation"
                    onClick={() => navigate(`/community/post/${post.id}/comments`)}
                  >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-xs font-semibold">{formatNumber(post.comments_count)}</span>
                  </button>

                  {/* Share */}
                  <button
                    className="flex items-center px-2.5 py-2 rounded-full text-muted-foreground hover:bg-secondary/60 transition-all touch-manipulation"
                    onClick={() => handleShare(post)}
                  >
                    <Share2 className="w-[18px] h-[18px]" />
                  </button>
                </div>

                {/* Save */}
                <button
                  className={cn(
                    "p-2 rounded-full transition-all touch-manipulation",
                    isSaved
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:bg-secondary/60"
                  )}
                  onClick={() => toggleSave(post.id)}
                >
                  <Bookmark className={cn("w-[18px] h-[18px]", isSaved && "fill-current")} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreSentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          You've reached the end
        </p>
      )}

      {/* Delete confirmation dialog */}
      <DeletePostDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        onConfirm={handleConfirmDelete}
      />

      {/* Block confirmation dialog */}
      <AlertDialog open={!!pendingBlock} onOpenChange={(open) => { if (!open) setPendingBlock(null); }}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Block {pendingBlock?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see their posts, comments or reactions. They won't be notified. You can unblock them anytime from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="w-full bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmBlock}
            >
              <Ban className="w-4 h-4 mr-2" /> Block
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommunityFeed;
