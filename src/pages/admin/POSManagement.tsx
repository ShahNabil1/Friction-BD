import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Tag, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { ManagementSidebar, ManagementSection } from "@/components/pos/management/ManagementSidebar";
import { GeneralSettingsSection } from "@/components/pos/management/GeneralSettingsSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function POSManagement() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isSuperAdmin, role } = useUserRole();
  const [activeSection, setActiveSection] = useState<ManagementSection>("general");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const canAccessAdmin = isSuperAdmin || role === "admin";

  const renderSection = () => {
    return (
      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Barcode Label Printer Card */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => navigate("/pos/print-labels")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">Barcode Label Printer</h3>
                  <p className="text-xs text-muted-foreground">Print product stickers & tags</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>

            {/* Inventory Management Card */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => navigate("/pos/inventory")}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">Inventory Management</h3>
                  <p className="text-xs text-muted-foreground">Stock in/out & adjustments</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* General Settings Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Receipt Settings</h2>
          <GeneralSettingsSection />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pos")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">POS Management</h1>
                {isMobile && (
                  <p className="text-xs text-muted-foreground">{activeSection}</p>
                )}
              </div>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            >
              Menu
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Desktop */}
        {!isMobile && (
          <ManagementSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isSuperAdmin={canAccessAdmin}
          />
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && showMobileSidebar && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}>
            <div className="fixed left-0 top-14 bottom-0 w-64 bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
              <ManagementSidebar
                activeSection={activeSection}
                onSectionChange={(section) => {
                  setActiveSection(section);
                  setShowMobileSidebar(false);
                }}
                isSuperAdmin={canAccessAdmin}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
