import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getImpersonationSession,
  clearImpersonationSession,
  isImpersonating,
} from "@/lib/admin-impersonate";

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
  tier1_completed: boolean;
  tier1_assessment_id: string | null;
  recommended_package: string | null;
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
  const [notificationMap, setNotificationMap] = useState<
    Record<
      string,
      {
        unreadCount: number;
        lastNotificationTime: string | null;
      }
    >
  >({});
  const [impersonationSession, setImpersonationSession] = useState(
    getImpersonationSession(),
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    engagementId: string | null;
    projectName: string | null;
  }>({
    isOpen: false,
    engagementId: null,
    projectName: null,
  });

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const client = getClientSupabase();

        // Check if impersonating a user first
        const impersonation = getImpersonationSession();

        // Get current user
        const {
          data: { user },
        } = await client.auth.getUser();

        // Allow if user is logged in OR if impersonating
        if (!user && !impersonation) {
          navigate("/");
          return;
        }

        if (user) {
          setCurrentUser(user.id);
        }

        // Determine which user's data to fetch
        const userToFetch = impersonation
          ? impersonation.impersonatedUserId
          : user?.id;

        if (!userToFetch) {
          navigate("/");
          return;
        }

        await fetchEngagements(userToFetch);

        // Fetch unread notifications count (only if logged in, not impersonating)
        if (user && !impersonation) {
          const { data: notificationData } = await client
            .from("client_notifications")
            .select("id", { count: "exact" })
            .eq("user_id", user.id)
            .eq("is_read", false);

          setUnreadNotifications(notificationData?.length || 0);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuthAndFetchData();
  }, [navigate]);

  const getAdminClient = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceRoleKey =
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) return null;

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  };

  const fetchEngagements = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // If impersonating, use admin client to bypass RLS; otherwise use regular client
      const client = isImpersonating()
        ? getAdminClient() || getClientSupabase()
        : getClientSupabase();

      const { data: engagementsData, error: engagementsError } = await client
        .from("engagements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (engagementsError) throw engagementsError;

      setEngagements(engagementsData || []);

      // Fetch form progress for each engagement
      const progressMap: Record<string, number> = {};
      const notifMap: Record<
        string,
        {
          unreadCount: number;
          lastNotificationTime: string | null;
        }
      > = {};

      if (engagementsData) {
        for (const engagement of engagementsData) {
          const progress = await getFormProgress(engagement.id, client);
          progressMap[engagement.id] = progress;

          // Fetch notification data for this engagement
          const notificationData = await getEngagementNotifications(
            engagement.id,
            client,
          );
          notifMap[engagement.id] = notificationData;
        }
      }
      setFormProgressMap(progressMap);
      setNotificationMap(notifMap);
    } catch (err: any) {
      setError(err.message || "Failed to fetch engagements");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFormProgress = async (engagementId: string, clientParam?: any) => {
    try {
      const client = clientParam || getClientSupabase();
      const { data: engagement } = await client
        .from("engagements")
        .select("tier1_completed")
        .eq("id", engagementId)
        .maybeSingle();

      const { data: formProgress } = await client
        .from("form_progress")
        .select("responses, current_question_index")
        .eq("engagement_id", engagementId)
        .maybeSingle();

      if (!formProgress || !formProgress.responses) {
        return 0;
      }

      // Check if responses is an array (JSON) or object
      const responsesArray = Array.isArray(formProgress.responses)
        ? formProgress.responses
        : Object.values(formProgress.responses);

      // Count non-empty responses
      const answeredQuestions = responsesArray.filter(
        (response: any) => response && String(response).trim() !== "",
      ).length;

      // If we found answered questions, return the count
      if (answeredQuestions > 0) {
        return Math.min(answeredQuestions, 30);
      }

      // If no answered questions but current_question_index is 29, they're at the end (completed)
      if (
        formProgress.current_question_index === 29 &&
        engagement?.tier1_completed
      ) {
        return 30;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  };

  const handleDeleteProject = (engagementId: string, projectName: string) => {
    setDeleteConfirm({
      isOpen: true,
      engagementId,
      projectName,
    });
  };

  const confirmDeleteProject = async () => {
    const engagementId = deleteConfirm.engagementId;
    if (!engagementId || !currentUser) return;

    try {
      console.log("Calling server API to delete project:", engagementId);

      const response = await fetch(`/api/engagements/${engagementId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser,
        }),
      });

      const data = await response.json();
      console.log("Delete response:", { status: response.status, data });

      if (!response.ok) {
        console.error("Delete failed:", data);
        alert(`Failed to delete project: ${data.error || "Unknown error"}`);
        setDeleteConfirm({
          isOpen: false,
          engagementId: null,
          projectName: null,
        });
        return;
      }

      if (!data.success) {
        console.error("Delete returned non-success:", data);
        alert(`Failed to delete project: ${data.error || "Unknown error"}`);
        setDeleteConfirm({
          isOpen: false,
          engagementId: null,
          projectName: null,
        });
        return;
      }

      console.log("Project deleted successfully");
      // Update UI only after successful deletion
      setEngagements(engagements.filter((e) => e.id !== engagementId));
      setDeleteConfirm({
        isOpen: false,
        engagementId: null,
        projectName: null,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(
        `Failed to delete project: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setDeleteConfirm({
        isOpen: false,
        engagementId: null,
        projectName: null,
      });
    }
  };

  const handleLogout = async () => {
    const client = getClientSupabase();
    await client.auth.signOut();
    navigate("/");
  };

  const handleStopImpersonation = () => {
    clearImpersonationSession();
    // Redirect back to admin dashboard
    window.location.href = "/admin/dashboard";
  };

  const programColors: Record<string, string> = {
    foundation: "bg-green-100 text-green-800",
    growth: "bg-blue-100 text-blue-800",
    performance: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Impersonation Banner */}
      {impersonationSession && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-yellow-800 font-semibold">
              👤 You are viewing as:{" "}
              <span className="font-bold">
                {impersonationSession.impersonatedEmail}
              </span>
            </div>
            <Button
              onClick={handleStopImpersonation}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Stop Impersonating
            </Button>
          </div>
        </div>
      )}

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
              onClick={() => navigate("/?newProject=true")}
              className="bg-green-600 hover:bg-green-700 text-white text-sm md:text-base"
              style={{ fontFamily: "Literata, serif" }}
            >
              + Create New Project
            </Button>
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
                  onClick={() => navigate("/?newProject=true")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Create New Project
                </Button>
              </div>
            ) : (
              <>
                <table className="w-full table-fixed">
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
                        Tier 1 Status
                      </th>
                      <th
                        className="px-6 py-3 text-left text-sm font-bold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Tier 2 Progress
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
                          {engagement.tier1_completed ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              ✓ Completed
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td
                          className="px-6 py-4 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all"
                                style={{
                                  width: `${((formProgressMap[engagement.id] || 0) / 30) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-gray-600 text-xs">
                              {formProgressMap[engagement.id] || 0}/30 questions
                            </span>
                          </div>
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
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const progress =
                                formProgressMap[engagement.id] || 0;
                              const tier1Done = engagement.tier1_completed;

                              // Priority 1: If Tier 2 is in progress, continue it
                              if (progress > 0 && progress < 30) {
                                return (
                                  <Button
                                    onClick={() => {
                                      window.location.href = `/?engagement=${engagement.id}`;
                                    }}
                                    className="bg-[#37306B] hover:bg-[#2C2758] text-white px-3 py-2 text-xs font-medium rounded"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    Continue Tier 2
                                  </Button>
                                );
                              }

                              // Priority 2: If Tier 2 is complete, show project details
                              if (progress >= 30) {
                                return (
                                  <Button
                                    onClick={() =>
                                      navigate(
                                        `/project/lifecycle/${engagement.id}`,
                                      )
                                    }
                                    className="bg-[#37306B] hover:bg-[#2C2758] text-white px-3 py-2 text-xs font-medium rounded"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    View Details
                                  </Button>
                                );
                              }

                              // Priority 3: If Tier 1 not done, show Fill Tier 1
                              if (!tier1Done) {
                                return (
                                  <Button
                                    onClick={() =>
                                      navigate(`/project/${engagement.id}/tier1`)
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-medium rounded"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    Fill Tier 1
                                  </Button>
                                );
                              }

                              // Priority 4: If Tier 1 done but Tier 2 not started, show Start Tier 2
                              return (
                                <Button
                                  onClick={() => {
                                    window.location.href = `/?engagement=${engagement.id}`;
                                  }}
                                  className="bg-[#37306B] hover:bg-[#2C2758] text-white px-3 py-2 text-xs font-medium rounded"
                                  style={{ fontFamily: "Literata, serif" }}
                                >
                                  Start Tier 2
                                </Button>
                              );
                            })()}
                            <Button
                              onClick={() =>
                                handleDeleteProject(
                                  engagement.id,
                                  engagement.project_name,
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                              title="Delete project"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm({
              isOpen: false,
              engagementId: null,
              projectName: null,
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to permanently delete "{deleteConfirm.projectName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-red-600 font-medium mb-2">
                All associated data will be permanently deleted, including:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                <li>Form responses and progress</li>
                <li>Stage completions</li>
                <li>Deliverables</li>
                <li>All project information</li>
              </ul>
            </div>
            <p className="font-semibold text-gray-900 text-sm">
              Are you absolutely sure you want to delete this project?
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
