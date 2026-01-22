import { useState, useEffect } from "react";
import { Bell, BellOff, Dumbbell, Utensils, Users, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NOTIFICATION_TOPICS = [
  { id: "workout", label: "Workout Reminders", description: "Get reminded about scheduled workouts", icon: Dumbbell },
  { id: "nutrition", label: "Nutrition Tips", description: "Daily nutrition tips and meal reminders", icon: Utensils },
  { id: "coaching", label: "Coaching Updates", description: "Updates from your coaches and sessions", icon: MessageSquare },
  { id: "community", label: "Community Activity", description: "Likes, comments, and follows", icon: Users },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe, updateTopics } = usePushNotifications();
  const [topics, setTopics] = useState<string[]>(["workout", "nutrition", "coaching", "community"]);
  const [saving, setSaving] = useState(false);

  // Load saved topics
  useEffect(() => {
    const loadTopics = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("push_subscriptions")
        .select("topics")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (data?.topics) {
        setTopics(data.topics);
      }
    };

    loadTopics();
  }, [user]);

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTopicToggle = async (topicId: string, enabled: boolean) => {
    const newTopics = enabled
      ? [...topics, topicId]
      : topics.filter(t => t !== topicId);
    
    setTopics(newTopics);
    setSaving(true);
    await updateTopics(newTopics);
    setSaving(false);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Notifications are blocked. Please enable them in your browser settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-base font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications even when the app is closed
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleTogglePush}
            disabled={loading}
          />
        </div>

        {/* Topic toggles */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-medium">Notification Types</Label>
            {NOTIFICATION_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <div key={topic.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label htmlFor={`topic-${topic.id}`} className="font-medium">
                        {topic.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`topic-${topic.id}`}
                    checked={topics.includes(topic.id)}
                    onCheckedChange={(checked) => handleTopicToggle(topic.id, checked)}
                    disabled={saving}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Enable button for new users */}
        {!isSubscribed && (
          <Button onClick={subscribe} disabled={loading} className="w-full">
            {loading ? "Enabling..." : "Enable Notifications"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
