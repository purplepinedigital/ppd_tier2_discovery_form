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

interface Engagement {
  id: string;
  user_id: string;
  project_name: string;
  program: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectJourney() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [formProgressMap, setFormProgressMap] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const client = getClientSupabase();

        // Get current user
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        setCurrentUser(user.id);
        await fetchEngagements(user.id);

        // Fetch unread notifications count
        const { data: notificationData } = await client
          .from("client_notifications")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("is_read", false);

        setUnreadNotifications(notificationData?.length || 0);
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuthAndFetchData();
  }, [navigate]);

  const fetchEngagements = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getClientSupabase();

      const { data: engagementsData, error: engagementsError } = await client
        .from("engagements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (engagementsError) throw engagementsError;

      setEngagements(engagementsData || []);

      // Fetch form progress for each engagement
      const progressMap: Record<string, number> = {};
      if (engagementsData) {
        for (const engagement of engagementsData) {
          const progress = await getFormProgress(engagement.id);
          progressMap[engagement.id] = progress;
        }
      }
      setFormProgressMap(progressMap);
    } catch (err: any) {
      setError(err.message || "Failed to fetch engagements");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFormProgress = async (engagementId: string) => {
    try {
      const client = getClientSupabase();
      const { data } = await client
        .from("form_progress")
        .select("responses")
        .eq("engagement_id", engagementId)
        .single();

      if (data && data.responses) {
        const answeredQuestions = Object.keys(data.responses).filter(
          (key) => data.responses[key] && data.responses[key].trim() !== "",
        ).length;
        return Math.min(answeredQuestions, 30); // Cap at 30 questions
      }
      return 0;
    } catch (error) {
      return 0;
    }
  };

  const handleDeleteProject = async (engagementId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const client = getClientSupabase();

      // Delete all related data
      await client
        .from("stage_completion")
        .delete()
        .eq("engagement_id", engagementId);
      await client
        .from("deliverables")
        .delete()
        .eq("engagement_id", engagementId);
      await client.from("engagements").delete().eq("id", engagementId);

      setEngagements(engagements.filter((e) => e.id !== engagementId));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  const handleLogout = async () => {
    const client = getClientSupabase();
    await client.auth.signOut();
    navigate("/");
  };

  const programColors: Record<string, string> = {
    foundation: "bg-green-100 text-green-800",
    growth: "bg-blue-100 text-blue-800",
    performance: "bg-purple-100 text-purple-800",
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
              className="text-lg md:text-3xl font-bold"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              My Projects
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              onClick={() => navigate("/project/notifications")}
              className="relative bg-[#37306B] hover:bg-[#2C2758] text-white text-sm md:text-base px-2 md:px-4"
              style={{ fontFamily: "Literata, serif" }}
            >
              🔔
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm md:text-base"
              style={{ fontFamily: "Literata, serif" }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Total Projects
            </p>
            <p
              className="text-3xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Active Programs
            </p>
            <p
              className="text-3xl font-bold text-blue-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.program).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              In Planning
            </p>
            <p
              className="text-3xl font-bold text-gray-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => !e.program).length}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <p style={{ fontFamily: "Literata, serif" }}>
              Loading your projects...
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            {engagements.length === 0 ? (
              <div className="p-6 text-center">
                <p
                  className="text-gray-600 mb-4"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  You don't have any projects yet.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-white"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Start Discovery Form
                </Button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Project Name
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Program
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Created
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Form Progress
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map((engagement) => (
                      <tr
                        key={engagement.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td
                          className="px-6 py-4 text-sm font-medium"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {engagement.project_name}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {engagement.program ? (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                                programColors[engagement.program] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {engagement.program}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              Not set
                            </span>
                          )}
                        </td>
                        <td
                          className="px-6 py-4 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {new Date(engagement.created_at).toLocaleDateString()}
                        </td>
                        <td
                          className="px-6 py-4 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          <span className="text-gray-600">
                            {formProgressMap[engagement.id] || 0}/30 questions
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <Button
                            onClick={() => {
                              const progress =
                                formProgressMap[engagement.id] || 0;
                              if (progress >= 30) {
                                // Form complete - show lifecycle/project details
                                navigate(`/project/lifecycle/${engagement.id}`);
                              } else {
                                // Form incomplete - continue filling form using Index.tsx
                                window.location.href = `/?engagement=${engagement.id}`;
                              }
                            }}
                            className="bg-[#37306B] hover:bg-[#2C2758] text-white px-3 py-2 text-sm inline"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            View/Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteProject(engagement.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm inline"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-6 border-t">
                  <Button
                    onClick={() => navigate("/?newProject=true")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    + Create New Project
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
