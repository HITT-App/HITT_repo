import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ShieldCheck, ShieldX, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface UserWithRole {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogAction, setDialogAction] = useState<"add" | "remove" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url")
        .order("created_at", { ascending: false })
        .limit(100);

      if (profileError) throw profileError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedUser) return;
    setProcessing(true);

    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.user_id,
        role: "admin",
      });

      if (error) throw error;

      toast({
        title: "Admin Added",
        description: `${selectedUser.display_name || "User"} is now an admin`,
      });

      loadUsers();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add admin role",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setSelectedUser(null);
      setDialogAction(null);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedUser) return;
    
    // Prevent removing yourself
    if (selectedUser.user_id === currentUser?.id) {
      toast({
        title: "Cannot Remove",
        description: "You cannot remove your own admin role",
        variant: "destructive",
      });
      setSelectedUser(null);
      setDialogAction(null);
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.user_id)
        .eq("role", "admin");

      if (error) throw error;

      toast({
        title: "Admin Removed",
        description: `${selectedUser.display_name || "User"} is no longer an admin`,
      });

      loadUsers();
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin role",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setSelectedUser(null);
      setDialogAction(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    (user.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">User Management</h1>
              <p className="text-xs text-muted-foreground">Manage user roles</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {users.filter((u) => u.roles.includes("admin")).length}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-500">
                {users.filter((u) => u.roles.includes("moderator")).length}
              </p>
              <p className="text-xs text-muted-foreground">Mods</p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {filteredUsers.length} users found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const isAdmin = user.roles.includes("admin");
                  const isMod = user.roles.includes("moderator");
                  const isCurrentUser = user.user_id === currentUser?.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {user.display_name || "Unnamed User"}
                            </p>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {isAdmin && (
                              <Badge variant="default" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {isMod && (
                              <Badge variant="secondary" className="text-xs">
                                Moderator
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setDialogAction("remove");
                            }}
                            disabled={isCurrentUser}
                          >
                            <ShieldX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setDialogAction("add");
                            }}
                          >
                            <ShieldCheck className="h-4 w-4" />
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
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "add" ? "Add Admin Role" : "Remove Admin Role"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "add"
                ? `Are you sure you want to make ${selectedUser?.display_name || "this user"} an admin? They will have full access to the admin panel.`
                : `Are you sure you want to remove admin access from ${selectedUser?.display_name || "this user"}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === "remove" ? "destructive" : "default"}
              onClick={dialogAction === "add" ? handleAddAdmin : handleRemoveAdmin}
              disabled={processing}
            >
              {processing ? "Processing..." : dialogAction === "add" ? "Add Admin" : "Remove Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
