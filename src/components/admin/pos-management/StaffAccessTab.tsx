import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useOutlets } from "@/hooks/useOutlets";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface StaffMember {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  can_access_pos: boolean | null;
  assigned_outlet_id: string | null;
  outlet_role: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

export function StaffAccessTab() {
  const isMobile = useIsMobile();
  const { data: outlets = [] } = useOutlets();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch all staff profiles and their roles
  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, can_access_pos, assigned_outlet_id, outlet_role")
          .order("full_name");

        if (profilesError) throw profilesError;

        // Fetch user_roles
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Map roles by user_id
        const roleMap: Record<string, string> = {};
        roles?.forEach((r: UserRole) => {
          roleMap[r.user_id] = r.role;
        });

        setUserRoles(roleMap);
        setStaff(profiles || []);
      } catch (error: any) {
        console.error("Error fetching staff:", error);
        toast.error("Failed to load staff data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const handlePOSAccessChange = async (userId: string, enabled: boolean) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          can_access_pos: enabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      setStaff((prev) =>
        prev.map((s) =>
          s.id === userId ? { ...s, can_access_pos: enabled } : s
        )
      );
      toast.success(`POS access ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update POS access");
    } finally {
      setUpdating(null);
    }
  };

  const handleOutletChange = async (userId: string, outletId: string | null) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          assigned_outlet_id: outletId,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      setStaff((prev) =>
        prev.map((s) =>
          s.id === userId ? { ...s, assigned_outlet_id: outletId } : s
        )
      );
      toast.success("Outlet assignment updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update outlet assignment");
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeVariant = (role: string | undefined) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out customers - only show staff (admin, moderator, super_admin)
  const staffMembers = staff.filter((s) => {
    const role = userRoles[s.id];
    return role && ["super_admin", "admin", "moderator"].includes(role);
  });

  if (staffMembers.length === 0) {
    return (
      <Card className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No staff members</h3>
          <p className="text-sm text-muted-foreground">
            Add staff members in User Management to assign them to outlets
          </p>
        </div>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Staff Access Control</h2>
          <p className="text-sm text-muted-foreground">
            Assign staff to outlets and control POS access
          </p>
        </div>

        <div className="space-y-3">
          {staffMembers.map((member) => {
            const role = userRoles[member.id];
            const isSuperAdmin = role === "super_admin";
            const isAdmin = role === "admin";
            const currentOutlet = outlets.find(
              (o) => o.id === member.assigned_outlet_id
            );

            return (
              <Card key={member.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {member.full_name || "Unnamed"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(role)}>
                      {role?.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">POS Access</span>
                    <Switch
                      checked={isSuperAdmin || isAdmin || member.can_access_pos === true}
                      onCheckedChange={(checked) =>
                        handlePOSAccessChange(member.id, checked)
                      }
                      disabled={updating === member.id || isSuperAdmin || isAdmin}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm">Assigned Outlet</span>
                    <Select
                      value={member.assigned_outlet_id || "none"}
                      onValueChange={(value) =>
                        handleOutletChange(
                          member.id,
                          value === "none" ? null : value
                        )
                      }
                      disabled={updating === member.id || isSuperAdmin || isAdmin}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {isSuperAdmin || isAdmin ? "All Outlets" : "No Outlet"}
                        </SelectItem>
                        {outlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Staff Access Control</h2>
        <p className="text-sm text-muted-foreground">
          Assign staff to outlets and control POS access
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Outlet</TableHead>
              <TableHead className="text-center">POS Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.map((member) => {
              const role = userRoles[member.id];
              const isSuperAdmin = role === "super_admin";
              const isAdmin = role === "admin";

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {member.full_name || "Unnamed"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(role)}>
                      {role?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.assigned_outlet_id || "none"}
                      onValueChange={(value) =>
                        handleOutletChange(
                          member.id,
                          value === "none" ? null : value
                        )
                      }
                      disabled={updating === member.id || isSuperAdmin || isAdmin}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {isSuperAdmin || isAdmin ? "All Outlets" : "No Outlet"}
                        </SelectItem>
                        {outlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={isSuperAdmin || isAdmin || member.can_access_pos === true}
                      onCheckedChange={(checked) =>
                        handlePOSAccessChange(member.id, checked)
                      }
                      disabled={updating === member.id || isSuperAdmin || isAdmin}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Super Admins and Admins have automatic access to all outlets
            and POS. Moderators must be explicitly assigned an outlet and granted POS access.
            When a moderator logs in with POS access, they will be redirected directly to the
            POS terminal for their assigned outlet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
