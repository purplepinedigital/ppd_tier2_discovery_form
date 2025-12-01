import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  getImpersonationSession,
  clearImpersonationSession,
  isImpersonating,
} from "@/lib/admin-impersonate";

const getAdminSupabase = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

interface Engagement {
  id: string;
  user_id: string;
  project_name: string;
  program: string | null;
  program_rationale: string | null;
  created_at: string;
  updated_at: string;
  tier1_completed: boolean;
  tier1_assessment_id: string | null;
  recommended_package: string | null;
}

interface Tier1Assessment {
  id: string;
  project_name: string;
  business_name: string;
  industry: string;
  phone: string;
  current_state: string;
  needs_array: string[];
  website_scope: string;
  marketing_timing: string;
  budget_range: string;
  timeline_expectation: string;
  target_date: string | null;
  primary_goal: string;
  recommended_package: string;
  recommendation_confidence: string;
}

interface Stage {
  number: number;
  name: string;
  description: string;
  included: boolean;
  isLite: boolean;
  completed: boolean;
}

interface Deliverable {
  id: string;
  engagement_id: string;
  stage_number: number;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  original_filename: string | null;
  visible_to_client: boolean;
}

interface StageCompletion {
  id: string;
  engagement_id: string;
  stage_number: number;
  completed_at: string;
}

interface ClientFeedback {
  id: string;
  deliverable_id: string;
  feedback_text: string;
  rating: number | null;
  created_at: string;
}

const STAGE_DESCRIPTIONS: Record<number, string> = {
  0: "Deep Discovery & Package Decision - Initial discovery phase to determine program fit",
  1: "Identity & Positioning - Define who you are and where you fit in the market",
  2: "Visual Identity & Branding - Create your visual language and brand guidelines",
  3: "Basic Presence - Set up directories and social media profiles",
  4: "Website (Digital Home) - Build your digital home and online presence",
  5: "Reach & Visibility - Launch marketing activation and visibility campaigns",
  6: "Conversion Systems - Implement conversion optimization and systems",
  7: "Retention & Growth - Build loyalty programs and growth strategies",
};

const STAGE_NAMES: Record<number, string> = {
  0: "Deep Discovery & Package Decision",
  1: "Identity & Positioning",
  2: "Visual Identity & Branding",
  3: "Basic Presence",
  4: "Website (Digital Home)",
  5: "Reach & Visibility",
  6: "Conversion Systems",
  7: "Retention & Growth",
};

