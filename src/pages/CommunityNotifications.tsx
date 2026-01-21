import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CommunityNotification {
  id: string;
  type: "like" | "trending" | "message" | "follow";
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  additionalUsers?: number;
  timestamp: string;
  isRead: boolean;
}

const mockNotifications: CommunityNotification[] = [
  {
    id: "1",
    type: "like",
    user: { name: "Lyenne Branch", avatar: "" },
    content: "liked your post",
    additionalUsers: 3,
    timestamp: "5d ago",
    isRead: true
  },
  {
    id: "2",
    type: "trending",
    user: { name: "Lyenne Branch", avatar: "" },
    content: "liked your post",
    additionalUsers: 3,
    timestamp: "5d ago",
    isRead: true
  },
  {
    id: "3",
    type: "message",
    user: { name: "Lyenne Branch", avatar: "" },
    content: "liked your post",
    additionalUsers: 3,
    timestamp: "5d ago",
    isRead: true
  },
  {
    id: "4",
    type: "follow",
    user: { name: "Lyenne Branch", avatar: "" },
    content: "liked your post",
    additionalUsers: 3,
    timestamp: "5d ago",
    isRead: true
  },
];

const CommunityNotifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("read");
  const [notifications, setNotifications] = useState(mockNotifications);

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case "like": return "Someone liked your post.";
      case "trending": return "Your post is trending!";
      case "message": return "Someone messaged you";
      case "follow": return "Someone followed you";
      default: return "Notification";
    }
  };

  const readNotifications = notifications.filter(n => n.isRead);
  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Community Notification</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-muted">?</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-muted/30">
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>

          <TabsContent value="read" className="mt-4 space-y-4">
            {readNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={notification.user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {notification.user.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{getNotificationTitle(notification.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.user.name}
                    {notification.additionalUsers && notification.additionalUsers > 0 && (
                      <> and {notification.additionalUsers} others</>
                    )}{" "}
                    {notification.content}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="unread" className="mt-4 space-y-4">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No unread notifications</p>
              </div>
            ) : (
              unreadNotifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={notification.user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {notification.user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{getNotificationTitle(notification.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.user.name}
                      {notification.additionalUsers && notification.additionalUsers > 0 && (
                        <> and {notification.additionalUsers} others</>
                      )}{" "}
                      {notification.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommunityNotifications;
