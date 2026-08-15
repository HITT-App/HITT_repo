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

// The admin upload accepted `video/*` with no ceiling at all, which is how single files
// large enough to exhaust the storage quota got in.
const MAX_ASSET_MB = 25;
const MAX_ASSET_BYTES = MAX_ASSET_MB * 1024 * 1024;

/**
 * Delete older `app-assets` objects sharing a prefix, keeping the one just uploaded.
 *
 * Uploading a .webm over an existing .mp4 writes a new object rather than replacing it, so
 * `upsert` alone doesn't stop the bucket growing. Best-effort: a failure here must never
 * fail the upload the admin just did.
 */
async function removeSupersededAssets(prefix: string, keepFileName: string) {
  try {
    const { data: existing } = await supabase.storage.from("app-assets").list("", { limit: 100 });
    const stale = (existing ?? [])
      .map((o) => o.name)
      .filter((name) => name.startsWith(prefix) && name !== keepFileName);
    if (stale.length) {
      await supabase.storage.from("app-assets").remove(stale);
    }
  } catch (err) {
    console.warn("Could not clean up superseded assets", err);
  }
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
  const [purging, setPurging] = useState(false);
  const [lastPurge, setLastPurge] = useState<string | null>(null);
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

  const fetchLastPurge = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "cache_version")
      .maybeSingle();
    if (data?.updated_at) {
      setLastPurge(data.updated_at);
    }
  };

  useEffect(() => {
    fetchFlags();
    fetchHeroVideo();
    fetchSplashBg();
    fetchLastPurge();
  }, []);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Please select a video file" });
      return;
    }
    if (file.size > MAX_ASSET_BYTES) {
      toast({
        variant: "destructive",
        title: "Video too large",
        description: `Please upload a video under ${MAX_ASSET_MB}MB. This one is ${(file.size / 1024 / 1024).toFixed(0)}MB.`,
      });
      return;
    }

    setUploadingVideo(true);
    try {
      // Fixed name, not `hero-video-${Date.now()}`. With a unique name per upload the
      // upsert below never actually replaced anything, so every hero video ever uploaded
      // stayed in the bucket forever. See docs — that accumulation is what filled storage.
      const fileName = `hero-video.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // A different extension means a different object, so the previous one would linger.
      await removeSupersededAssets("hero-video", fileName);

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
    if (file.size > MAX_ASSET_BYTES) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Please upload a file under ${MAX_ASSET_MB}MB. This one is ${(file.size / 1024 / 1024).toFixed(0)}MB.`,
      });
      return;
    }
    setUploadingSplash(true);
    try {
      // Fixed name for the same reason as the hero video above.
      const fileName = `splash-bg.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      await removeSupersededAssets("splash-bg", fileName);

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

        {/* Cache Purge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDriveDownload className="h-5 w-5" />
              Cache Management
            </CardTitle>
            <CardDescription>
              Force all users to clear their cached data and load the latest version of the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="destructive"
              onClick={async () => {
                setPurging(true);
                try {
                  const newVersion = Date.now().toString();
                  const { data: existing } = await supabase
                    .from("app_settings")
                    .select("id")
                    .eq("key", "cache_version")
                    .maybeSingle();

                  if (existing) {
                    await supabase
                      .from("app_settings")
                      .update({ value: newVersion, updated_at: new Date().toISOString() })
                      .eq("key", "cache_version");
                  } else {
                    await supabase
                      .from("app_settings")
                      .insert({ key: "cache_version", value: newVersion } as any);
                  }

                  setLastPurge(new Date().toISOString());
                  toast({ title: "✅ Cache purged!", description: "All users will reload with the latest version on their next visit." });
                } catch {
                  toast({ variant: "destructive", title: "Failed to purge cache" });
                } finally {
                  setPurging(false);
                }
              }}
              disabled={purging}
            >
              {purging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HardDriveDownload className="h-4 w-4 mr-2" />}
              Purge All User Caches
            </Button>
            {lastPurge && (
              <p className="text-xs text-muted-foreground">
                Last purged: {new Date(lastPurge).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

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
