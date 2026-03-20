import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw, Upload, Trash2, Video, Image as ImageIcon, HardDriveDownload } from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [splashBgUrl, setSplashBgUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Error loading settings" });
    } else {
      setFlags(data || []);
    }
    setLoading(false);
  };

  const fetchHeroVideo = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "hero_video_url")
      .single();
    setHeroVideoUrl(data?.value || null);
  };

  const fetchSplashBg = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "splash_background_url")
      .maybeSingle();
    setSplashBgUrl(data?.value || null);
  };

  useEffect(() => {
    fetchFlags();
    fetchHeroVideo();
    fetchSplashBg();
  }, []);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Please select a video file" });
      return;
    }

    setUploadingVideo(true);
    try {
      const fileName = `hero-video-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ value: publicUrl, updated_at: new Date().toISOString() })
        .eq("key", "hero_video_url");

      if (updateError) throw updateError;

      setHeroVideoUrl(publicUrl);
      toast({ title: "✅ Hero video saved!", description: "The new video is now live on the home screen." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to upload video" });
    } finally {
      setUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = async () => {
    try {
      await supabase
        .from("app_settings")
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq("key", "hero_video_url");

      setHeroVideoUrl(null);
      toast({ title: "Hero video reset to default" });
    } catch {
      toast({ variant: "destructive", title: "Failed to reset video" });
    }
  };

  const handleSplashUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
    if (!validTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Please select an image or video file" });
      return;
    }
    setUploadingSplash(true);
    try {
      const fileName = `splash-bg-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("app-assets").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const isVideo = file.type.startsWith("video/");
      const value = isVideo ? `video:${publicUrl}` : publicUrl;

      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "splash_background_url")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", "splash_background_url");
      } else {
        await supabase
          .from("app_settings")
          .insert({ key: "splash_background_url", value } as any);
      }

      setSplashBgUrl(value);
      toast({ title: "✅ Splash background saved!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to upload" });
    } finally {
      setUploadingSplash(false);
      if (splashInputRef.current) splashInputRef.current.value = "";
    }
  };

  const handleRemoveSplash = async () => {
    try {
      await supabase
        .from("app_settings")
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq("key", "splash_background_url");
      setSplashBgUrl(null);
      toast({ title: "Splash background reset to default" });
    } catch {
      toast({ variant: "destructive", title: "Failed to reset" });
    }
  };

  const handleToggle = (flagName: string, enabled: boolean) => {
    setChanges((prev) => ({ ...prev, [flagName]: enabled }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [name, enabled] of Object.entries(changes)) {
        const { error } = await supabase
          .from("feature_flags")
          .update({ enabled })
          .eq("name", name);

        if (error) throw error;
      }

      toast({ title: "Settings saved successfully" });
      setChanges({});
      fetchFlags();
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving settings" });
    } finally {
      setSaving(false);
    }
  };

  const getFlagValue = (flag: FeatureFlag) => {
    return changes[flag.name] !== undefined ? changes[flag.name] : flag.enabled;
  };

  const hasChanges = Object.keys(changes).length > 0;

  if (loading) {
    return (
      <AdminLayout title="Settings" description="Manage app configuration">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings" description="Manage app configuration">
      <div className="space-y-6 max-w-2xl">
        {/* Hero Video Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Hero Video
            </CardTitle>
            <CardDescription>
              Upload a video for the home screen hero section. Leave empty to use the default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {heroVideoUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <video
                  src={heroVideoUrl}
                  className="w-full h-40 object-cover"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {heroVideoUrl ? "Replace Video" : "Upload Video"}
              </Button>
              {heroVideoUrl && (
                <Button variant="destructive" size="sm" onClick={handleRemoveVideo}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {heroVideoUrl ? "Custom video is active" : "Using default bundled video"}
            </p>
          </CardContent>
        </Card>

        {/* Splash Screen Background */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Splash Screen Background
            </CardTitle>
            <CardDescription>
              Upload a custom image or video for the welcome/onboarding splash screen background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {splashBgUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                {splashBgUrl.startsWith("video:") ? (
                  <video
                    src={splashBgUrl.replace("video:", "")}
                    className="w-full h-40 object-cover"
                    muted autoPlay loop playsInline
                  />
                ) : (
                  <img
                    src={splashBgUrl}
                    alt="Splash background"
                    className="w-full h-40 object-cover"
                  />
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={splashInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={handleSplashUpload}
              />
              <Button
                variant="outline"
                onClick={() => splashInputRef.current?.click()}
                disabled={uploadingSplash}
              >
                {uploadingSplash ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {splashBgUrl ? "Replace Background" : "Upload Background"}
              </Button>
              {splashBgUrl && (
                <Button variant="destructive" size="sm" onClick={handleRemoveSplash}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {splashBgUrl ? "Custom background is active" : "Using default orange background"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>
              Toggle features on or off for all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {flags.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No feature flags configured
              </p>
            ) : (
              flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between space-x-4"
                >
                  <div className="flex-1">
                    <Label
                      htmlFor={flag.name}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {flag.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                    {flag.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {flag.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={flag.name}
                    checked={getFlagValue(flag)}
                    onCheckedChange={(checked) => handleToggle(flag.name, checked)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setChanges({});
              fetchFlags();
            }}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-mono">production</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-mono">{new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
