import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Bell,
  Dumbbell,
  Moon,
  Droplets,
  Utensils,
  User,
  Check,
  Trash2
} from "lucide-react";

interface Notification {
  id: string;
  type: "workout" | "sleep" | "hydration" | "nutrition" | "coaching";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "workout",
    title: "Time for Your Workout!",
    message: "Your scheduled HIIT session starts in 30 minutes",
    time: "30 min ago",
    read: false,
  },
  {
    id: "2",
    type: "sleep",
    title: "Bedtime Reminder",
    message: "It's almost your bedtime. Start winding down for better sleep",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "hydration",
    title: "Stay Hydrated!",
    message: "You're 2 glasses behind your daily water goal",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "4",
    type: "nutrition",
    title: "Log Your Lunch",
    message: "Don't forget to log your midday meal",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "coaching",
    title: "Coach Session Tomorrow",
    message: "You have a session with Coach Sarah at 10:00 AM",
    time: "5 hours ago",
    read: true,
  },
  {
    id: "6",
    type: "workout",
    title: "Great Workout Yesterday!",
    message: "You burned 450 calories in your strength training session",
    time: "1 day ago",
    read: true,
  },
];

const getIcon = (type: Notification["type"]) => {
  switch (type) {
    case "workout":
      return <Dumbbell className="w-5 h-5" />;
    case "sleep":
      return <Moon className="w-5 h-5" />;
    case "hydration":
      return <Droplets className="w-5 h-5" />;
    case "nutrition":
      return <Utensils className="w-5 h-5" />;
    case "coaching":
      return <User className="w-5 h-5" />;
  }
};

const getIconBg = (type: Notification["type"]) => {
  switch (type) {
    case "workout":
      return "bg-primary/10 text-primary";
    case "sleep":
      return "bg-blue-500/10 text-blue-500";
    case "hydration":
      return "bg-cyan-500/10 text-cyan-500";
    case "nutrition":
      return "bg-green-500/10 text-green-500";
    case "coaching":
      return "bg-purple-500/10 text-purple-500";
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <div
      className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${
        notification.read ? "bg-secondary/50" : "bg-card border border-border"
      }`}
    >
      <div className={`p-3 rounded-xl ${getIconBg(notification.type)}`}>
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {notification.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <span className="text-xs text-muted-foreground mt-1 block">
              {notification.time}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => markAsRead(notification.id)}
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => deleteNotification(notification.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ type }: { type: "unread" | "read" }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Bell className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        {type === "unread" ? "All Caught Up!" : "No Read Notifications"}
      </h3>
      <p className="text-muted-foreground text-sm max-w-[250px]">
        {type === "unread"
          ? "You've read all your notifications. Check back later!"
          : "Notifications you've read will appear here"}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Notifications</h1>
            </div>
            {unreadNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary font-medium"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="unread" className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-xl p-1">
              <TabsTrigger
                value="unread"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Unread ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger
                value="read"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="unread" className="mt-0 p-4 space-y-3">
            {unreadNotifications.length > 0 ? (
              unreadNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))
            ) : (
              <EmptyState type="unread" />
            )}
          </TabsContent>

          <TabsContent value="read" className="mt-0 p-4 space-y-3">
            {readNotifications.length > 0 ? (
              readNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))
            ) : (
              <EmptyState type="read" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notifications;
