import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { formatDateTime } from "@/lib/dateFormat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  isRead: boolean;
  timestamp: string;
  link?: string;
  priority?: "urgent" | "important" | "normal";
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // For now, we mock the notifications based on pending counts from backend
    // since we don't have a full notifications table yet.
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data } = await apiClient.get<NotificationItem[]>("/notifications/list");
        
        try {
          const localReadStr = localStorage.getItem("local_read_notifications") || "{}";
          const localRead = JSON.parse(localReadStr);
          data.forEach(n => {
            if ((n.id === "rep_verif" || n.id === "acc_verif") && localRead[n.id] === n.description) {
              n.isRead = true;
            }
          });
        } catch (e) {}

        setNotifications(data);
        setUnreadCount(data.filter((m: NotificationItem) => !m.isRead).length);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    setUnreadCount(0);

    try {
      const localReadStr = localStorage.getItem("local_read_notifications") || "{}";
      const localRead = JSON.parse(localReadStr);
      updated.forEach(n => {
        if (n.id === "rep_verif" || n.id === "acc_verif") {
          localRead[n.id] = n.description;
        }
      });
      localStorage.setItem("local_read_notifications", JSON.stringify(localRead));
    } catch (e) {}
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-primary/20 shadow-xl" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-card">
          <h4 className="font-semibold tracking-tight">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-8 text-primary hover:text-primary/80">
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
              No new notifications
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors flex gap-3 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notification.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">
                        {notification.link ? (
                          <Link to={notification.link} className="hover:underline hover:text-primary transition-colors">
                            {notification.title}
                          </Link>
                        ) : (
                          notification.title
                        )}
                      </p>
                      {notification.priority === 'urgent' && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5 py-0 leading-none">Urgent</Badge>
                      )}
                      {notification.priority === 'important' && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 leading-none">Important</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                      {formatDateTime(notification.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-border/40 text-center bg-muted/20">
          <Link to="/notifications">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
