import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";

interface Workout {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  category: string | null;
  is_featured: boolean;
  video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export default function AdminWorkouts() {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "beginner",
    duration_minutes: 30,
    category: "strength",
    is_featured: false,
    video_url: "",
    thumbnail_url: "",
  });

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error loading workouts" });
    } else {
      setWorkouts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const openCreateDialog = () => {
    setSelectedWorkout(null);
    setFormData({
      title: "",
      description: "",
      difficulty: "beginner",
      duration_minutes: 30,
      category: "strength",
      is_featured: false,
      video_url: "",
      thumbnail_url: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (workout: Workout) => {
    setSelectedWorkout(workout);
    setFormData({
      title: workout.title,
      description: workout.description || "",
      difficulty: workout.difficulty || "beginner",
      duration_minutes: workout.duration_minutes || 30,
      category: workout.category || "strength",
      is_featured: workout.is_featured,
      video_url: workout.video_url || "",
      thumbnail_url: workout.thumbnail_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }

    setSaving(true);
    try {
      if (selectedWorkout) {
        const { error } = await supabase
          .from("workouts")
          .update(formData)
          .eq("id", selectedWorkout.id);

        if (error) throw error;
        toast({ title: "Workout updated successfully" });
      } else {
        const { error } = await supabase.from("workouts").insert(formData);
        if (error) throw error;
        toast({ title: "Workout created successfully" });
      }
      setDialogOpen(false);
      fetchWorkouts();
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving workout" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkout) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", selectedWorkout.id);

      if (error) throw error;
      toast({ title: "Workout deleted successfully" });
      setDeleteDialogOpen(false);
      fetchWorkouts();
    } catch (error) {
      toast({ variant: "destructive", title: "Error deleting workout" });
    } finally {
      setSaving(false);
    }
  };

  const filteredWorkouts = workouts.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Workout Management" description="Create and manage workout content">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Workout
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Difficulty</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead className="hidden sm:table-cell">Featured</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredWorkouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No workouts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">{workout.title}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{workout.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={
                          workout.difficulty === "advanced"
                            ? "destructive"
                            : workout.difficulty === "intermediate"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {workout.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {workout.duration_minutes} min
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {workout.is_featured ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(workout)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedWorkout(workout);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkout ? "Edit Workout" : "Create Workout"}
            </DialogTitle>
            <DialogDescription>
              {selectedWorkout
                ? "Update workout details"
                : "Add a new workout to the library"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Workout title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the workout"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) =>
                    setFormData({ ...formData, difficulty: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value) || 0,
                  })
                }
                min={1}
                max={180}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">Video URL (YouTube link or direct video URL)</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) =>
                  setFormData({ ...formData, video_url: e.target.value })
                }
                placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
              />
              {formData.video_url && (
                <p className="text-xs text-muted-foreground">
                  {formData.video_url.includes("youtube") || formData.video_url.includes("youtu.be")
                    ? "✅ YouTube link detected"
                    : "✅ Direct video URL"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
                placeholder="https://example.com/thumbnail.jpg"
              />
              {formData.thumbnail_url && (
                <img
                  src={formData.thumbnail_url}
                  alt="Thumbnail preview"
                  className="h-20 w-32 object-cover rounded-md border"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Featured Workout</Label>
              <Switch
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(c) =>
                  setFormData({ ...formData, is_featured: c })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedWorkout ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedWorkout?.title}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
