import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Settings, UserPlus, UserCheck, UserMinus, MessageSquare,
  Calendar, MapPin, Heart, MoreHorizontal, Loader2, ImageIcon, Pencil,
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
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (profile) setIsFollowing(!!profile.is_following);
  }, [profile]);

  useEffect(() => {
    if (!targetUserId) return;
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
  }, [targetUserId]);

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

  const displayName = profile?.display_name || profile?.username || "User";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover Photo */}
      <div className="relative h-44 bg-gradient-to-br from-primary/30 via-primary/10 to-secondary">
        {profile?.banner_url && (
          <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-background/60 backdrop-blur-sm rounded-full h-9 w-9"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-background/60 backdrop-blur-sm rounded-full h-9 w-9"
            onClick={() => navigate("/community/profile/settings")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="flex items-end gap-4">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-3">
          <h1 className="text-xl font-bold">{displayName}</h1>
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          {profile?.bio && (
            <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {memberSince && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Joined {memberSince}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(profile?.posts_count)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(profile?.followers_count)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(profile?.following_count)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(friendCount)}</p>
            <p className="text-xs text-muted-foreground">Friends</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <Button
              variant="outline"
              className="flex-1 rounded-xl gap-1.5"
              onClick={() => navigate("/community/profile/settings")}
            >
              <Pencil className="w-4 h-4" /> Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant={isFollowing ? "outline" : "default"}
                className="flex-1 rounded-xl gap-1.5"
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
                  className="rounded-xl gap-1.5"
                  onClick={sendRequest}
                  disabled={friendLoading}
                >
                  <UserPlus className="w-4 h-4" /> Add Friend
                </Button>
              )}
              {friendStatus === 'pending_sent' && (
                <Button variant="outline" className="rounded-xl" disabled>
                  Request Sent
                </Button>
              )}
              {friendStatus === 'pending_received' && (
                <div className="flex gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => acceptRequest()}
                    disabled={friendLoading}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
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
                  className="rounded-xl gap-1.5"
                  onClick={removeFriend}
                  disabled={friendLoading}
                >
                  <UserMinus className="w-4 h-4" /> Friends
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => navigate(`/community/chat/${targetUserId}`)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="mt-5 px-4">
        <Tabs defaultValue="posts">
          <TabsList className="w-full grid grid-cols-2 bg-muted/30">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-3 space-y-3">
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't posted yet" : "No posts yet"}
                </p>
                {isOwnProfile && (
                  <Button
                    variant="link"
                    className="mt-2"
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
                  className="p-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => navigate(`/community/post/${post.id}/comments`)}
                >
                  <p className="text-sm line-clamp-3">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="mt-2 rounded-lg w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
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

          <TabsContent value="about" className="mt-3">
            <Card className="p-4 space-y-4">
              {profile?.bio && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Bio</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold mb-1">Stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{formatNumber(profile?.likes_received)}</p>
                    <p className="text-xs text-muted-foreground">Likes Received</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{formatNumber(profile?.posts_count)}</p>
                    <p className="text-xs text-muted-foreground">Total Posts</p>
                  </div>
                </div>
              </div>
              {memberSince && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Member Since</h3>
                  <p className="text-sm text-muted-foreground">{memberSince}</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommunityProfile;
