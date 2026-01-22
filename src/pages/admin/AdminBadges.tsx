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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Loader2, Trophy } from "lucide-react";

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  requirement_type: string | null;
  requirement_value: number | null;
  created_at: string;
}

export default function AdminBadges() {
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "trophy",
    category: "achievement",
    requirement_type: "workouts_completed",
    requirement_value: 10,
  });

  const fetchBadges = async () => {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error loading badges" });
    } else {
      setBadges(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const openCreateDialog = () => {
    setSelectedBadge(null);
    setFormData({
      name: "",
      description: "",
      icon: "trophy",
      category: "achievement",
      requirement_type: "workouts_completed",
      requirement_value: 10,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (badge: BadgeItem) => {
    setSelectedBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon || "trophy",
      category: badge.category || "achievement",
      requirement_type: badge.requirement_type || "workouts_completed",
      requirement_value: badge.requirement_value || 10,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }

    setSaving(true);
    try {
      if (selectedBadge) {
        const { error } = await supabase
          .from("badges")
          .update(formData)
          .eq("id", selectedBadge.id);

        if (error) throw error;
        toast({ title: "Badge updated successfully" });
      } else {
        const { error } = await supabase.from("badges").insert(formData);
        if (error) throw error;
        toast({ title: "Badge created successfully" });
      }
      setDialogOpen(false);
      fetchBadges();
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving badge" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBadge) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("badges")
        .delete()
        .eq("id", selectedBadge.id);

      if (error) throw error;
      toast({ title: "Badge deleted successfully" });
      setDeleteDialogOpen(false);
      fetchBadges();
    } catch (error) {
      toast({ variant: "destructive", title: "Error deleting badge" });
    } finally {
      setSaving(false);
    }
  };

  const filteredBadges = badges.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Badge Management" description="Create and manage achievement badges">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search badges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Badge
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Badge</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Requirement</TableHead>
                <TableHead className="hidden sm:table-cell">Value</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredBadges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No badges found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBadges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{badge.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {badge.requirement_type?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {badge.requirement_value}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(badge)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBadge(badge);
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
            <DialogTitle>{selectedBadge ? "Edit Badge" : "Create Badge"}</DialogTitle>
            <DialogDescription>
              {selectedBadge ? "Update badge details" : "Create a new achievement badge"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Badge name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What this badge represents"
                rows={2}
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
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="streak">Streak</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trophy">Trophy</SelectItem>
                    <SelectItem value="medal">Medal</SelectItem>
                    <SelectItem value="star">Star</SelectItem>
                    <SelectItem value="flame">Flame</SelectItem>
                    <SelectItem value="zap">Lightning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requirement Type</Label>
                <Select
                  value={formData.requirement_type}
                  onValueChange={(v) => setFormData({ ...formData, requirement_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workouts_completed">Workouts Completed</SelectItem>
                    <SelectItem value="streak_days">Streak Days</SelectItem>
                    <SelectItem value="meals_logged">Meals Logged</SelectItem>
                    <SelectItem value="calories_burned">Calories Burned</SelectItem>
                    <SelectItem value="steps_walked">Steps Walked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Target Value</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.requirement_value}
                  onChange={(e) => setFormData({ ...formData, requirement_value: parseInt(e.target.value) || 0 })}
                  min={1}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedBadge ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Badge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedBadge?.name}"? Users who earned this badge will lose it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
