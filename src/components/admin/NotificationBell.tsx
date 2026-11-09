import { useState } from "react";
import { Bell, Check, CheckCheck, AlertTriangle, Info, XCircle, Package, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAdminNotifications, type AdminNotification } from "@/hooks/useAdminNotifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  critical: XCircle,
};

const severityColors = {
  info: "text-blue-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

const typeIcons: Record<string, typeof Package> = {
  order_cancelled: XCircle,
  stock_critical: AlertTriangle,
  large_stock_change: Boxes,
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useAdminNotifications();

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const SeverityIcon = severityIcons[notification.severity] || Info;
                const TypeIcon = typeIcons[notification.type] || SeverityIcon;

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex-shrink-0",
                          severityColors[notification.severity]
                        )}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              !notification.is_read && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {notification.created_by_name && (
                            <>
                              <span>•</span>
                              <span>{notification.created_by_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
