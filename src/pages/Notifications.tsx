import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, Loader2, Heart, UserPlus, MessageCircle,
  TrendingUp, UserCheck, X, Users, Dumbbell, Moon, Droplets, Utensils, User, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityNotifications, CommunityNotification } from "@/hooks/useCommunityNotifications";
import { REACTION_EMOJIS, ReactionType } from "@/hooks/useReactions";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const FriendRequestActions = ({ notification }: { notification: CommunityNotification }) => {
  const { user } = useAuth();
  const [handled, setHandled] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase
      .from('user_friends')
      .select('id')
      .eq('user_id', notification.actor_id)
      .eq('friend_id', user?.id || '')
      .eq('status', 'pending')
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from('user_friends')
        .update({ status: 'accepted' })
        .eq('id', data[0].id);
      setAccepted(true);
    }
    setHandled(true);
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase
      .from('user_friends')
      .select('id')
      .eq('user_id', notification.actor_id)
      .eq('friend_id', user?.id || '')
      .eq('status', 'pending')
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from('user_friends')
        .delete()
        .eq('id', data[0].id);
    }
    setHandled(true);
  };

  if (handled) {
    return (
      <span className="text-xs text-muted-foreground">
        {accepted ? 'Accepted ✓' : 'Declined'}
      </span>
    );
  }

  return (
    <div className="flex gap-1.5 mt-2">
      <Button size="sm" className="h-8 rounded-lg text-xs px-4" onClick={handleAccept}>
        Accept
      </Button>
      <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs px-3" onClick={handleDecline}>
        Decline
      </Button>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useCommunityNotifications();

  useEffect(() => {
    const timer = setTimeout(() => {
      markAllAsRead();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const readNotifications = notifications.filter(n => n.is_read);
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const getNotificationIcon = (type: string, metadata?: any) => {
    switch (type) {
      case "like":
      case "comment_like": {
        const reactionType = metadata?.reaction_type as ReactionType | undefined;
        if (reactionType && REACTION_EMOJIS[reactionType]) {
          return <span className="text-sm">{REACTION_EMOJIS[reactionType]}</span>;
        }
        return <Heart className="w-4 h-4 text-red-500" />;
      }
      case "follow":
        return <UserPlus className="w-4 h-4 text-primary" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "friend_request":
        return <Users className="w-4 h-4 text-primary" />;
      case "friend_accept":
        return <UserCheck className="w-4 h-4 text-green-500" />;
      default:
        return <TrendingUp className="w-4 h-4 text-primary" />;
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case "like": return "reacted to your post";
      case "comment_like": return "liked your comment";
      case "follow": return "started following you";
      case "comment": return "commented on your post";
      case "friend_request": return "sent you a friend request";
      case "friend_accept": return "accepted your friend request";
      default: return "interacted with you";
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return "recently";
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleNotificationClick = async (notification: CommunityNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.type === "follow" || notification.type === "friend_request" || notification.type === "friend_accept") {
      navigate(`/community/user/${notification.actor_id}`);
    } else if (notification.post_id) {
      navigate(`/community/post/${notification.post_id}/comments`);
    }
  };

  const renderNotification = (notification: CommunityNotification) => (
    <div
      key={notification.id}
      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        notification.is_read ? "hover:bg-muted/50" : "bg-muted/40 hover:bg-muted/60 border border-border/50"
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={notification.actor?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(notification.actor?.display_name || notification.actor?.username)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm">
          {getNotificationIcon(notification.type, notification.metadata)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {notification.actor?.display_name || notification.actor?.username || "Someone"}{" "}
          <span className="font-normal text-muted-foreground">
            {getNotificationTitle(notification.type)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatTimestamp(notification.created_at)} ago
        </p>

        {notification.type === 'friend_request' && !notification.is_read && (
          <FriendRequestActions notification={notification} />
        )}
      </div>
      {!notification.is_read && notification.type !== 'friend_request' && (
        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shrink-0" />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Notifications</h1>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="icon" onClick={markAllAsRead} className="rounded-full">
              <Check className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        <Tabs defaultValue={unreadCount > 0 ? "unread" : "all"}>
          <TabsList className="w-full grid grid-cols-2 bg-muted/30">
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-4 space-y-1">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">No new notifications</p>
              </div>
            ) : (
              unreadNotifications.map(renderNotification)
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-1">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(renderNotification)
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
};

export default Notifications;
