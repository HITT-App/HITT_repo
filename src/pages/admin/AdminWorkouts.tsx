import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Loader2, Video, ExternalLink,
  GripVertical, ArrowUp, ArrowDown, Dumbbell, Filter,
} from "lucide-react";

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
  body_areas: string[] | null;
  equipment: string[] | null;
  instructor_name: string | null;
  calories_burned: number | null;
  workout_type: string | null;
  created_at: string;
}

interface Exercise {
  id?: string;
  title: string;
  description: string;
  duration_seconds: number | null;
  reps: number | null;
  sets: number | null;
  body_area: string;
  thumbnail_url: string;
  video_url: string;
  order_index: number;
  _isNew?: boolean;
  _deleted?: boolean;
}

const CATEGORIES = ["strength", "cardio", "hiit", "yoga", "flexibility", "pilates", "boxing"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const BODY_AREAS = ["chest", "back", "shoulders", "arms", "core", "legs", "glutes", "full-body"];
const EQUIPMENT_OPTIONS = ["dumbbells", "barbell", "kettlebell", "resistance-bands", "pull-up-bar", "bench", "mat", "none"];

export default function AdminWorkouts() {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Exercise state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "beginner",
    duration_minutes: 30,
    category: "strength",
    is_featured: false,
    video_url: "",
    thumbnail_url: "",
    body_areas: [] as string[],
    equipment: [] as string[],
    instructor_name: "",
    calories_burned: 0,
    workout_type: "hiit",
  });

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast({ variant: "destructive", title: "Error loading workouts" });
    } else {
      setWorkouts(data || []);
    }
    setLoading(false);
  };

  const fetchExercises = async (workoutId: string) => {
    setExercisesLoading(true);
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order_index");

    if (!error && data) {
      setExercises(data.map(e => ({
        ...e,
        description: e.description || "",
        thumbnail_url: e.thumbnail_url || "",
        video_url: e.video_url || "",
        body_area: e.body_area || "",
      })));
    }
    setExercisesLoading(false);
  };

  useEffect(() => { fetchWorkouts(); }, []);

  const openCreateDialog = () => {
    setSelectedWorkout(null);
    setExercises([]);
    setActiveTab("details");
    setFormData({
      title: "", description: "", difficulty: "beginner", duration_minutes: 30,
      category: "strength", is_featured: false, video_url: "", thumbnail_url: "",
      body_areas: [], equipment: [], instructor_name: "", calories_burned: 0, workout_type: "hiit",
    });
    setDialogOpen(true);
  };

  const openEditDialog = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setActiveTab("details");
    setFormData({
      title: workout.title,
      description: workout.description || "",
      difficulty: workout.difficulty || "beginner",
      duration_minutes: workout.duration_minutes || 30,
      category: workout.category || "strength",
      is_featured: workout.is_featured,
      video_url: workout.video_url || "",
      thumbnail_url: workout.thumbnail_url || "",
      body_areas: workout.body_areas || [],
      equipment: workout.equipment || [],
      instructor_name: workout.instructor_name || "",
      calories_burned: workout.calories_burned || 0,
      workout_type: workout.workout_type || "hiit",
    });
    setDialogOpen(true);
    await fetchExercises(workout.id);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }

    setSaving(true);
    try {
      let workoutId = selectedWorkout?.id;

      const payload = {
        title: formData.title,
        description: formData.description || null,
        difficulty: formData.difficulty,
        duration_minutes: formData.duration_minutes,
        category: formData.category,
        is_featured: formData.is_featured,
        video_url: formData.video_url || null,
        thumbnail_url: formData.thumbnail_url || null,
        body_areas: formData.body_areas,
        equipment: formData.equipment,
        instructor_name: formData.instructor_name || null,
        calories_burned: formData.calories_burned || null,
        workout_type: formData.workout_type,
      };

      if (selectedWorkout) {
        const { error } = await supabase
          .from("workouts").update(payload).eq("id", selectedWorkout.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workouts").insert(payload).select("id").single();
        if (error) throw error;
        workoutId = data.id;
      }

      // Save exercises
      if (workoutId) {
        // Delete removed exercises
        const deletedExercises = exercises.filter(e => e._deleted && e.id);
        for (const ex of deletedExercises) {
          await supabase.from("workout_exercises").delete().eq("id", ex.id!);
        }

        // Upsert remaining exercises
        const activeExercises = exercises.filter(e => !e._deleted);
        for (let i = 0; i < activeExercises.length; i++) {
          const ex = activeExercises[i];
          const exercisePayload = {
            workout_id: workoutId,
            title: ex.title,
            description: ex.description || null,
            duration_seconds: ex.duration_seconds,
            reps: ex.reps,
            sets: ex.sets,
            body_area: ex.body_area || null,
            thumbnail_url: ex.thumbnail_url || null,
            video_url: ex.video_url || null,
            order_index: i,
          };

          if (ex.id && !ex._isNew) {
            await supabase.from("workout_exercises").update(exercisePayload).eq("id", ex.id);
          } else {
            await supabase.from("workout_exercises").insert(exercisePayload);
          }
        }
      }

      toast({ title: selectedWorkout ? "Workout updated" : "Workout created" });
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
      await supabase.from("workout_exercises").delete().eq("workout_id", selectedWorkout.id);
      const { error } = await supabase.from("workouts").delete().eq("id", selectedWorkout.id);
      if (error) throw error;
      toast({ title: "Workout deleted" });
      setDeleteDialogOpen(false);
      fetchWorkouts();
    } catch (error) {
      toast({ variant: "destructive", title: "Error deleting workout" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      for (const id of selectedIds) {
        await supabase.from("workout_exercises").delete().eq("workout_id", id);
        await supabase.from("workouts").delete().eq("id", id);
      }
      toast({ title: `${selectedIds.size} workouts deleted` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchWorkouts();
    } catch {
      toast({ variant: "destructive", title: "Error deleting workouts" });
    } finally {
      setSaving(false);
    }
  };

  // Exercise helpers
  const addExercise = () => {
    setExercises(prev => [...prev, {
      title: "", description: "", duration_seconds: 30, reps: null, sets: null,
      body_area: "", thumbnail_url: "", video_url: "", order_index: prev.length,
      _isNew: true,
    }]);
  };

  const updateExercise = (index: number, field: string, value: any) => {
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const removeExercise = (index: number) => {
    setExercises(prev => {
      const ex = prev[index];
      if (ex.id && !ex._isNew) {
        return prev.map((e, i) => i === index ? { ...e, _deleted: true } : e);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    setExercises(prev => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWorkouts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkouts.map(w => w.id)));
    }
  };

  const filteredWorkouts = workouts.filter((w) => {
    if (!w.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && w.category !== filterCategory) return false;
    if (filterDifficulty !== "all" && w.difficulty !== filterDifficulty) return false;
    return true;
  });

  const visibleExercises = exercises.filter(e => !e._deleted);

  return (
    <AdminLayout title="Workout Management" description="Create and manage workout content">
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{workouts.length}</p>
            <p className="text-xs text-muted-foreground">Total Workouts</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{workouts.filter(w => w.is_featured).length}</p>
            <p className="text-xs text-muted-foreground">Featured</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{workouts.filter(w => w.video_url).length}</p>
            <p className="text-xs text-muted-foreground">With Video</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{new Set(workouts.map(w => w.category)).size}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent></Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-1 gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search workouts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[130px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
              </Button>
            )}
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" /> Add Workout
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredWorkouts.length && filteredWorkouts.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Difficulty</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead className="hidden sm:table-cell">Video</TableHead>
                <TableHead className="hidden sm:table-cell">Featured</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredWorkouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No workouts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkouts.map((workout) => (
                  <TableRow key={workout.id} className={selectedIds.has(workout.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(workout.id)}
                        onCheckedChange={() => toggleSelect(workout.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {workout.thumbnail_url && (
                          <img src={workout.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover hidden sm:block" />
                        )}
                        <span className="font-medium">{workout.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="capitalize">{workout.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={workout.difficulty === "advanced" ? "destructive" : workout.difficulty === "intermediate" ? "default" : "secondary"} className="capitalize">
                        {workout.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{workout.duration_minutes} min</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {workout.video_url ? (
                        <a href={workout.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Video className="h-4 w-4" /><ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {workout.is_featured ? <Badge className="bg-primary/20 text-primary border-0">Yes</Badge> : "No"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(workout)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedWorkout(workout); setDeleteDialogOpen(true); }}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
            <DialogDescription>
              {selectedWorkout ? "Update workout details and exercises" : "Add a new workout to the library"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="exercises" className="gap-1">
                <Dumbbell className="h-3 w-3" /> Exercises ({visibleExercises.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="details" className="space-y-4 m-0 pr-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Workout title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the workout" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} min={1} max={180} />
                  </div>
                  <div className="space-y-2">
                    <Label>Calories Burned</Label>
                    <Input type="number" value={formData.calories_burned} onChange={(e) => setFormData({ ...formData, calories_burned: parseInt(e.target.value) || 0 })} min={0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instructor Name</Label>
                  <Input value={formData.instructor_name} onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })} placeholder="e.g. Coach Mike" />
                </div>
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=... or direct URL" />
                  {formData.video_url && (
                    <p className="text-xs text-muted-foreground">
                      {formData.video_url.includes("youtube") || formData.video_url.includes("youtu.be") ? "✅ YouTube link detected" : "✅ Direct video URL"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail URL</Label>
                  <Input value={formData.thumbnail_url} onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })} placeholder="https://example.com/thumbnail.jpg" />
                  {formData.thumbnail_url && (
                    <img src={formData.thumbnail_url} alt="Preview" className="h-20 w-32 object-cover rounded-md border" onError={(e) => (e.currentTarget.style.display = "none")} />
                  )}
                </div>

                {/* Body Areas */}
                <div className="space-y-2">
                  <Label>Target Body Areas</Label>
                  <div className="flex flex-wrap gap-2">
                    {BODY_AREAS.map(area => (
                      <Badge
                        key={area}
                        variant={formData.body_areas.includes(area) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            body_areas: prev.body_areas.includes(area)
                              ? prev.body_areas.filter(a => a !== area)
                              : [...prev.body_areas, area],
                          }));
                        }}
                      >
                        {area.replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <Label>Equipment Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <Badge
                        key={eq}
                        variant={formData.equipment.includes(eq) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            equipment: prev.equipment.includes(eq)
                              ? prev.equipment.filter(e => e !== eq)
                              : [...prev.equipment, eq],
                          }));
                        }}
                      >
                        {eq.replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Featured Workout</Label>
                  <Switch checked={formData.is_featured} onCheckedChange={(c) => setFormData({ ...formData, is_featured: c })} />
                </div>
              </TabsContent>

              <TabsContent value="exercises" className="space-y-4 m-0 pr-2">
                {exercisesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {visibleExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No exercises yet. Add exercises to build this workout.</p>
                      </div>
                    )}

                    {visibleExercises.map((exercise, displayIndex) => {
                      const realIndex = exercises.findIndex(e => e === exercise);
                      return (
                        <Card key={displayIndex} className="relative">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6"
                                  disabled={displayIndex === 0}
                                  onClick={() => moveExercise(realIndex, "up")}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6"
                                  disabled={displayIndex === visibleExercises.length - 1}
                                  onClick={() => moveExercise(realIndex, "down")}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Badge variant="secondary" className="text-xs">#{displayIndex + 1}</Badge>
                              <Input
                                value={exercise.title}
                                onChange={(e) => updateExercise(realIndex, "title", e.target.value)}
                                placeholder="Exercise name"
                                className="flex-1 font-medium"
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeExercise(realIndex)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <Input
                              value={exercise.description}
                              onChange={(e) => updateExercise(realIndex, "description", e.target.value)}
                              placeholder="Brief description"
                              className="text-sm"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Duration (sec)</Label>
                                <Input type="number" value={exercise.duration_seconds || ""} onChange={(e) => updateExercise(realIndex, "duration_seconds", parseInt(e.target.value) || null)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Sets</Label>
                                <Input type="number" value={exercise.sets || ""} onChange={(e) => updateExercise(realIndex, "sets", parseInt(e.target.value) || null)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Reps</Label>
                                <Input type="number" value={exercise.reps || ""} onChange={(e) => updateExercise(realIndex, "reps", parseInt(e.target.value) || null)} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Body Area</Label>
                                <Select value={exercise.body_area || "none"} onValueChange={(v) => updateExercise(realIndex, "body_area", v === "none" ? "" : v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {BODY_AREAS.map(a => <SelectItem key={a} value={a} className="capitalize">{a.replace("-", " ")}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Video URL</Label>
                                <Input value={exercise.video_url} onChange={(e) => updateExercise(realIndex, "video_url", e.target.value)} placeholder="Exercise video" className="h-8 text-xs" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    <Button variant="outline" className="w-full gap-2" onClick={addExercise}>
                      <Plus className="h-4 w-4" /> Add Exercise
                    </Button>
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedWorkout ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedWorkout?.title}"? This will also remove all associated exercises.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Workouts</DialogTitle>
            <DialogDescription>This will permanently delete the selected workouts and all their exercises.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
