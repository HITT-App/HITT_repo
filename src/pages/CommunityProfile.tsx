import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Settings, UserPlus, UserCheck, UserMinus, MessageSquare,
  Calendar, Heart, Loader2, ImageIcon, Pencil, Lock, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityProfile, useCommunityActions } from "@/hooks/useCommunity";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ReportSheet } from "@/components/community/ReportSheet";
import { storageImage, IMG } from "@/lib/storage-image";

const presetAvatar = (seed: string | null | undefined) => {
  const s = seed || '';
  const idx = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 12;
  return `/avatars/avatar-${String(idx + 1).padStart(2, '0')}.jpg`;
};

const CommunityProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  const { profile, loading: profileLoading } = useCommunityProfile(targetUserId);
  const { followUser, unfollowUser } = useCommunityActions();
  const { friendStatus, friendCount, loading: friendLoading, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriends(targetUserId);

  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (profile) setIsFollowing(!!profile.is_following);
  }, [profile]);

  // Private-account gate: if the target has ticked "Private" in their
  // profile and the viewer isn't them, don't render their content.
  // Matches the "not discoverable" contract we set in search + browse.
  const isBlockedByPrivacy = !!profile?.is_private && !isOwnProfile;

  useEffect(() => {
    if (!targetUserId || isBlockedByPrivacy) return;
    const fetchPosts = async () => {
      setPostsLoading(true);
      const { data } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      setPosts(data || []);
      setPostsLoading(false);
    };
    fetchPosts();
  }, [targetUserId, isBlockedByPrivacy]);

  const handleFollow = async () => {
    if (!targetUserId) return;
    if (isFollowing) {
      const success = await unfollowUser(targetUserId);
      if (success) setIsFollowing(false);
    } else {
      const success = await followUser(targetUserId);
      if (success) setIsFollowing(true);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatNumber = (num: number | null | undefined) => {
    const n = num || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Full-screen private-account gate. Renders instead of the profile
  // when the target has ticked Private and the viewer isn't them.
  if (isBlockedByPrivacy) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background text-foreground">
        <header className="shrink-0 flex items-center gap-3 px-4"
          style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}>
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">This profile is private</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              The person you're looking for has kept their account private.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.display_name || profile?.username || "User";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto pb-24">
      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden">
        {profile?.banner_url ? (
          <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/15" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-background/70 backdrop-blur-md rounded-full h-9 w-9 border border-border/50"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-background/70 backdrop-blur-md rounded-full h-9 w-9 border border-border/50"
            onClick={() => navigate("/profile")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Avatar */}
      <div className="px-5 -mt-14 relative z-10">
        <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-2 ring-border/30">
          <AvatarImage src={profile?.avatar_url || presetAvatar(displayName)} className="object-cover" />
          <AvatarFallback className="bg-muted" />
        </Avatar>
      </div>

      {/* Name & Info */}
      <div className="px-5 mt-3 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
        {profile?.username && (
          <p className="text-sm text-primary/80 font-medium">@{profile.username}</p>
        )}
        {profile?.bio && (
          <p className="text-sm text-foreground/80 leading-relaxed pt-1 whitespace-pre-line">{profile.bio}</p>
        )}
        {memberSince && (
          <div className="flex items-center gap-1.5 pt-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Joined {memberSince}</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="px-5 mt-5">
        <div className="flex rounded-xl bg-secondary/50 border border-border/40 divide-x divide-border/40">
          {[
            { label: 'Posts', value: profile?.posts_count },
            { label: 'Followers', value: profile?.followers_count },
            { label: 'Following', value: profile?.following_count },
            { label: 'Friends', value: friendCount },
          ].map((s) => (
            <div key={s.label} className="flex-1 py-3.5 text-center">
              <p className="text-lg font-bold text-foreground">{formatNumber(s.value)}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 mt-4 flex gap-2">
        {isOwnProfile ? (
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2 h-11 font-medium"
            onClick={() => navigate("/profile")}
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </Button>
        ) : (
          <>
            <Button
              variant={isFollowing ? "outline" : "default"}
              className="flex-1 rounded-xl gap-2 h-11 font-medium"
              onClick={handleFollow}
            >
              {isFollowing ? (
                <><UserCheck className="w-4 h-4" /> Following</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Follow</>
              )}
            </Button>

            {friendStatus === 'none' && (
              <Button
                variant="outline"
                className="rounded-xl gap-2 h-11 font-medium"
                onClick={sendRequest}
                disabled={friendLoading}
              >
                <UserPlus className="w-4 h-4" /> Add Friend
              </Button>
            )}
            {friendStatus === 'pending_sent' && (
              <Button variant="outline" className="rounded-xl h-11" disabled>
                Request Sent
              </Button>
            )}
            {friendStatus === 'pending_received' && (
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  className="rounded-xl h-11"
                  onClick={() => acceptRequest()}
                  disabled={friendLoading}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-11"
                  onClick={() => declineRequest()}
                  disabled={friendLoading}
                >
                  Decline
                </Button>
              </div>
            )}
            {friendStatus === 'accepted' && (
              <Button
                variant="secondary"
                className="rounded-xl gap-2 h-11 font-medium"
                onClick={removeFriend}
                disabled={friendLoading}
              >
                <UserMinus className="w-4 h-4" /> Friends
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl shrink-0 h-11 w-11"
              onClick={() => navigate(`/community/chat/${targetUserId}`)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl shrink-0 h-11 w-11"
              onClick={() => setReportOpen(true)}
              aria-label="Report user"
            >
              <Flag className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="mt-6">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 px-5">
          <TabsTrigger
            value="posts"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-medium"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-medium"
          >
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-5 pt-4 space-y-3">
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {isOwnProfile ? "You haven't posted yet" : "No posts yet"}
              </p>
              {isOwnProfile && (
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => navigate("/community/create")}
                >
                  Create your first post
                </Button>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className="p-4 cursor-pointer hover:bg-secondary/40 transition-colors border-border/50"
                onClick={() => navigate(`/community/post/${post.id}/comments`)}
              >
                <p className="text-sm line-clamp-3 text-foreground/90">{post.content}</p>
                {post.image_url && (
                  <img
                    src={storageImage(post.image_url, IMG.card)}
                    alt=""
                    className="mt-3 rounded-xl w-full aspect-video object-cover"
                    loading="lazy"
                  />
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {post.likes_count || 0}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-0 px-5 pt-4">
          <Card className="p-5 space-y-5 border-border/50">
            {profile?.bio && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bio</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/60 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-foreground">{formatNumber(profile?.likes_received)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Likes Received</p>
                </div>
                <div className="bg-secondary/60 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-foreground">{formatNumber(profile?.posts_count)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Posts</p>
                </div>
              </div>
            </div>
            {memberSince && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Member Since</h3>
                <p className="text-sm text-foreground/80">{memberSince}</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Report user dialog */}
      {!isOwnProfile && targetUserId && (
        <ReportSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentType="profile"
          contentId={targetUserId}
          reportedUserId={targetUserId}
        />
      )}
    </div>
  );
};

export default CommunityProfile;
