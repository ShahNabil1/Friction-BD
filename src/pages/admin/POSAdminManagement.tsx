import { useState } from "react";
import { Store, Shield } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OutletManagementTab } from "@/components/admin/pos-management/OutletManagementTab";
import { StaffAccessTab } from "@/components/admin/pos-management/StaffAccessTab";
import { POSSecuritySettings } from "@/components/pos/POSSecuritySettings";
import { useOutlets } from "@/hooks/useOutlets";
import { useUserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function POSAdminManagement() {
  const [activeTab, setActiveTab] = useState("outlets");
  const { data: outlets = [] } = useOutlets();
  const { isSuperAdmin, role } = useUserRole();
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  const canManageSecurity = isSuperAdmin || role === "admin";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">POS Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage outlets, staff access, and security settings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="staff">Staff Access</TabsTrigger>
            {canManageSecurity && (
              <TabsTrigger value="security" className="gap-1">
                <Shield className="h-3.5 w-3.5" />
                Security
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="outlets" className="mt-6">
            <OutletManagementTab />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffAccessTab />
          </TabsContent>

          {canManageSecurity && (
            <TabsContent value="security" className="mt-6 space-y-6">
              <div className="max-w-md space-y-2">
                <Label>Select Outlet</Label>
                <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an outlet to configure..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name} {outlet.is_main_branch && "(Main)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOutletId && (
                <div className="max-w-md">
                  <POSSecuritySettings outletId={selectedOutletId} />
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
