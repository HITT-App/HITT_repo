import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldX, Search, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { format } from "date-fns";

interface UserWithRole {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email: string | null;
  roles: string[];
}

type RoleFilter = "all" | "admin" | "moderator";

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogAction, setDialogAction] = useState<"add-admin" | "remove-admin" | "add-mod" | "remove-mod" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [profilesRes, rolesRes, emailsRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("user_id, role"),
        supabase.rpc("admin_get_user_emails"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const emailMap = new Map<string, string>();
      if (emailsRes.data) {
        (emailsRes.data as { user_id: string; email: string }[]).forEach((e) => emailMap.set(e.user_id, e.email));
      }

      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map((profile) => ({
        ...profile,
        email: emailMap.get(profile.user_id) || null,
        roles: (rolesRes.data || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !dialogAction) return;

    if (
      (dialogAction === "remove-admin" || dialogAction === "remove-mod") &&
      selectedUser.user_id === currentUser?.id
    ) {
      toast({ title: "Cannot Remove", description: "You cannot remove your own role", variant: "destructive" });
      closeDialog();
      return;
    }

    setProcessing(true);
    const role = dialogAction.includes("admin") ? "admin" : "moderator";
    const isAdding = dialogAction.startsWith("add");

    try {
      if (isAdding) {
        const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser.user_id, role });
        if (error) throw error;
        toast({ title: `${role === "admin" ? "Admin" : "Moderator"} Added`, description: `${selectedUser.display_name || "User"} now has the ${role} role` });
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", selectedUser.user_id).eq("role", role);
        if (error) throw error;
        toast({ title: `${role === "admin" ? "Admin" : "Moderator"} Removed`, description: `${selectedUser.display_name || "User"} no longer has the ${role} role` });
      }
      loadUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    } finally {
      setProcessing(false);
      closeDialog();
    }
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogAction(null);
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (user.display_name || "").toLowerCase().includes(searchLower) || (user.email || "").toLowerCase().includes(searchLower);
    const matchesFilter =
      roleFilter === "all" ||
      (roleFilter === "admin" && user.roles.includes("admin")) ||
      (roleFilter === "moderator" && user.roles.includes("moderator"));
    return matchesSearch && matchesFilter;
  });

  const getDisplayName = (user: UserWithRole) => {
    if (user.display_name) return user.display_name;
    if (user.email) return user.email;
    return `User-${user.user_id.slice(0, 6)}`;
  };

  const getInitials = (user: UserWithRole) => {
    if (user.display_name) return user.display_name.slice(0, 2).toUpperCase();
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return user.user_id.slice(0, 2).toUpperCase();
  };

  const dialogTitle = dialogAction?.startsWith("add")
    ? `Add ${dialogAction.includes("admin") ? "Admin" : "Moderator"} Role`
    : `Remove ${dialogAction?.includes("admin") ? "Admin" : "Moderator"} Role`;

  const dialogDesc = dialogAction?.startsWith("add")
    ? `Make ${selectedUser?.display_name || "this user"} a ${dialogAction?.includes("admin") ? "admin (full panel access)" : "moderator"}?`
    : `Remove ${dialogAction?.includes("admin") ? "admin" : "moderator"} role from ${selectedUser?.display_name || "this user"}?`;

  return (
    <AdminLayout title="User Management" description="Manage user roles and permissions">
      <div className="space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({users.length})</TabsTrigger>
              <TabsTrigger value="admin">Admins ({users.filter((u) => u.roles.includes("admin")).length})</TabsTrigger>
              <TabsTrigger value="moderator">Mods ({users.filter((u) => u.roles.includes("moderator")).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>{filteredUsers.length} users found</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const isAdmin = user.roles.includes("admin");
                  const isMod = user.roles.includes("moderator");
                  const isCurrentUser = user.user_id === currentUser?.id;

                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{getDisplayName(user)}</p>
                            {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {isAdmin && (
                              <Badge variant="default" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />Admin
                              </Badge>
                            )}
                            {isMod && (
                              <Badge variant="secondary" className="text-xs">
                                <UserCog className="h-3 w-3 mr-1" />Mod
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {/* Admin toggle */}
                        {isAdmin ? (
                          <Button variant="ghost" size="sm" title="Remove admin" onClick={() => { setSelectedUser(user); setDialogAction("remove-admin"); }} disabled={isCurrentUser}>
                            <ShieldX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" title="Make admin" onClick={() => { setSelectedUser(user); setDialogAction("add-admin"); }}>
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Moderator toggle */}
                        {isMod ? (
                          <Button variant="ghost" size="sm" title="Remove moderator" onClick={() => { setSelectedUser(user); setDialogAction("remove-mod"); }} disabled={isCurrentUser}>
                            <UserCog className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" title="Make moderator" onClick={() => { setSelectedUser(user); setDialogAction("add-mod"); }}>
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button variant={dialogAction?.startsWith("remove") ? "destructive" : "default"} onClick={handleRoleChange} disabled={processing}>
              {processing ? "Processing..." : dialogAction?.startsWith("add") ? "Add Role" : "Remove Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
