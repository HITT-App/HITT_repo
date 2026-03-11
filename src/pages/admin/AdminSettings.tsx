import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw, Upload, Trash2, Video } from "lucide-react";

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

  useEffect(() => {
    fetchFlags();
  }, []);

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
        {/* Feature Flags */}
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