export default function ProjectLifecycle() {
  const navigate = useNavigate();
  const { engagementId } = useParams<{ engagementId: string }>();
  const { toast } = useToast();

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [tier1Assessment, setTier1Assessment] =
    useState<Tier1Assessment | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [completions, setCompletions] = useState<StageCompletion[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, ClientFeedback[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [editingPackage, setEditingPackage] = useState(false);
  const [newPackage, setNewPackage] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const impersonation = getImpersonationSession();

        // If impersonating, use the impersonated user ID
        if (impersonation) {
          setCurrentUser(impersonation.adminUserId);
          if (engagementId) {
            await fetchEngagementData(impersonation.impersonatedUserId);
          }
          return;
        }

        // Otherwise, get the current logged-in user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        setCurrentUser(user.id);

        if (engagementId) {
          await fetchEngagementData(user.id);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuthAndFetchData();
  }, [navigate, engagementId]);

  const fetchEngagementData = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use admin client if impersonating to bypass RLS policies
      const client = isImpersonating()
        ? getAdminSupabase() || supabase
        : supabase;

      // Fetch engagement
      try {
        console.log("Fetching engagement:", {
          engagementId,
          userId,
          isImpersonating: isImpersonating(),
        });
        const { data: engagementData, error: engagementError } = await client
          .from("engagements")
          .select("*")
          .eq("id", engagementId)
          .eq("user_id", userId)
          .maybeSingle();

        console.log("Engagement fetch result:", {
          data: engagementData,
          error: engagementError,
        });

        if (engagementError) {
          console.error("Engagement fetch error:", engagementError);
          if (engagementError.code === "PGRST116") {
            setError("Engagement not found or you don't have access to it");
          } else {
            setError(engagementError.message);
          }
          return;
        }

        if (!engagementData) {
          console.warn("No engagement data found for:", {
            engagementId,
            userId,
          });
          setError(`Engagement ${engagementId} not found for user ${userId}`);
          return;
        }

        if (engagementData) {
          setEngagement(engagementData);
          setNewPackage(engagementData.recommended_package);

          // Fetch Tier 1 assessment if completed
          if (engagementData.tier1_assessment_id) {
            try {
              const { data: tier1Data } = await client
                .from("tier1_assessments")
                .select("*")
                .eq("id", engagementData.tier1_assessment_id)
                .maybeSingle();

              if (tier1Data) {
                setTier1Assessment(tier1Data);
              }
            } catch (tier1Error) {
              console.error("Error fetching Tier 1 assessment:", tier1Error);
            }
          }

          // Fetch deliverables visible to client
          try {
            const { data: deliverableData } = await client
              .from("deliverables")
              .select("*")
              .eq("engagement_id", engagementId)
              .eq("visible_to_client", true)
              .order("stage_number", { ascending: true });

            setDeliverables(deliverableData || []);

            // Fetch stage completions
            try {
              const { data: completionData } = await client
                .from("stage_completion")
                .select("*")
                .eq("engagement_id", engagementId)
                .order("stage_number", { ascending: true });

              setCompletions(completionData || []);

              // Fetch feedback for all deliverables
              if (deliverableData && deliverableData.length > 0) {
                try {
                  const deliverableIds = deliverableData.map((d) => d.id);
                  const { data: feedbackData } = await client
                    .from("client_feedback")
                    .select("*")
                    .in("deliverable_id", deliverableIds);

                  const feedbackByDeliverable: Record<
                    string,
                    ClientFeedback[]
                  > = {};
                  if (feedbackData) {
                    feedbackData.forEach((feedback) => {
                      if (!feedbackByDeliverable[feedback.deliverable_id]) {
                        feedbackByDeliverable[feedback.deliverable_id] = [];
                      }
                      feedbackByDeliverable[feedback.deliverable_id].push(
                        feedback,
                      );
                    });
                  }
                  setFeedbackMap(feedbackByDeliverable);
                } catch (feedbackError) {
                  console.error("Error fetching feedback:", feedbackError);
                }
              }

              // Fetch stage coverage if program is set
              if (engagementData.program) {
                await fetchStageCoverage(
                  engagementData.program,
                  completionData || [],
                  client,
                );
              } else {
                const allStages: Stage[] = Array.from(
                  { length: 8 },
                  (_, i) => ({
                    number: i,
                    name: STAGE_NAMES[i],
                    description: STAGE_DESCRIPTIONS[i],
                    included: true,
                    isLite: false,
                    completed: (completionData || []).some(
                      (c) => c.stage_number === i,
                    ),
                  }),
                );
                setStages(allStages);
              }
            } catch (completionError) {
              console.error("Error fetching completions:", completionError);
            }
          } catch (deliverableError) {
            console.error("Error fetching deliverables:", deliverableError);
          }
        }
      } catch (engagementFetchError) {
        console.error("Error in engagement fetch:", engagementFetchError);
        setError(
          (engagementFetchError as any)?.message ||
            "Failed to fetch engagement",
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch engagement data");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStageCoverage = async (
    program: string,
    completions: StageCompletion[],
    client?: any,
  ) => {
    try {
      const supabaseClient = client || supabase;
      const { data: coverageData } = await supabaseClient
        .from("stage_coverage")
        .select("*")
        .eq("program", program)
        .order("stage_number", { ascending: true });

      const stagesMap: Record<number, Stage> = {};
      if (coverageData) {
        coverageData.forEach((coverage) => {
          stagesMap[coverage.stage_number] = {
            number: coverage.stage_number,
            name: STAGE_NAMES[coverage.stage_number],
            description: STAGE_DESCRIPTIONS[coverage.stage_number],
            included: coverage.is_included,
            isLite: coverage.is_lite,
            completed: completions.some(
              (c) => c.stage_number === coverage.stage_number,
            ),
          };
        });
      }

      const allStages = Array.from({ length: 8 }, (_, i) => {
        return (
          stagesMap[i] || {
            number: i,
            name: STAGE_NAMES[i],
            description: STAGE_DESCRIPTIONS[i],
            included: false,
            isLite: false,
            completed: completions.some((c) => c.stage_number === i),
          }
        );
      });

      setStages(allStages);
    } catch (err) {
      console.error("Error fetching stage coverage:", err);
    }
  };

  const handleLogout = async () => {
    if (isImpersonating()) {
      // If impersonating, just clear the session and redirect to admin
      clearImpersonationSession();
      window.location.href = "/admin/dashboard";
    } else {
      // Otherwise, sign out and go to home
      await supabase.auth.signOut();
      navigate("/");
    }
  };

  const handleMarkStageComplete = async (stageNumber: number) => {
    if (!engagement || !currentUser) return;

    try {
      const client = isImpersonating()
        ? getAdminSupabase() || supabase
        : supabase;

      const { error } = await client.from("stage_completion").insert({
        engagement_id: engagement.id,
        stage_number: stageNumber,
      });

      if (error && error.code !== "23505") {
        // 23505 is unique constraint violation (already completed)
        throw error;
      }

      // Refresh completions
      const { data: completionData } = await client
        .from("stage_completion")
        .select("*")
        .eq("engagement_id", engagement.id)
        .order("stage_number", { ascending: true });

      setCompletions(completionData || []);

      // Update stages to reflect completion
      setStages((prev) =>
        prev.map((s) =>
          s.number === stageNumber ? { ...s, completed: true } : s,
        ),
      );

      toast({
        title: "🎉 Milestone Reached!",
        description: `You've completed ${STAGE_NAMES[stageNumber]}!`,
      });
    } catch (err: any) {
      console.error("Error marking stage complete:", err);
      const errorMsg = err?.message || err?.details || JSON.stringify(err);
      toast({
        title: "Error",
        description: errorMsg || "Failed to update stage completion",
        variant: "destructive",
      });
    }
  };

  const handleMarkStageIncomplete = async (stageNumber: number) => {
    if (!engagement || !currentUser || isImpersonating()) return;

    try {
      const client = supabase;

      const { error } = await client
        .from("stage_completion")
        .delete()
        .eq("engagement_id", engagement.id)
        .eq("stage_number", stageNumber);

      if (error) throw error;

      // Refresh completions
      const { data: completionData } = await client
        .from("stage_completion")
        .select("*")
        .eq("engagement_id", engagement.id)
        .order("stage_number", { ascending: true });

      setCompletions(completionData || []);

      // Update stages to reflect incompletion
      setStages((prev) =>
        prev.map((s) =>
          s.number === stageNumber ? { ...s, completed: false } : s,
        ),
      );

      toast({
        title: "Stage marked incomplete",
        description: `${STAGE_NAMES[stageNumber]} has been marked as incomplete. Your team lead will be notified.`,
      });
    } catch (err: any) {
      console.error("Error marking stage incomplete:", err);
      const errorMsg = err?.message || err?.details || JSON.stringify(err);
      toast({
        title: "Error",
        description: errorMsg || "Failed to mark stage incomplete",
        variant: "destructive",
      });
    }
  };

  const handleAddFeedback = async (deliverableId: string) => {
    if (!engagement || !feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter feedback",
        variant: "destructive",
      });
      return;
    }

    try {
      const client = isImpersonating()
        ? getAdminSupabase() || supabase
        : supabase;

      const { error } = await client.from("client_feedback").insert({
        deliverable_id: deliverableId,
        engagement_id: engagement.id,
        feedback_text: feedbackText,
        rating: rating,
      });

      if (error) throw error;

      // Refresh feedback
      const { data: feedbackData } = await client
        .from("client_feedback")
        .select("*")
        .eq("deliverable_id", deliverableId);

      setFeedbackMap((prev) => ({
        ...prev,
        [deliverableId]: feedbackData || [],
      }));

      setFeedbackText("");
      setRating(null);
      setShowFeedback(null);

      toast({
        title: "✓ Feedback submitted",
        description: "Thank you for your feedback!",
      });
    } catch (err: any) {
      console.error("Error adding feedback:", err);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePackage = async () => {
    if (!engagement || !newPackage) return;

    try {
      const client = isImpersonating()
        ? getAdminSupabase() || supabase
        : supabase;

      const { error } = await client
        .from("engagements")
        .update({ recommended_package: newPackage })
        .eq("id", engagement.id);

      if (error) throw error;

      setEngagement({ ...engagement, recommended_package: newPackage });
      setEditingPackage(false);

      toast({
        title: "✓ Package updated",
        description: `Recommended package changed to ${newPackage}`,
      });
    } catch (err: any) {
      console.error("Error updating package:", err);
      toast({
        title: "Error",
        description: "Failed to update package",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = () => {
    const completedStages = completions.length;
    const totalStages = 8;
    return Math.round((completedStages / totalStages) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAEE] flex items-center justify-center">
        <p style={{ fontFamily: "Literata, serif" }}>Loading your project...</p>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="min-h-screen bg-[#FFFAEE] flex items-center justify-center">
        <div className="text-center">
          <p
            className="text-red-600 mb-4"
            style={{ fontFamily: "Literata, serif" }}
          >
            {error || "Project not found"}
          </p>
          <div className="flex gap-4 justify-center">
            {isImpersonating() ? (
              <>
                <Button
                  onClick={() => navigate("/project/journey")}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-white"
                >
                  Back to Projects
                </Button>
                <Button
                  onClick={() => {
                    clearImpersonationSession();
                    window.location.href = "/admin/dashboard";
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Stop Impersonating
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/project/journey")}
                className="bg-[#37306B] hover:bg-[#2C2758] text-white"
              >
                Back to Projects
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Impersonation Banner */}
      {isImpersonating() && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-yellow-800 font-semibold">
              👤 You are viewing as:{" "}
              <span className="font-bold">
                {getImpersonationSession()?.impersonatedEmail}
              </span>
            </div>
            <Button
              onClick={() => {
                clearImpersonationSession();
                window.location.href = "/admin/dashboard";
              }}
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
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
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
            <span className="text-gray-400">/</span>
            <h2
              className="text-lg md:text-xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagement.project_name}
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isImpersonating() && (
              <Button
                onClick={() => navigate("/?newProject=true")}
                className="bg-green-600 hover:bg-green-700 text-white text-sm md:text-base"
                style={{ fontFamily: "Literata, serif" }}
              >
                Start New Project
              </Button>
            )}
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm md:text-base"
              style={{ fontFamily: "Literata, serif" }}
            >
              {isImpersonating() ? "Back to Admin" : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Tier 1 Required Banner */}
        {engagement && !engagement.tier1_completed && (
          <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3
                  className="text-lg font-bold text-blue-900 mb-2"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  ⚠️ Complete Tier 1 Assessment First
                </h3>
                <p
                  className="text-blue-800 mb-4"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  To unlock the full potential of your project and proceed with
                  the program roadmap, you need to complete your Tier 1
                  assessment. This will help us understand your business, goals,
                  and recommend the best package for your needs.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/project/${engagement.id}/tier1`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm whitespace-nowrap flex-shrink-0"
                style={{ fontFamily: "Literata, serif" }}
              >
                → Complete Tier 1 Now
              </Button>
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Project Name
              </p>
              <p
                className="text-lg md:text-2xl font-bold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {engagement.project_name}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Program
              </p>
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {engagement.program
                  ? engagement.program.charAt(0).toUpperCase() +
                    engagement.program.slice(1)
                  : "Not Yet Set"}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Overall Progress
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#37306B] h-full transition-all"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <p
                  className="text-lg font-bold text-[#37306B] min-w-fit"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  {getProgressPercentage()}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle Stages */}
        <div className="space-y-4 md:space-y-6">
          <h3
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Your Lifecycle Roadmap
          </h3>

          {stages.map((stage) => {
            const stage0Completed = completions.some(
              (c) => c.stage_number === 0,
            );
            const shouldShowStage = stage.number === 0 || stage0Completed;

            if (!shouldShowStage) {
              return null;
            }

            return (
              <div
                key={stage.number}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Stage Header */}
                <div
                  className={`p-4 md:p-6 cursor-pointer border-l-4 transition-all ${
                    expandedStage === stage.number
                      ? "bg-gray-50"
                      : "hover:bg-gray-50"
                  } ${
                    stage.completed
                      ? "border-green-600 bg-green-50"
                      : "border-[#37306B]"
                  }`}
                  onClick={() =>
                    setExpandedStage(
                      expandedStage === stage.number ? null : stage.number,
                    )
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span
                          className="text-xl md:text-2xl font-bold text-[#37306B]"
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          Stage {stage.number}
                        </span>
                        {stage.included && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              stage.isLite
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {stage.isLite ? "Lite" : "Included"}
                          </span>
                        )}
                        {!stage.included && engagement.program && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                            Not Included
                          </span>
                        )}
                        {stage.completed && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                      <h4
                        className="text-lg md:text-xl font-bold"
                        style={{ fontFamily: "Epilogue, sans-serif" }}
                      >
                        {stage.name}
                      </h4>
                      <p
                        className="text-gray-600 text-sm mt-2"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        {stage.description}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="text-2xl">
                        {expandedStage === stage.number ? "−" : "+"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedStage === stage.number && (
                  <div className="border-t p-4 md:p-6 space-y-6">
                    {/* Stage 0 Special Content */}
                    {stage.number === 0 && (
                      <div className="space-y-6">
                        {/* Tier 1 Assessment Data */}
                        {tier1Assessment && (
                          <div className="bg-purple-50 border border-purple-200 rounded p-4">
                            <h5
                              className="font-bold text-purple-900 mb-4"
                              style={{ fontFamily: "Epilogue, sans-serif" }}
                            >
                              Tier 1 Assessment Data
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Business Name
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.business_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Industry
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.industry}
                                </p>
                              </div>
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Current State
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.current_state}
                                </p>
                              </div>
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Website Scope
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.website_scope}
                                </p>
                              </div>
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Timeline
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.timeline_expectation}
                                </p>
                              </div>
                              <div>
                                <p className="text-purple-700 font-semibold">
                                  Budget Range
                                </p>
                                <p className="text-purple-900">
                                  {tier1Assessment.budget_range}
                                </p>
                              </div>
                              {tier1Assessment.primary_goal && (
                                <div className="col-span-2">
                                  <p className="text-purple-700 font-semibold">
                                    Primary Goal
                                  </p>
                                  <p className="text-purple-900">
                                    {tier1Assessment.primary_goal}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Recommended Package */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                          <h5
                            className="font-bold text-blue-900 mb-3"
                            style={{ fontFamily: "Epilogue, sans-serif" }}
                          >
                            Recommended Package
                          </h5>
                          {!editingPackage ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-blue-800 font-semibold text-lg">
                                  {engagement.recommended_package || "Not set"}
                                </p>
                                {tier1Assessment && (
                                  <p className="text-blue-700 text-xs mt-1">
                                    Confidence:{" "}
                                    {tier1Assessment.recommendation_confidence}
                                  </p>
                                )}
                              </div>
                              <Button
                                onClick={() => setEditingPackage(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                              >
                                Update
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <select
                                value={newPackage || ""}
                                onChange={(e) => setNewPackage(e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded bg-white"
                              >
                                <option value="">Select package...</option>
                                <option value="FOUNDATION">Foundation</option>
                                <option value="GROWTH">Growth</option>
                                <option value="PERFORMANCE">Performance</option>
                              </select>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUpdatePackage}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingPackage(false);
                                    setNewPackage(
                                      engagement.recommended_package,
                                    );
                                  }}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Program Selection Rationale */}
                        {engagement.program && (
                          <div className="bg-cyan-50 border border-cyan-200 rounded p-4">
                            <h5
                              className="font-bold text-cyan-900 mb-2"
                              style={{ fontFamily: "Epilogue, sans-serif" }}
                            >
                              Program Selection Rationale
                            </h5>
                            <p
                              className="text-cyan-800 text-sm"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              {engagement.program_rationale ||
                                "No rationale provided yet"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Deliverables */}
                    <div>
                      <h5
                        className="font-bold text-gray-700 mb-3"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Deliverables
                      </h5>

                      {deliverables.filter(
                        (d) => d.stage_number === stage.number,
                      ).length > 0 ? (
                        <div className="space-y-3">
                          {deliverables
                            .filter((d) => d.stage_number === stage.number)
                            .map((deliverable) => (
                              <div
                                key={deliverable.id}
                                className="bg-gray-50 p-4 rounded border border-gray-200"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <p
                                      className="font-bold text-gray-800"
                                      style={{
                                        fontFamily: "Epilogue, sans-serif",
                                      }}
                                    >
                                      {deliverable.title}
                                    </p>
                                    {deliverable.description && (
                                      <p
                                        className="text-sm text-gray-600 mt-1"
                                        style={{
                                          fontFamily: "Literata, serif",
                                        }}
                                      >
                                        {deliverable.description}
                                      </p>
                                    )}
                                    {deliverable.url && (
                                      <a
                                        href={
                                          deliverable.url.startsWith(
                                            "http://",
                                          ) ||
                                          deliverable.url.startsWith("https://")
                                            ? deliverable.url
                                            : `https://${deliverable.url}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-[#37306B] hover:underline mt-2 break-all inline-block"
                                        style={{
                                          fontFamily: "Literata, serif",
                                        }}
                                      >
                                        📥 Download / View →
                                      </a>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() => {
                                      setShowFeedback(
                                        showFeedback === deliverable.id
                                          ? null
                                          : deliverable.id,
                                      );
                                    }}
                                    className="bg-[#37306B] hover:bg-[#2C2758] text-white text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 flex-shrink-0"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    💬 Feedback
                                  </Button>
                                </div>

                                {/* Existing Feedback */}
                                {feedbackMap[deliverable.id] &&
                                  feedbackMap[deliverable.id].length > 0 && (
                                    <div className="mt-4 pt-4 border-t space-y-2">
                                      {feedbackMap[deliverable.id].map((fb) => (
                                        <div
                                          key={fb.id}
                                          className="bg-white p-2 rounded text-xs"
                                        >
                                          {fb.rating && (
                                            <p className="text-yellow-500 mb-1">
                                              {"⭐".repeat(fb.rating)}
                                            </p>
                                          )}
                                          <p
                                            className="text-gray-700"
                                            style={{
                                              fontFamily: "Literata, serif",
                                            }}
                                          >
                                            {fb.feedback_text}
                                          </p>
                                          <p
                                            className="text-gray-400 text-xs mt-1"
                                            style={{
                                              fontFamily: "Literata, serif",
                                            }}
                                          >
                                            {new Date(
                                              fb.created_at,
                                            ).toLocaleDateString()}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                {/* Feedback Form */}
                                {showFeedback === deliverable.id && (
                                  <div className="mt-4 pt-4 border-t space-y-2">
                                    <textarea
                                      placeholder="Share your feedback..."
                                      value={feedbackText}
                                      onChange={(e) =>
                                        setFeedbackText(e.target.value)
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#37306B]"
                                      style={{ fontFamily: "Literata, serif" }}
                                    />
                                    <div className="flex gap-2 flex-wrap items-center">
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((r) => (
                                          <button
                                            key={r}
                                            onClick={() =>
                                              setRating(rating === r ? null : r)
                                            }
                                            className={`text-lg ${
                                              rating && rating >= r
                                                ? "text-yellow-500"
                                                : "text-gray-300"
                                            }`}
                                          >
                                            ⭐
                                          </button>
                                        ))}
                                      </div>
                                      <Button
                                        onClick={() =>
                                          handleAddFeedback(deliverable.id)
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                        style={{
                                          fontFamily: "Literata, serif",
                                        }}
                                      >
                                        Submit
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p
                          className="text-gray-400 italic text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          No deliverables yet. Check back soon!
                        </p>
                      )}
                    </div>

                    {/* Stage Status Buttons */}
                    <div className="space-y-2">
                      {/* Admin Only: Mark Complete Button */}
                      {!stage.completed &&
                        stage.included &&
                        isImpersonating() && (
                          <Button
                            onClick={() =>
                              handleMarkStageComplete(stage.number)
                            }
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            ✓ Mark This Stage Complete
                          </Button>
                        )}

                      {/* Client Only: Mark Incomplete Button */}
                      {stage.completed && !isImpersonating() && (
                        <Button
                          onClick={() =>
                            handleMarkStageIncomplete(stage.number)
                          }
                          className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          ↺ Mark This Stage Incomplete
                        </Button>
                      )}

                      {/* Admin Info */}
                      {!stage.completed &&
                        stage.included &&
                        !isImpersonating() && (
                          <p className="text-sm text-gray-600 italic">
                            This stage will be marked complete by your Purple
                            Pine Digital team lead after discussing with you.
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {getProgressPercentage() === 100 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-lg p-6 md:p-8 text-center">
            <p
              className="text-4xl mb-4"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              🎉🎊🏆
            </p>
            <h3
              className="text-2xl md:text-3xl font-bold text-green-700 mb-2"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Journey Complete!
            </h3>
            <p
              className="text-green-700 text-lg"
              style={{ fontFamily: "Literata, serif" }}
            >
              Congratulations! You've completed all stages of your lifecycle
              journey with us. We're excited about the amazing things you'll
              achieve with your new brand!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
