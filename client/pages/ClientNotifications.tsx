import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

let clientSupabase: any = null;

const getClientSupabase = () => {
  if (!clientSupabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase configuration is missing");
    }

    clientSupabase = createClient(supabaseUrl, anonKey);
  }
  return clientSupabase;
};

interface ClientNotification {
  id: string;
  engagement_id: string;
  type: string;
  title: string;
  message: string;
  related_stage_number: number | null;
  is_read: boolean;
  created_at: string;
}

export default function ClientNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const client = getClientSupabase();

        const {
          data: { user },
        } = await client.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        setCurrentUser(user.id);
        await fetchNotifications(user.id);
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuthAndFetchData();
  }, [navigate]);

  const fetchNotifications = async (userId: string) => {
    setIsLoading(false);
    try {
      const client = getClientSupabase();

      const { data: notificationsData, error } = await client
        .from("client_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(notificationsData || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleLogout = async () => {
    const client = getClientSupabase();
    await client.auth.signOut();
    navigate("/");
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const client = getClientSupabase();

      const { error } = await client
        .from("client_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      const client = getClientSupabase();

      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await client
        .from("client_notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "program_assigned":
        return "🎯";
      case "deliverable_added":
        return "📦";
      case "stage_completed":
        return "✓";
      default:
        return "📢";
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
              alt="Purple Pine Digital"
              className="h-8 w-auto md:h-10 lg:h-[50px]"
            />
            <h1
              className="text-lg md:text-2xl font-bold cursor-pointer hover:text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
              onClick={() => navigate("/project/journey")}
            >
              My Projects
            </h1>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm md:text-base"
            style={{ fontFamily: "Literata, serif" }}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Page Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Notifications
            </h2>
            <p
              className="text-gray-600 text-sm mt-1"
              style={{ fontFamily: "Literata, serif" }}
            >
              {notifications.length}{" "}
              {notifications.length === 1 ? "notification" : "notifications"}
            </p>
          </div>
          {notifications.some((n) => !n.is_read) && (
            <Button
              onClick={handleMarkAllAsRead}
              className="bg-[#37306B] hover:bg-[#2C2758] text-white text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p style={{ fontFamily: "Literata, serif" }}>
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p
              className="text-3xl mb-4"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              📭
            </p>
            <p
              className="text-gray-600"
              style={{ fontFamily: "Literata, serif" }}
            >
              No notifications yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg shadow p-4 md:p-6 transition-all cursor-pointer hover:shadow-md ${
                  notification.is_read
                    ? "bg-gray-50 border border-gray-200"
                    : "bg-white border-2 border-[#37306B]"
                }`}
                onClick={() =>
                  !notification.is_read && handleMarkAsRead(notification.id)
                }
              >
                <div className="flex gap-4">
                  <div className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div>
                        <h3
                          className="font-bold text-gray-800"
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          {notification.title}
                        </h3>
                        <p
                          className="text-gray-700 text-sm mt-1"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {notification.message}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="px-3 py-1 bg-[#37306B] text-white rounded-full text-xs font-bold flex-shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <p
                      className="text-gray-500 text-xs mt-3"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      {new Date(notification.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
