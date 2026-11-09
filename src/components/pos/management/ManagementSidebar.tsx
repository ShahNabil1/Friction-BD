import { Settings, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export type ManagementSection = "general";

interface ManagementSidebarProps {
  activeSection: ManagementSection;
  onSectionChange: (section: ManagementSection) => void;
  isSuperAdmin: boolean;
}

const sections = [
  {
    id: "general" as ManagementSection,
    label: "General Settings",
    icon: Printer,
    description: "Receipt & printer settings",
    requiresSuperAdmin: false,
  },
];

export function ManagementSidebar({
  activeSection,
  onSectionChange,
  isSuperAdmin,
}: ManagementSidebarProps) {
  const visibleSections = sections.filter(
    (section) => !section.requiresSuperAdmin || isSuperAdmin
  );

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">POS Management</h2>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", isActive && "text-primary")} />
              <div className="min-w-0">
                <div className={cn("font-medium text-sm", isActive && "text-primary")}>
                  {section.label}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {section.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
