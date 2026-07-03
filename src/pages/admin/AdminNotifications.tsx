import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, History, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  topic: string | null;
  target_type: string;
  target_value: string | null;
  success_count: number;
  failure_count: number;
  sent_at: string;
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [topic, setTopic] = useState("");
  const [targetType, setTargetType] = useState<"all" | "topic" | "user">("all");
  const [targetValue, setTargetValue] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("push_notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and body are required",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          title,
          body,
          url,
          topic: topic || undefined,
          targetType,
          targetValue: targetType !== "all" ? targetValue : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Notification Sent!",
        description: `Successfully sent to ${data.sent} users (${data.failed} failed)`,
      });

      // Reset form
      setTitle("");
      setBody("");
      setUrl("/");
      setTopic("");
      setTargetType("all");
      setTargetValue("");

      // Reload history
      loadHistory();
    } catch (error: any) {
      console.error("Send error:", error);
      toast({
        title: "Failed to Send",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 4px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Push Notifications</h1>
              <p className="text-xs text-muted-foreground">Send and manage notifications</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Tabs defaultValue="compose">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Push Notification</CardTitle>
                <CardDescription>
                  Compose and send notifications to your users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Notification title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/50</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    id="body"
                    placeholder="Notification message"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">{body.length}/200</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Action URL</Label>
                  <Input
                    id="url"
                    placeholder="/"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where users go when they tap the notification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (Optional)</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workout">Workout</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="coaching">Coaching</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetType} onValueChange={(v: "all" | "topic" | "user") => setTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Users
                        </div>
                      </SelectItem>
                      <SelectItem value="topic">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          By Topic Preference
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Specific User
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetType === "topic" && (
                  <div className="space-y-2">
                    <Label htmlFor="target-topic">Filter by Topic</Label>
                    <Select value={targetValue} onValueChange={setTargetValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workout">Workout Subscribers</SelectItem>
                        <SelectItem value="nutrition">Nutrition Subscribers</SelectItem>
                        <SelectItem value="coaching">Coaching Subscribers</SelectItem>
                        <SelectItem value="community">Community Subscribers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === "user" && (
                  <div className="space-y-2">
                    <Label htmlFor="user-id">User ID</Label>
                    <Input
                      id="user-id"
                      placeholder="Enter user ID"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleSend} 
                  disabled={sending || !title.trim() || !body.trim()}
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>
                  Previously sent notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications sent yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((notif) => (
                      <div key={notif.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{notif.title}</h4>
                            <p className="text-sm text-muted-foreground">{notif.body}</p>
                          </div>
                          <Badge variant={notif.target_type === "all" ? "default" : "secondary"}>
                            {notif.target_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>✓ {notif.success_count} sent</span>
                          {notif.failure_count > 0 && (
                            <span className="text-destructive">✗ {notif.failure_count} failed</span>
                          )}
                          <span>{formatDistanceToNow(new Date(notif.sent_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
