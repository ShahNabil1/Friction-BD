import { useAuth } from "@/context/auth";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  History,
  RotateCcw,
  ArrowDownToLine,
  CreditCard,
  CalendarCheck,
  User,
  LogOut,
  MessageCircle,
  Maximize,
  Power,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface POSContextMenuProps {
  open: boolean;
  onClose: () => void;
}

export function POSContextMenu({ open, onClose }: POSContextMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const menuItems = [
    {
      section: "Management",
      items: [
        { icon: Wrench, label: "Management", onClick: () => { onClose(); navigate("/pos/management"); } },
      ],
    },
    {
      section: "Sales",
      items: [
        { icon: History, label: "View sales history", onClick: () => { onClose(); navigate("/pos/history"); } },
        { icon: RotateCcw, label: "View Return/Exchange", onClick: () => { onClose(); navigate("/pos/returns"); } },
        { icon: ArrowDownToLine, label: "Expense History", onClick: () => { onClose(); navigate("/pos/expenses"); } },
        { icon: CreditCard, label: "Credit payments", onClick: () => { onClose(); navigate("/pos/credit-payments"); } },
        { icon: User, label: "CRM", onClick: () => { onClose(); navigate("/pos/crm"); } },
      ],
    },
    {
      section: "User",
      items: [
        { icon: User, label: "User info", onClick: () => navigate("/admin/users") },
        { icon: LogOut, label: "Sign out", onClick: handleSignOut },
      ],
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent 
          side="right" 
          className="w-72 bg-primary border-l border-primary-foreground/20 text-primary-foreground p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="p-4 border-b border-primary-foreground/20">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-primary-foreground text-lg font-medium">
                POS - {user?.user_metadata?.full_name || "User"}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-accent hover:bg-primary-foreground/10"
                onClick={onClose}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto">
            {menuItems.map((section, idx) => (
              <div key={section.section}>
                {idx > 0 && <Separator className="bg-primary-foreground/20" />}
                {section.section === "User" && (
                  <p className="px-4 pt-3 pb-1 text-xs text-primary-foreground/60 uppercase tracking-wider">
                    {section.section}
                  </p>
                )}
                <div className="py-1">
                  {section.items.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors"
                    >
                      <item.icon className="h-5 w-5 text-accent" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Separator className="bg-primary-foreground/20" />
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary-foreground/90 hover:bg-primary-foreground/10"
            >
              <MessageCircle className="h-5 w-5 text-accent" />
              <span>Feedback</span>
            </button>
          </div>

          {/* Date Display */}
          <div className="text-center py-3 text-accent text-sm">
            {format(new Date(), "M/d/yyyy")}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-primary-foreground/20 p-3 flex items-center justify-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/admin/dashboard")}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleSignOut}
            >
              <Power className="h-5 w-5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
