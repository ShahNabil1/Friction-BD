import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  Shield,
  Loader2,
  Settings,
  Save,
  MapPin,
  Pencil,
  Trash2,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_SLUGS, PermissionSlug } from "@/hooks/useUserRole";

interface Outlet {
  id: string;
  name: string;
  is_active: boolean;
}

interface StaffUser {
  id: string;
  user_id: string;
  role: "super_admin" | "admin" | "moderator";
  created_at: string;
  email?: string;
  phone?: string;
  full_name?: string;
  permissions?: string[];
  can_access_pos?: boolean;
  assigned_outlet_id?: string | null;
  assigned_outlet_name?: string | null;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const PERMISSION_LABELS: Record<PermissionSlug, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  lead_recovery: "Lead Recovery",
  courier: "Courier",
  inventory: "Inventory",
  products: "Products",
  categories: "Categories",
  brands: "Brands",
  reviews: "Reviews",
  customers: "Customers",
  reports: "Reports",
  website: "Website",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentAuthUser } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rename dialog state
  const [renameUser, setRenameUser] = useState<StaffUser | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Remove staff confirmation state
  const [removeUser, setRemoveUser] = useState<StaffUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Branch assignment state
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [pendingPOSUser, setPendingPOSUser] = useState<StaffUser | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  const fetchOutlets = async () => {
    try {
      const { data, error } = await supabase
        .from("outlets")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("is_main_branch", { ascending: false })
        .order("name");
      
      if (error) throw error;
      setOutlets(data || []);
    } catch (error) {
      console.error("Error fetching outlets:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch only staff roles (exclude customers)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["super_admin", "admin", "moderator"])
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Dedupe by user_id, keeping highest-priority role
      const rolePriority: Record<string, number> = {
        super_admin: 3,
        admin: 2,
        moderator: 1,
      };
      const bestRoleByUser = new Map<string, typeof rolesData[number]>();
      for (const r of rolesData || []) {
        const existing = bestRoleByUser.get(r.user_id);
        if (!existing || rolePriority[r.role] > rolePriority[existing.role]) {
          bestRoleByUser.set(r.user_id, r);
        }
      }
      const uniqueRoles = Array.from(bestRoleByUser.values());

      // Fetch profiles for each user (including permissions, POS access, assigned outlet, phone)
      const usersWithProfiles = await Promise.all(
        uniqueRoles.map(async (role) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone, permissions, can_access_pos, assigned_outlet_id")
            .eq("id", role.user_id)
            .single();

          // Get outlet name if assigned
          let outletName = null;
          if (profile?.assigned_outlet_id) {
            const { data: outlet } = await supabase
              .from("outlets")
              .select("name")
              .eq("id", profile.assigned_outlet_id)
              .single();
            outletName = outlet?.name || null;
          }

          return {
            ...role,
            full_name: profile?.full_name,
            email: profile?.email,
            phone: profile?.phone,
            permissions: (profile?.permissions as string[]) || [],
            can_access_pos: profile?.can_access_pos ?? false,
            assigned_outlet_id: profile?.assigned_outlet_id || null,
            assigned_outlet_name: outletName,
          };
        })
      );

      // Filter out stealth/ghost users
      const STEALTH_USER_IDS = ["0fe70abc-43b7-4bee-a53f-1d52e6b68d49"];
      const visibleUsers = usersWithProfiles.filter(
        (u) => !STEALTH_USER_IDS.includes(u.user_id)
      );
      setUsers(visibleUsers as StaffUser[]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
    fetchUsers();
  }, []);

  const handleUpdateRole = async (
    userId: string,
    newRole: "super_admin" | "admin" | "moderator"
  ) => {
    try {
      // Remove any existing staff roles first to avoid duplicates
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", ["super_admin", "admin", "moderator"]);
      if (delErr) throw delErr;

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenRename = (user: StaffUser) => {
    setRenameUser(user);
    setRenameValue(user.full_name || "");
  };

  const handleSaveRename = async () => {
    if (!renameUser) return;
    const newName = renameValue.trim();
    if (!newName) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("id", renameUser.user_id);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.user_id === renameUser.user_id ? { ...u, full_name: newName } : u))
      );
      toast({ title: "Success", description: "Name updated" });
      setRenameUser(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleConfirmRemoveStaff = async () => {
    if (!removeUser) return;
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", removeUser.user_id)
        .in("role", ["super_admin", "admin", "moderator"]);
      if (error) throw error;

      // Also revoke POS access when demoting to customer
      await supabase
        .from("profiles")
        .update({ permissions: [], can_access_pos: false, assigned_outlet_id: null })
        .eq("id", removeUser.user_id);

      toast({
        title: "Removed",
        description: `${removeUser.full_name || removeUser.phone || "User"} is now a customer`,
      });
      setUsers((prev) => prev.filter((u) => u.user_id !== removeUser.user_id));
      setRemoveUser(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsRemoving(false);
    }
  };



  const handleTogglePOSAccess = async (user: StaffUser) => {
    const currentValue = user.can_access_pos ?? false;
    
    if (!currentValue) {
      // Turning ON - open branch selection dialog
      setPendingPOSUser(user);
      setSelectedOutletId("");
      setIsBranchDialogOpen(true);
    } else {
      // Turning OFF - revoke access and clear outlet
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ can_access_pos: false, assigned_outlet_id: null })
          .eq("id", user.user_id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "POS access revoked successfully",
        });

        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === user.user_id 
              ? { ...u, can_access_pos: false, assigned_outlet_id: null, assigned_outlet_name: null } 
              : u
          )
        );
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleConfirmBranchAssignment = async () => {
    if (!pendingPOSUser || !selectedOutletId) return;

    setIsSavingBranch(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          can_access_pos: true, 
          assigned_outlet_id: selectedOutletId 
        })
        .eq("id", pendingPOSUser.user_id);

      if (error) throw error;

      // Get outlet name
      const outlet = outlets.find(o => o.id === selectedOutletId);

      toast({
        title: "Success",
        description: `POS access granted for ${outlet?.name || "branch"}`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === pendingPOSUser.user_id 
            ? { 
                ...u, 
                can_access_pos: true, 
                assigned_outlet_id: selectedOutletId,
                assigned_outlet_name: outlet?.name || null
              } 
            : u
        )
      );

      setIsBranchDialogOpen(false);
      setPendingPOSUser(null);
      setSelectedOutletId("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleOpenPermissions = (user: StaffUser) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
    setIsPermissionDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ permissions: selectedPermissions })
        .eq("id", selectedUser.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id
            ? { ...u, permissions: selectedPermissions }
            : u
        )
      );

      setIsPermissionDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const selectAllPermissions = () => {
    setSelectedPermissions([...PERMISSION_SLUGS]);
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">
              Manage staff users and their page permissions
            </p>
          </div>
        </div>

        {/* Stats - Horizontal on mobile */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-red-100 p-1.5 md:mb-0 md:p-2.5">
                <Shield className="h-4 w-4 text-red-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Super Admins</p>
                <p className="text-lg font-bold md:text-2xl">
                  {users.filter((u) => u.role === "super_admin").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-purple-100 p-1.5 md:mb-0 md:p-2.5">
                <Shield className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Admins</p>
                <p className="text-lg font-bold md:text-2xl">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-blue-100 p-1.5 md:mb-0 md:p-2.5">
                <Shield className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Moderators</p>
                <p className="text-lg font-bold md:text-2xl">
                  {users.filter((u) => u.role === "moderator").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users - Mobile Card View */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No staff users found</p>
              <p className="text-sm text-muted-foreground">
                Promote customers from the Customers page
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold">
                          {user.full_name || "N/A"}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleOpenRename(user)}
                          aria-label="Edit name"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email || (user.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        ) : "N/A")}
                      </p>
                    </div>
                    <Select
                      value={user.role}
                      onValueChange={(
                        value: "super_admin" | "admin" | "moderator"
                      ) => handleUpdateRole(user.user_id, value)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {user.role === "super_admin" ? (
                      <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">
                        All Access
                      </Badge>
                    ) : (
                      <>
                        {(user.permissions || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No permissions
                          </span>
                        ) : (
                          <>
                            {(user.permissions || []).slice(0, 2).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">
                                {PERMISSION_LABELS[p as PermissionSlug] || p}
                              </Badge>
                            ))}
                            {(user.permissions || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(user.permissions || []).length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* POS Access Toggle for mobile */}
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">POS Access</span>
                    {user.role === "super_admin" || user.role === "admin" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-600 text-xs">
                        Auto
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        {user.can_access_pos && user.assigned_outlet_name && (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="mr-1 h-3 w-3" />
                            {user.assigned_outlet_name}
                          </Badge>
                        )}
                        <Switch
                          checked={user.can_access_pos ?? false}
                          onCheckedChange={() => handleTogglePOSAccess(user)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {user.role !== "super_admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenPermissions(user)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Permissions
                      </Button>
                    )}
                    {isSuperAdmin && user.user_id !== currentAuthUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveUser(user)}
                        aria-label="Remove staff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Users Table - Desktop */}
        <Card className="hidden border-border/50 md:block">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No staff users found</p>
                <p className="text-sm text-muted-foreground">
                  Promote customers from the Customers page
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-center">POS Access</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{user.full_name || "N/A"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenRename(user)}
                            aria-label="Edit name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.email || (user.phone ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        ) : "N/A")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(
                            value: "super_admin" | "admin" | "moderator"
                          ) => handleUpdateRole(user.user_id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.role === "super_admin" ? (
                          <Badge variant="outline" className="bg-red-50 text-red-600">
                            All Access
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(user.permissions || []).length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                No permissions
                              </span>
                            ) : (
                              (user.permissions || []).slice(0, 3).map((p) => (
                                <Badge key={p} variant="secondary" className="text-xs">
                                  {PERMISSION_LABELS[p as PermissionSlug] || p}
                                </Badge>
                              ))
                            )}
                            {(user.permissions || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(user.permissions || []).length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === "super_admin" || user.role === "admin" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600">
                            Auto
                          </Badge>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={user.can_access_pos ?? false}
                              onCheckedChange={() => handleTogglePOSAccess(user)}
                            />
                            {user.can_access_pos && user.assigned_outlet_name && (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="mr-1 h-3 w-3" />
                                {user.assigned_outlet_name}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(user.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.role !== "super_admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPermissions(user)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Permissions
                            </Button>
                          )}
                          {isSuperAdmin && user.user_id !== currentAuthUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setRemoveUser(user)}
                              aria-label="Remove staff"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Editor Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Select which admin pages{" "}
              <span className="font-semibold">{selectedUser?.full_name || selectedUser?.email}</span>{" "}
              can access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPermissions}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllPermissions}
              >
                Clear All
              </Button>
            </div>

            {/* Permission checkboxes */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
              {PERMISSION_SLUGS.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                  <Label
                    htmlFor={permission}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {PERMISSION_LABELS[permission]}
                  </Label>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Selected: {selectedPermissions.length} of {PERMISSION_SLUGS.length} pages
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Assignment Dialog */}
      <Dialog open={isBranchDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsBranchDialogOpen(false);
          setPendingPOSUser(null);
          setSelectedOutletId("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Branch</DialogTitle>
            <DialogDescription>
              Select which branch{" "}
              <span className="font-semibold">{pendingPOSUser?.full_name || pendingPOSUser?.email}</span>{" "}
              can access via POS.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="outlet-select" className="mb-2 block">
              Branch
            </Label>
            <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
              <SelectTrigger id="outlet-select">
                <SelectValue placeholder="Select a branch..." />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBranchDialogOpen(false);
                setPendingPOSUser(null);
                setSelectedOutletId("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBranchAssignment} 
              disabled={!selectedOutletId || isSavingBranch}
            >
              {isSavingBranch ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Assign Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameUser} onOpenChange={(o) => !o && setRenameUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>
              Set a real name for this user. They will see this across the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-input">Full Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter full name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameUser(null)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Staff Confirmation */}
      <AlertDialog open={!!removeUser} onOpenChange={(o) => !o && setRemoveUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all staff roles from{" "}
              <span className="font-semibold">
                {removeUser?.full_name || removeUser?.email || removeUser?.phone || "this user"}
              </span>
              . They will become a regular customer and lose admin, POS, and outlet access. This action can be reversed later by re-assigning a role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveStaff}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove Staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
