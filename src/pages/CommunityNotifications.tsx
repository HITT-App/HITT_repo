import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Check, Loader2, Heart, UserPlus, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityNotifications, CommunityNotification } from "@/hooks/useCommunityNotifications";
import { formatDistanceToNow } from "date-fns";

const CommunityNotifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    unreadCount 
  } = useCommunityNotifications();

  const readNotifications = notifications.filter(n => n.is_read);
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
      case "comment_like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-primary" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <TrendingUp className="w-4 h-4 text-primary" />;
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case "like": return "liked your post";
      case "comment_like": return "liked your comment";
      case "follow": return "started following you";
      case "comment": return "commented on your post";
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

    if (notification.type === "follow") {
      navigate(`/community/user/${notification.actor_id}`);
    } else if (notification.post_id) {
      navigate(`/community/post/${notification.post_id}/comments`);
    }
  };

  const renderNotification = (notification: CommunityNotification) => (
    <div 
      key={notification.id} 
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notification.is_read ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"
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
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
          {getNotificationIcon(notification.type)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {notification.actor?.display_name || notification.actor?.username || "Someone"}{" "}
          <span className="font-normal text-muted-foreground">
            {getNotificationTitle(notification.type)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTimestamp(notification.created_at)} ago
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Community Notifications</h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="icon" onClick={markAllAsRead}>
              <Check className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="p-4">
        <Tabs defaultValue={unreadCount > 0 ? "unread" : "read"}>
          <TabsList className="w-full grid grid-cols-2 bg-muted/30">
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-4 space-y-2">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No unread notifications</p>
                <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              unreadNotifications.map(renderNotification)
            )}
          </TabsContent>

          <TabsContent value="read" className="mt-4 space-y-2">
            {readNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              readNotifications.map(renderNotification)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommunityNotifications;
