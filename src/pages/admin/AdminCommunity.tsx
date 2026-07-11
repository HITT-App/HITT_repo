import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2, MessageSquare, Heart, Flag, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminCommunity() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPosts = async () => {
    const { data } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100);
    setPosts(data || []);
    setLoading(false);
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    const { data } = await supabase.from("content_reports").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(100);
    setReports(data || []);
    setReportsLoading(false);
  };

  useEffect(() => { fetchPosts(); fetchReports(); }, []);

  const handleDelete = async () => {
    if (!selectedPost || !user) return;
    setDeleting(true);
    try {
      await supabase.from("community_posts").delete().eq("id", selectedPost.id);
      await supabase.from("moderation_logs").insert({ moderator_id: user.id, action_type: "delete_post", target_type: "post", target_id: selectedPost.id, reason: "Admin deletion" });
      toast({ title: "Post deleted" });
      setDeleteDialogOpen(false);
      fetchPosts();
    } catch { toast({ variant: "destructive", title: "Error deleting" }); }
    finally { setDeleting(false); }
  };

  const CONTENT_TABLE: Record<string, string> = {
    post: "community_posts", comment: "community_comments", story: "community_stories",
    chatroom: "chatroom_messages", dm: "community_messages",
  };

  const dismissReport = async (report: any) => {
    if (!user) return;
    setActioningId(report.id);
    await supabase.from("content_reports").update({ status: "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", report.id);
    setActioningId(null);
    toast({ title: "Report dismissed" });
    fetchReports();
  };

  const actionReport = async (report: any) => {
    if (!user) return;
    setActioningId(report.id);
    try {
      const table = CONTENT_TABLE[report.content_type];
      if (table) await supabase.from(table).update({ moderation_hidden: true }).eq("id", report.content_id);
      await supabase.from("content_reports").update({ status: "actioned", reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", report.id);
      await supabase.from("moderation_logs").insert({ moderator_id: user.id, action_type: "hide_content", target_type: report.content_type, target_id: report.content_id, reason: report.reason });
      toast({ title: "Content removed" });
    } catch { toast({ variant: "destructive", title: "Error actioning report" }); }
    finally { setActioningId(null); fetchReports(); }
  };

  const filteredPosts = posts.filter((p) => p.content?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Community Moderation" description="Moderate community content">
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList><TabsTrigger value="posts" className="gap-2"><MessageSquare className="h-4 w-4" />Posts</TabsTrigger><TabsTrigger value="reports" className="gap-2"><Flag className="h-4 w-4" />Reports</TabsTrigger></TabsList>
        <TabsContent value="posts" className="space-y-4">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>Content</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="hidden sm:table-cell">Engagement</TableHead><TableHead className="hidden md:table-cell">Posted</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                : filteredPosts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found</TableCell></TableRow>
                : filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell><p className="truncate max-w-[200px] text-sm">{post.content || "(No text)"}</p></TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{post.post_type}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count}</span><span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count}</span></div></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setSelectedPost(post); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setSelectedPost(post); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead className="hidden md:table-cell">Reported</TableHead><TableHead className="w-[180px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {reportsLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                : reports.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground"><Flag className="h-10 w-10 mx-auto mb-3 opacity-50" />No reports to review</TableCell></TableRow>
                : reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.content_type}</Badge></TableCell>
                    <TableCell className="text-sm">{r.reason}{r.details ? <p className="text-xs text-muted-foreground truncate max-w-[220px]">{r.details}</p> : null}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                    <TableCell><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={actioningId === r.id} onClick={() => actionReport(r)}>Remove</Button><Button size="sm" variant="outline" disabled={actioningId === r.id} onClick={() => dismissReport(r)}>Dismiss</Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Post Details</DialogTitle></DialogHeader>
          {selectedPost && <div className="space-y-4"><div className="p-4 bg-muted rounded-lg"><p className="whitespace-pre-wrap">{selectedPost.content || "(No text)"}</p></div>{selectedPost.image_url && <img src={selectedPost.image_url} alt="Post" className="rounded-lg max-h-64 object-cover w-full" />}<div className="flex items-center gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Heart className="h-4 w-4" />{selectedPost.likes_count} likes</span><span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />{selectedPost.comments_count} comments</span><Badge variant="outline">{selectedPost.post_type}</Badge></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button><Button variant="destructive" onClick={() => { setViewDialogOpen(false); setDeleteDialogOpen(true); }}>Delete Post</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Delete Post</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
    </AdminLayout>
  );
}
