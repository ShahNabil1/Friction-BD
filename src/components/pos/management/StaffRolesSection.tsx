import { useState } from "react";
import { Users, Building2, Search, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStaffMembers, useOutlets, useAssignStaffToOutlet, StaffMember } from "@/hooks/useOutlets";
import { useToast } from "@/hooks/use-toast";

export function StaffRolesSection() {
  const { toast } = useToast();
  const { data: staff = [], isLoading: staffLoading } = useStaffMembers();
  const { data: outlets = [] } = useOutlets();
  const assignStaff = useAssignStaffToOutlet();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("cashier");

  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone?.includes(query)
    );
  });

  const handleAssign = (member: StaffMember) => {
    setSelectedStaff(member);
    setSelectedOutletId(member.assigned_outlet_id || "");
    setSelectedRole(member.outlet_role || "cashier");
    setShowAssignDialog(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedStaff) return;

    try {
      await assignStaff.mutateAsync({
        userId: selectedStaff.id,
        outletId: selectedOutletId || null,
        outletRole: selectedRole,
      });
      toast({ title: "Staff assignment updated" });
      setShowAssignDialog(false);
      setSelectedStaff(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string | null) => {
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Staff & Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Assign staff members to outlets and manage their roles
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Staff Members</CardTitle>
              <CardDescription>
                {staff.length} staff members with admin access
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading staff...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No staff found matching your search" : "No staff members found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Assigned Outlet</TableHead>
                  <TableHead>Outlet Role</TableHead>
                  <TableHead>POS Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.full_name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.email || member.phone || "No contact"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role || "customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.assigned_outlet ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{(member.assigned_outlet as any)?.name || "Unknown"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.outlet_role ? (
                        <Badge variant="outline" className="capitalize">
                          {member.outlet_role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.can_access_pos ? "default" : "secondary"}>
                        {member.can_access_pos ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleAssign(member)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Outlet</DialogTitle>
            <DialogDescription>
              Assign {selectedStaff?.full_name || "this staff member"} to an outlet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No outlet (unassign)</SelectItem>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name} {outlet.is_main_branch && "(Main)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role in Outlet</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Managers can create transfers and update inventory. Cashiers can only process sales.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment} disabled={assignStaff.isPending}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
