import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Dumbbell, Utensils, Users, GraduationCap, Megaphone, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

interface Prefs {
  push_enabled: boolean;
  workout_reminders: boolean;
  nutrition_tips: boolean;
  coaching_updates: boolean;
  community_notifications: boolean;
  social_notifications: boolean;
  admin_notifications: boolean;
}

const DEFAULTS: Prefs = {
  push_enabled: true,
  workout_reminders: true,
  nutrition_tips: true,
  coaching_updates: true,
  community_notifications: true,
  social_notifications: true,
  admin_notifications: true,
};

const CATEGORIES = [
  {
    key: "workout_reminders" as keyof Prefs,
    icon: Dumbbell,
    color: "text-orange-500",
    label: "Workouts & Streaks",
    description: "Reminders, completions, streak alerts, badges",
  },
  {
    key: "nutrition_tips" as keyof Prefs,
    icon: Utensils,
    color: "text-green-500",
    label: "Nutrition & Sleep",
    description: "Meal logging, daily goals, sleep quality",
  },
  {
    key: "coaching_updates" as keyof Prefs,
    icon: GraduationCap,
    color: "text-blue-500",
    label: "Coaching",
    description: "Session reminders, booking confirmations, AI coach tips",
  },
  {
    key: "community_notifications" as keyof Prefs,
    icon: Users,
    color: "text-purple-500",
    label: "Community",
    description: "Likes, comments, mentions, friend requests",
  },
  {
    key: "social_notifications" as keyof Prefs,
    icon: Bell,
    color: "text-pink-500",
    label: "Direct Messages",
    description: "New messages from other members",
  },
  {
    key: "admin_notifications" as keyof Prefs,
    icon: Megaphone,
    color: "text-yellow-500",
    label: "Announcements",
    description: "App updates, new features, challenges",
  },
];

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [systemDenied, setSystemDenied] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check iOS system permission
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then(({ receive }) => {
        setSystemDenied(receive === "denied");
      });
    }

    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setPrefs({ ...DEFAULTS, ...data });
      });
  }, [user]);

  const save = async (updated: Prefs) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...updated, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Failed to save", variant: "destructive" });
  };

  const toggle = (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    save(updated);
  };

  const toggleAll = async () => {
    if (!prefs.push_enabled && Capacitor.isNativePlatform()) {
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== "granted") {
        toast({
          title: "Permission required",
          description: "Enable notifications in iOS Settings → HIIT.",
          variant: "destructive",
        });
        return;
      }
      await PushNotifications.register();
    }
    const updated = { ...prefs, push_enabled: !prefs.push_enabled };
    setPrefs(updated);
    save(updated);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-foreground">Notifications</h1>
        {saving && <span className="ml-auto text-xs text-muted-foreground">Saving…</span>}
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-8 space-y-4">
        {systemDenied && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <BellOff size={16} className="text-destructive" />
              <p className="text-sm font-semibold text-destructive">Notifications blocked</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Go to <strong>iOS Settings → HIIT → Notifications</strong> and turn them on.
            </p>
          </div>
        )}

        {/* Master toggle */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Allow HIIT to send you notifications</p>
            </div>
          </div>
          <Switch checked={prefs.push_enabled} onCheckedChange={toggleAll} />
        </div>

        {/* Category toggles */}
        {prefs.push_enabled && (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border/40">
            {CATEGORIES.map(({ key, icon: Icon, color, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Icon size={18} className={color} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(prefs[key])}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center px-4">
          You can change these at any time. Some critical notifications (security, payments) are always sent.
        </p>
      </div>
      </div>
    </div>
  );
}
