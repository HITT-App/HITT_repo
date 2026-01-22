import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Bell, Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  pushSubscriptions: number;
  notificationsSent: number;
  admins: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pushSubscriptions: 0,
    notificationsSent: 0,
    admins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get profile count (approximates users)
        const { count: profileCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Get push subscriptions count
        const { count: subCount } = await supabase
          .from("push_subscriptions")
          .select("*", { count: "exact", head: true });

        // Get notifications sent count
        const { count: notifCount } = await supabase
          .from("push_notifications")
          .select("*", { count: "exact", head: true });

        // Get admin count
        const { count: adminCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");

        setStats({
          totalUsers: profileCount || 0,
          pushSubscriptions: subCount || 0,
          notificationsSent: notifCount || 0,
          admins: adminCount || 0,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Push Subscribers", value: stats.pushSubscriptions, icon: Bell, color: "text-green-500" },
    { title: "Notifications Sent", value: stats.notificationsSent, icon: Send, color: "text-orange-500" },
    { title: "Admins", value: stats.admins, icon: Shield, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your app</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : stat.value.toLocaleString()}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate("/admin/notifications")}
            >
              <Bell className="h-4 w-4 mr-2" />
              Send Push Notification
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate("/admin/users")}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/admin/notifications")}
          >
            <CardContent className="pt-6 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">Send & manage</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/admin/users")}
          >
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Users</h3>
              <p className="text-xs text-muted-foreground">Manage roles</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
