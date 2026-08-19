import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Bell, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { formatDateTime } from "@/lib/dateFormat";
import type { NotificationItem } from "@/features/notifications/components/NotificationBell";

export function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
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
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);

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

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);

    if (id === "rep_verif" || id === "acc_verif") {
      try {
        const localReadStr = localStorage.getItem("local_read_notifications") || "{}";
        const localRead = JSON.parse(localReadStr);
        const notification = updated.find(n => n.id === id);
        if (notification) {
          localRead[id] = notification.description;
          localStorage.setItem("local_read_notifications", JSON.stringify(localRead));
        }
      } catch (e) {}
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Notifications | PsyicHub</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h2>
          <p className="text-muted-foreground mt-1">
            Stay updated with your latest alerts and pending tasks.
          </p>
        </div>
        <Button variant="outline" onClick={markAllAsRead} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur">
        <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
          <CardDescription>
            You have {notifications.filter(n => !n.isRead).length} unread messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No notifications to display.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 transition-colors hover:bg-muted/30 flex gap-4 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${!notification.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold leading-none">
                          {notification.link ? (
                            <Link to={notification.link} className="hover:text-primary transition-colors hover:underline">
                              {notification.title}
                            </Link>
                          ) : (
                            notification.title
                          )}
                        </h4>
                        {notification.priority === 'urgent' && (
                          <Badge variant="destructive" className="h-5 px-2">Urgent</Badge>
                        )}
                        {notification.priority === 'important' && (
                          <Badge variant="secondary" className="h-5 px-2">Important</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notification.description}
                    </p>
                    {notification.link && !notification.title.toLowerCase().includes('wallet') && (
                      <div className="pt-2">
                        <Button asChild variant="secondary" size="sm" className="h-8">
                          <Link to={notification.link}>Take Action</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
