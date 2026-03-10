import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Save, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LayoutItem {
  id: string;
  section_key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

const DEFAULT_ORDER = [
  "hero", "header", "stats_grid", "fitness_metrics", "activity",
  "workouts", "coaching", "nutrition", "sleep", "ai_coach", "resources",
];

export default function AdminHomeLayout() {
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetchLayout();
  }, []);

  const fetchLayout = async () => {
    const { data, error } = await supabase
      .from("home_layout")
      .select("*")
      .order("sort_order");

    if (!error && data) {
      setItems(data as LayoutItem[]);
    }
    setLoading(false);
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const updated = [...items];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setItems(updated.map((item, i) => ({ ...item, sort_order: i })));
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleEnabled = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setItems(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = items.map((item) =>
        supabase
          .from("home_layout")
          .update({ sort_order: item.sort_order, enabled: item.enabled, updated_at: new Date().toISOString() })
          .eq("id", item.id)
      );
      await Promise.all(promises);
      toast.success("Layout saved successfully");
    } catch {
      toast.error("Failed to save layout");
    }
    setSaving(false);
  };

  const handleReset = () => {
    const sorted = [...items].sort((a, b) => {
      const ai = DEFAULT_ORDER.indexOf(a.section_key);
      const bi = DEFAULT_ORDER.indexOf(b.section_key);
      return ai - bi;
    });
    setItems(sorted.map((item, i) => ({ ...item, sort_order: i, enabled: true })));
  };

  return (
    <AdminLayout title="Home Layout" description="Drag to reorder and toggle sections on the home page">
      <div className="flex gap-2 mb-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Layout
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="flex-1 font-medium text-sm">{item.label}</span>
              <Switch
                checked={item.enabled}
                onCheckedChange={() => toggleEnabled(index)}
              />
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
