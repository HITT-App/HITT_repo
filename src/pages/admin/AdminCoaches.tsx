import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Loader2, Star } from "lucide-react";

export default function AdminCoaches() {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", bio: "", avatar_url: "", hourly_rate: 50, is_available: true });

  const fetchCoaches = async () => {
    const { data } = await supabase.from("coaches").select("*").order("created_at", { ascending: false });
    setCoaches(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  const openCreateDialog = () => {
    setSelectedCoach(null);
    setFormData({ name: "", bio: "", avatar_url: "", hourly_rate: 50, is_available: true });
    setDialogOpen(true);
  };

  const openEditDialog = (coach: any) => {
    setSelectedCoach(coach);
    setFormData({ name: coach.name, bio: coach.bio || "", avatar_url: coach.avatar_url || "", hourly_rate: coach.hourly_rate || 50, is_available: coach.is_available ?? true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ variant: "destructive", title: "Name is required" }); return; }
    setSaving(true);
    try {
      if (selectedCoach) { await supabase.from("coaches").update(formData).eq("id", selectedCoach.id); toast({ title: "Coach updated" }); }
      else { await supabase.from("coaches").insert(formData); toast({ title: "Coach added" }); }
      setDialogOpen(false); fetchCoaches();
    } catch { toast({ variant: "destructive", title: "Error saving" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedCoach) return;
    setSaving(true);
    try { await supabase.from("coaches").delete().eq("id", selectedCoach.id); toast({ title: "Coach deleted" }); setDeleteDialogOpen(false); fetchCoaches(); }
    catch { toast({ variant: "destructive", title: "Error deleting" }); }
    finally { setSaving(false); }
  };

  const filteredCoaches = coaches.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Coach Management" description="Manage coaching staff">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search coaches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Add Coach</Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Coach</TableHead><TableHead className="hidden sm:table-cell">Rating</TableHead><TableHead className="hidden sm:table-cell">Rate</TableHead><TableHead className="hidden sm:table-cell">Available</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              : filteredCoaches.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No coaches found</TableCell></TableRow>
              : filteredCoaches.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={coach.avatar_url || undefined} /><AvatarFallback>{coach.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="font-medium">{coach.name}</span></div></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{coach.rating?.toFixed(1) || "N/A"}</div></TableCell>
                  <TableCell className="hidden sm:table-cell">${coach.hourly_rate}/hr</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant={coach.is_available ? "default" : "secondary"}>{coach.is_available ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEditDialog(coach)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setSelectedCoach(coach); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{selectedCoach ? "Edit Coach" : "Add Coach"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Bio</Label><Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Avatar URL</Label><Input value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} /></div>
            <div className="space-y-2"><Label>Hourly Rate ($)</Label><Input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex items-center justify-between"><Label>Available</Label><Switch checked={formData.is_available} onCheckedChange={(c) => setFormData({ ...formData, is_available: c })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{selectedCoach ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Delete Coach</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
    </AdminLayout>
  );
}
