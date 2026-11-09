import { Building2, MapPin, Phone, CheckCircle2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Outlet } from "@/hooks/useOutlets";
import { cn } from "@/lib/utils";

interface POSOutletSelectorProps {
  outlets: Outlet[];
  onSelectOutlet: (outlet: Outlet) => void;
  isLoading?: boolean;
  canSwitchOutlet?: boolean;
  isLocked?: boolean;
}

export function POSOutletSelector({ 
  outlets, 
  onSelectOutlet, 
  isLoading,
  canSwitchOutlet = true,
  isLocked = false
}: POSOutletSelectorProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading outlets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Select Outlet</h1>
            {isLocked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {canSwitchOutlet 
              ? "Choose which outlet you want to operate from" 
              : "You are assigned to a specific outlet"}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outlets.map((outlet) => (
              <Card
                key={outlet.id}
                className={cn(
                  "transition-all",
                  canSwitchOutlet 
                    ? "cursor-pointer hover:shadow-md hover:border-primary/50" 
                    : "cursor-default",
                  outlet.is_main_branch && "border-primary/30 bg-primary/5"
                )}
                onClick={() => canSwitchOutlet && onSelectOutlet(outlet)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        outlet.is_main_branch ? "bg-primary/20" : "bg-muted"
                      )}>
                        <Building2 className={cn(
                          "h-5 w-5",
                          outlet.is_main_branch ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{outlet.name}</CardTitle>
                        {outlet.is_main_branch && (
                          <span className="text-xs text-primary font-medium">Main Branch</span>
                        )}
                      </div>
                    </div>
                    {outlet.is_main_branch && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {outlet.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{outlet.address}</span>
                    </div>
                  )}
                  {outlet.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{outlet.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {outlets.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Outlets Available</h3>
              <p className="text-muted-foreground">
                You don't have access to any outlets. Please contact an administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
