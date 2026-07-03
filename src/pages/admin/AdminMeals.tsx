import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";

export default function AdminMeals() {
  const { toast } = useToast();
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", category: "lunch", calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0,
  });

  const fetchMeals = async () => {
    const { data } = await supabase.from("meals").select("*").order("created_at", { ascending: false }).limit(1000);
    setMeals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMeals(); }, []);

  const openCreateDialog = () => {
    setSelectedMeal(null);
    setFormData({ name: "", description: "", category: "lunch", calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 });
    setDialogOpen(true);
  };

  const openEditDialog = (meal: any) => {
    setSelectedMeal(meal);
    setFormData({
      name: meal.name, description: meal.description || "", category: meal.category || "lunch",
      calories: meal.calories || 0, protein_grams: meal.protein_grams || 0, carbs_grams: meal.carbs_grams || 0, fat_grams: meal.fat_grams || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return; }
    setSaving(true);
    try {
      if (selectedMeal) {
        await supabase.from("meals").update(formData).eq("id", selectedMeal.id);
        toast({ title: "Meal updated" });
      } else {
        await supabase.from("meals").insert(formData);
        toast({ title: "Meal created" });
      }
      setDialogOpen(false);
      fetchMeals();
    } catch { toast({ variant: "destructive", title: "Error saving" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedMeal) return;
    setSaving(true);
    try {
      await supabase.from("meals").delete().eq("id", selectedMeal.id);
      toast({ title: "Meal deleted" });
      setDeleteDialogOpen(false);
      fetchMeals();
    } catch { toast({ variant: "destructive", title: "Error deleting" }); }
    finally { setSaving(false); }
  };

  const filteredMeals = meals.filter((m) => m.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Meal Management" description="Create and manage meal content">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search meals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Add Meal</Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Calories</TableHead><TableHead className="w-[100px]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              : filteredMeals.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No meals found</TableCell></TableRow>
              : filteredMeals.map((meal) => (
                <TableRow key={meal.id}>
                  <TableCell className="font-medium">{meal.name}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline">{meal.category}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell">{meal.calories} kcal</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(meal)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedMeal(meal); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedMeal ? "Edit Meal" : "Create Meal"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="breakfast">Breakfast</SelectItem><SelectItem value="lunch">Lunch</SelectItem><SelectItem value="dinner">Dinner</SelectItem><SelectItem value="snack">Snack</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Calories</Label><Input type="number" value={formData.calories} onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Protein (g)</Label><Input type="number" value={formData.protein_grams} onChange={(e) => setFormData({ ...formData, protein_grams: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Carbs (g)</Label><Input type="number" value={formData.carbs_grams} onChange={(e) => setFormData({ ...formData, carbs_grams: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Fat (g)</Label><Input type="number" value={formData.fat_grams} onChange={(e) => setFormData({ ...formData, fat_grams: parseInt(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{selectedMeal ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete Meal</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
