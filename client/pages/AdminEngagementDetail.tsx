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
import Tier1AssessmentView from "@/components/Tier1AssessmentView";
import { adminLogout, isAdminAuthenticated } from "@/lib/admin-auth";

let adminSupabase: any = null;

const getAdminSupabase = () => {
  if (!adminSupabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceRoleKey =
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase URL and API key are required for admin operations",
      );
    }

    adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminSupabase;
};

interface Engagement {
  id: string;
  user_id: string;
  project_name: string;
  program: string | null;
  program_rationale: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface Stage {
  number: number;
  name: string;
  description: string;
  included: boolean;
  isLite: boolean;
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

interface Tier1Assessment {
  id: string;
  engagement_id: string;
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
  budget_aligned: boolean;
  has_mismatch: boolean;
  mismatch_type: string | null;
  reasoning: any;
  created_at: string;
  updated_at: string;
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

export default function AdminEngagementDetail() {
  const navigate = useNavigate();
  const { engagementId } = useParams<{ engagementId: string }>();
  const { toast } = useToast();

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tier1Assessment, setTier1Assessment] = useState<Tier1Assessment | null>(null);
  const [tier1Loading, setTier1Loading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [programRationale, setProgramRationale] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");

  // New deliverable form
  const [showNewDeliverableForm, setShowNewDeliverableForm] = useState<
    number | null
  >(null);
  const [newDeliverable, setNewDeliverable] = useState({
    title: "",
    description: "",
    url: "",
  });

  // Stage completion confirmation
  const [stageCompletionDialog, setStageCompletionDialog] = useState<{
    isOpen: boolean;
    stageNumber: number | null;
    clientSatisfied: boolean;
    feedbackComplete: boolean;
  }>({
    isOpen: false,
    stageNumber: null,
    clientSatisfied: false,
    feedbackComplete: false,
  });

  // Track completed stages and expanded stages
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [expandedStages, setExpandedStages] = useState<number[]>([]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }

    if (engagementId) {
      fetchEngagementData();
    }
  }, [navigate, engagementId]);

  const fetchEngagementData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      // Fetch engagement
      const { data: engagementData, error: engagementError } = await client
        .from("engagements")
        .select("*")
        .eq("id", engagementId)
        .single();

      if (engagementError) throw engagementError;

      // Enrich with user info
      if (engagementData) {
        const { data: signupData } = await client
          .from("signups")
          .select("email, name")
          .eq("user_id", engagementData.user_id)
          .single();

        const enriched = {
          ...engagementData,
          user_email: signupData?.email || "Unknown",
          user_name: signupData?.name || "Unknown",
        };

        setEngagement(enriched);
        setEditedProjectName(enriched.project_name);
        setSelectedProgram(enriched.program);
        setProgramRationale(enriched.program_rationale || "");
      }

      // Fetch Tier 1 assessment if exists
      setTier1Loading(true);
      try {
        const { data: tier1Data } = await client
          .from("tier1_assessments")
          .select("*")
          .eq("engagement_id", engagementId)
          .maybeSingle();

        if (tier1Data) {
          setTier1Assessment(tier1Data);
        }
      } catch (tier1Error) {
        console.error("Error fetching Tier 1 assessment:", tier1Error);
      } finally {
        setTier1Loading(false);
      }

      // Fetch deliverables
      const { data: deliverableData, error: deliverableError } = await client
        .from("deliverables")
        .select("*")
        .eq("engagement_id", engagementId)
        .order("stage_number", { ascending: true });

      if (deliverableError) throw deliverableError;
      setDeliverables(deliverableData || []);

      // Fetch stage coverage if program is set
      if (engagementData?.program) {
        await fetchStageCoverage(engagementData.program);
      } else {
        // Show all stages as not set
        const allStages: Stage[] = Array.from({ length: 8 }, (_, i) => ({
          number: i,
          name: STAGE_NAMES[i],
          description: STAGE_DESCRIPTIONS[i],
          included: true,
          isLite: false,
        }));
        setStages(allStages);
      }

      // Fetch completed stages
      const { data: completionData, error: completionError } = await client
        .from("stage_completion")
        .select("stage_number")
        .eq("engagement_id", engagementId)
        .order("stage_number", { ascending: true });

      if (completionError) throw completionError;
      setCompletedStages(completionData?.map((c) => c.stage_number) || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch engagement data");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStageCoverage = async (program: string) => {
    try {
      const client = getAdminSupabase();
      const { data: coverageData, error: coverageError } = await client
        .from("stage_coverage")
        .select("*")
        .eq("program", program)
        .order("stage_number", { ascending: true });

      if (coverageError) throw coverageError;

      const stagesMap: Record<number, Stage> = {};
      if (coverageData) {
        coverageData.forEach((coverage) => {
          stagesMap[coverage.stage_number] = {
            number: coverage.stage_number,
            name: STAGE_NAMES[coverage.stage_number],
            description: STAGE_DESCRIPTIONS[coverage.stage_number],
            included: coverage.is_included,
            isLite: coverage.is_lite,
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
          }
        );
      });

      setStages(allStages);
    } catch (err) {
      console.error("Error fetching stage coverage:", err);
    }
  };

  const handleProgramChange = async (program: string) => {
    if (!engagement) return;

    // Just select the program - rationale is filled afterward
    setSelectedProgram(program);
    setError(null);
  };

  const handleSaveProgramWithRationale = async () => {
    if (!engagement || !selectedProgram) return;

    if (!programRationale.trim()) {
      setError(
        "Please provide a rationale/decision notes explaining why this program was chosen",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      // Update engagement with selected program and rationale
      const { error: updateError } = await client
        .from("engagements")
        .update({
          program: selectedProgram,
          program_rationale: programRationale,
        })
        .eq("id", engagement.id);

      if (updateError) throw updateError;

      setEngagement({
        ...engagement,
        program: selectedProgram,
        program_rationale: programRationale,
      });
      await fetchStageCoverage(selectedProgram);

      // Create client notification for program assignment
      try {
        const { error: notifError } = await client
          .from("client_notifications")
          .insert({
            engagement_id: engagement.id,
            user_id: engagement.user_id,
            type: "program_assigned",
            title: `Your Program Has Been Selected!`,
            message: `Your project has been assigned to the ${selectedProgram.charAt(0).toUpperCase() + selectedProgram.slice(1)} program`,
            related_stage_number: 0,
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }
      } catch (notifError: any) {
        console.error("Error creating client notification:", notifError);
      }

      // Send email notification to client
      try {
        await fetch("/api/engagement-program", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engagement_id: engagement.id,
            program: selectedProgram,
            user_id: engagement.user_id,
            project_name: engagement.project_name,
            user_email: engagement.user_email,
            user_name: engagement.user_name,
          }),
        });
      } catch (notificationError: any) {
        console.error("Error sending notification:", notificationError);
        // Don't block the program assignment if notification fails
      }
    } catch (err: any) {
      setError(err.message || "Failed to update program");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetProgram = async () => {
    if (!engagement) return;

    // Check if there are any deliverables
    if (deliverables.length > 0) {
      setError(
        "Cannot reset program when deliverables exist. Please delete all deliverables first.",
      );
      return;
    }

    if (!confirm("Are you sure you want to reset the program selection?"))
      return;

    setIsSaving(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      const { error: updateError } = await client
        .from("engagements")
        .update({ program: null, program_rationale: null })
        .eq("id", engagement.id);

      if (updateError) throw updateError;

      setSelectedProgram(null);
      setProgramRationale("");
      setEngagement({ ...engagement, program: null, program_rationale: null });

      // Reset stages
      const allStages: Stage[] = Array.from({ length: 8 }, (_, i) => ({
        number: i,
        name: STAGE_NAMES[i],
        description: STAGE_DESCRIPTIONS[i],
        included: true,
        isLite: false,
      }));
      setStages(allStages);
    } catch (err: any) {
      setError(err.message || "Failed to reset program");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProjectName = async () => {
    if (!editedProjectName.trim()) {
      setError("Project name cannot be empty");
      return;
    }

    if (!engagement) return;

    setIsSaving(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      const { error: updateError } = await client
        .from("engagements")
        .update({ project_name: editedProjectName })
        .eq("id", engagement.id);

      if (updateError) throw updateError;

      setEngagement({ ...engagement, project_name: editedProjectName });
      setIsEditingProjectName(false);
    } catch (err: any) {
      setError(err.message || "Failed to update project name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDeliverable = async (stageNumber: number) => {
    if (!newDeliverable.title.trim()) {
      alert("Please enter a title for the deliverable");
      return;
    }

    if (!newDeliverable.url.trim()) {
      alert("Please enter a URL for the deliverable");
      return;
    }

    if (!engagement) return;

    setIsSaving(true);
    try {
      const client = getAdminSupabase();

      const { data: deliverableData, error: insertError } = await client
        .from("deliverables")
        .insert({
          engagement_id: engagement.id,
          stage_number: stageNumber,
          title: newDeliverable.title,
          description: newDeliverable.description || null,
          url: newDeliverable.url,
          visible_to_client: true,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Create client notification
      if (deliverableData) {
        const { error: notifError } = await client
          .from("client_notifications")
          .insert({
            engagement_id: engagement.id,
            user_id: engagement.user_id,
            type: "deliverable_added",
            title: `New Deliverable in ${STAGE_NAMES[stageNumber]}`,
            message: `${newDeliverable.title} has been added to your project`,
            related_stage_number: stageNumber,
            related_deliverable_id: deliverableData.id,
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      // Reset form and fetch updated data
      setNewDeliverable({ title: "", description: "", url: "" });
      setShowNewDeliverableForm(null);
      await fetchEngagementData();

      // Send email notification to client
      try {
        await fetch("/api/deliverable-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engagement_id: engagement.id,
            deliverable_title: newDeliverable.title,
            stage_name: STAGE_NAMES[stageNumber],
            project_name: engagement.project_name,
            user_email: engagement.user_email,
            user_name: engagement.user_name,
          }),
        });
      } catch (notificationError: any) {
        console.error("Error sending notification:", notificationError);
        // Don't block the deliverable addition if notification fails
      }
    } catch (err: any) {
      setError(err.message || "Failed to add deliverable");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;

    setIsSaving(true);
    try {
      const client = getAdminSupabase();

      const { error: deleteError } = await client
        .from("deliverables")
        .delete()
        .eq("id", deliverableId);

      if (deleteError) throw deleteError;

      await fetchEngagementData();
    } catch (err: any) {
      setError(err.message || "Failed to delete deliverable");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkStageComplete = async (stageNumber: number) => {
    setStageCompletionDialog({
      isOpen: true,
      stageNumber,
      clientSatisfied: false,
      feedbackComplete: false,
    });
  };

  const handleConfirmStageCompletion = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!engagement || !stageCompletionDialog.stageNumber) {
      console.error("Missing engagement or stage number");
      return;
    }

    if (
      !stageCompletionDialog.clientSatisfied ||
      !stageCompletionDialog.feedbackComplete
    ) {
      toast({
        title: "Missing Confirmation",
        description:
          "Please confirm both that the client is satisfied and all feedback is complete.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log("Inserting stage completion for stage:", stageCompletionDialog.stageNumber);
      const client = getAdminSupabase();

      const { data, error } = await client.from("stage_completion").insert({
        engagement_id: engagement.id,
        stage_number: stageCompletionDialog.stageNumber,
      }).select();

      console.log("Insert result:", { data, error });

      if (error && error.code !== "23505") {
        console.error("Insert error:", error);
        throw error;
      }

      const stageName = STAGE_NAMES[stageCompletionDialog.stageNumber];
      toast({
        title: "✓ Stage Completed",
        description: `${stageName} has been marked as complete.`,
      });

      setStageCompletionDialog({
        isOpen: false,
        stageNumber: null,
        clientSatisfied: false,
        feedbackComplete: false,
      });

      console.log("Refreshing engagement data...");
      await fetchEngagementData();
      console.log("Engagement data refreshed");
    } catch (err: any) {
      console.error("Error in handleConfirmStageCompletion:", err);
      const errorMsg = err?.message || err?.details || JSON.stringify(err);
      toast({
        title: "Error",
        description: errorMsg || "Failed to mark stage complete",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAEE] flex items-center justify-center">
        <p style={{ fontFamily: "Literata, serif" }}>Loading engagement...</p>
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
            Engagement not found
          </p>
          <Button
            onClick={() => navigate("/admin/engagements")}
            className="bg-[#37306B] hover:bg-[#2C2758] text-white"
          >
            Back to Engagements
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1
              className="text-3xl font-bold cursor-pointer hover:text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
              onClick={() => navigate("/admin/dashboard")}
            >
              Admin Dashboard
            </h1>
            <span className="text-gray-400">/</span>
            <button
              onClick={() => navigate("/admin/engagements")}
              className="text-xl font-bold text-gray-600 hover:text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Engagements
            </button>
            <span className="text-gray-400">/</span>
            <h2
              className="text-xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagement.project_name}
            </h2>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white"
            style={{ fontFamily: "Literata, serif" }}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Engagement Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Project Name
              </p>
              {isEditingProjectName ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={editedProjectName}
                    onChange={(e) => setEditedProjectName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#37306B]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  />
                  <button
                    onClick={handleSaveProjectName}
                    disabled={isSaving}
                    className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProjectName(false);
                      setEditedProjectName(engagement.project_name);
                    }}
                    disabled={isSaving}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p
                    className="text-2xl font-bold"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    {engagement.project_name}
                  </p>
                  <button
                    onClick={() => setIsEditingProjectName(true)}
                    className="text-[#37306B] hover:underline text-sm font-bold"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Client
              </p>
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {engagement.user_name}
              </p>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                {engagement.user_email}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Created
              </p>
              <p className="text-lg" style={{ fontFamily: "Literata, serif" }}>
                {new Date(engagement.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Program Status
              </p>
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {selectedProgram
                  ? selectedProgram.charAt(0).toUpperCase() +
                    selectedProgram.slice(1)
                  : "Not Set"}
              </p>
            </div>
          </div>
        </div>

        {/* Tier 1 Assessment Section */}
        <Tier1AssessmentView
          assessment={tier1Assessment}
          isLoading={tier1Loading}
          onViewFullAssessment={(assessmentId) =>
            navigate(`/admin/tier1/${assessmentId}`)
          }
        />

        {/* Stage 0: Program Selection & Decision */}
        <div className={`rounded-lg shadow p-6 mb-8 ${
          completedStages.includes(0) ? "bg-green-50" : "bg-white"
        }`}>
          <div className={`pb-6 border-b mb-6 ${completedStages.includes(0) ? "border-green-400" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-2xl font-bold ${
                  completedStages.includes(0) ? "text-green-700" : "text-[#37306B]"
                }`}
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                Stage 0
              </span>
              {completedStages.includes(0) ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-200 text-green-800">
                  ✓ Completed
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Program Selection & Decision
                </span>
              )}
            </div>
            <h4
              className="text-xl font-bold"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Deep Discovery & Package Decision
            </h4>
            <p
              className="text-gray-600 text-sm mt-2"
              style={{ fontFamily: "Literata, serif" }}
            >
              {STAGE_DESCRIPTIONS[0]}
            </p>
          </div>

          {/* Program Selection Buttons */}
          <div className="mb-6">
            <h5
              className="font-bold text-gray-700 mb-3"
              style={{ fontFamily: "Literata, serif" }}
            >
              Select Program Package
              {tier1Assessment && (
                <span className="ml-2 text-xs text-blue-600 font-semibold">
                  (Recommended by Tier 1: {tier1Assessment.recommended_package})
                </span>
              )}
            </h5>
            {tier1Assessment && (
              <p
                className="text-xs text-blue-600 mb-3"
                style={{ fontFamily: "Literata, serif" }}
              >
                💡 Tip: Based on Tier 1 assessment, {tier1Assessment.recommended_package} is recommended. You can override if needed.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["foundation", "growth", "performance"].map((program) => (
                <button
                  key={program}
                  onClick={() => handleProgramChange(program)}
                  disabled={isSaving}
                  className={`p-4 rounded-lg border-2 font-bold transition-all ${
                    selectedProgram === program
                      ? "border-[#37306B] bg-[#37306B] text-white"
                      : "border-gray-300 bg-white text-[#37306B] hover:border-[#37306B]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  {program.charAt(0).toUpperCase() + program.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Decision Rationale Notes - Only visible after program selection */}
          {selectedProgram && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h5
                className="font-bold text-gray-700 mb-2"
                style={{ fontFamily: "Literata, serif" }}
              >
                Why This Program? (Decision Rationale - Required)
              </h5>
              <p
                className="text-sm text-gray-600 mb-3"
                style={{ fontFamily: "Literata, serif" }}
              >
                Explain why you selected{" "}
                {selectedProgram.charAt(0).toUpperCase() +
                  selectedProgram.slice(1)}{" "}
                and how you arrived at this decision.
              </p>
              <textarea
                value={programRationale}
                onChange={(e) => setProgramRationale(e.target.value)}
                placeholder="Explain the decision rationale, discussion points, and why this program is the right fit for the client..."
                className="w-full px-3 py-2 border border-gray-300 rounded min-h-[120px] focus:outline-none focus:border-[#37306B]"
                style={{ fontFamily: "Literata, serif" }}
              />
              <p
                className={`text-xs mt-2 ${
                  programRationale.trim() ? "text-green-600" : "text-red-600"
                }`}
                style={{ fontFamily: "Literata, serif" }}
              >
                {programRationale.trim()
                  ? "✓ Rationale notes provided"
                  : "⚠ Required before confirming program"}
              </p>

              {/* Confirm Program Button */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveProgramWithRationale}
                  disabled={isSaving || !programRationale.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Confirm Program Selection
                </button>
                <button
                  onClick={() => {
                    setSelectedProgram(null);
                    setProgramRationale("");
                  }}
                  disabled={isSaving}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Change Program
                </button>
              </div>
            </div>
          )}

          {/* Program Status - Shows when confirmed */}
          {engagement?.program && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <p
                className="text-green-700 text-sm font-bold mb-2"
                style={{ fontFamily: "Literata, serif" }}
              >
                ✓ Program confirmed:{" "}
                {engagement.program.charAt(0).toUpperCase() +
                  engagement.program.slice(1)}
              </p>
              <p
                className="text-green-700 text-xs"
                style={{ fontFamily: "Literata, serif" }}
              >
                Rationale: {engagement.program_rationale}
              </p>
            </div>
          )}

          {/* Reset Program Button */}
          {engagement?.program && deliverables.length === 0 && (
            <div className="mb-6">
              <button
                onClick={handleResetProgram}
                disabled={isSaving}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                style={{ fontFamily: "Literata, serif" }}
              >
                Reset Program to None
              </button>
              <p
                className="text-xs text-gray-500 mt-2"
                style={{ fontFamily: "Literata, serif" }}
              >
                Only available when no deliverables exist
              </p>
            </div>
          )}

          {/* Stage 0 Deliverables */}
          <div className="mt-6 pt-6 border-t">
            <h5
              className="font-bold text-gray-700 mb-3"
              style={{ fontFamily: "Literata, serif" }}
            >
              Decision Documentation (Deliverables)
            </h5>

            {deliverables.filter((d) => d.stage_number === 0).length > 0 ? (
              <div className="space-y-3 mb-4">
                {deliverables
                  .filter((d) => d.stage_number === 0)
                  .map((deliverable) => (
                    <div
                      key={deliverable.id}
                      className="bg-gray-50 p-4 rounded border border-gray-200 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p
                          className="font-bold text-gray-800"
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          {deliverable.title}
                        </p>
                        {deliverable.description && (
                          <p
                            className="text-sm text-gray-600 mt-1"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {deliverable.description}
                          </p>
                        )}
                        {deliverable.url && (
                          <a
                            href={deliverable.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#37306B] hover:underline mt-2 break-all"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {deliverable.url}
                          </a>
                        )}
                        {deliverable.original_filename && (
                          <p
                            className="text-xs text-gray-500 mt-1"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            File: {deliverable.original_filename}
                          </p>
                        )}
                        <span
                          className={`inline-block text-xs font-bold mt-2 px-2 py-1 rounded ${
                            deliverable.visible_to_client
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {deliverable.visible_to_client ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDeliverable(deliverable.id)}
                        disabled={isSaving}
                        className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p
                className="text-gray-400 italic text-sm mb-4"
                style={{ fontFamily: "Literata, serif" }}
              >
                No decision documentation added yet
              </p>
            )}

            {/* Add Stage 0 Deliverable */}
            {showNewDeliverableForm === 0 ? (
              <div className="bg-gray-50 p-4 rounded border-2 border-[#37306B]">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Document title"
                    value={newDeliverable.title}
                    onChange={(e) =>
                      setNewDeliverable({
                        ...newDeliverable,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#37306B]"
                    style={{ fontFamily: "Literata, serif" }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newDeliverable.description}
                    onChange={(e) =>
                      setNewDeliverable({
                        ...newDeliverable,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded min-h-[80px] focus:outline-none focus:border-[#37306B]"
                    style={{ fontFamily: "Literata, serif" }}
                  />
                  <input
                    type="url"
                    placeholder="URL or file link"
                    value={newDeliverable.url}
                    onChange={(e) =>
                      setNewDeliverable({
                        ...newDeliverable,
                        url: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#37306B]"
                    style={{ fontFamily: "Literata, serif" }}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddDeliverable(0)}
                    disabled={isSaving}
                    className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Add Document
                  </button>
                  <button
                    onClick={() => {
                      setShowNewDeliverableForm(null);
                      setNewDeliverable({
                        title: "",
                        description: "",
                        url: "",
                      });
                    }}
                    disabled={isSaving}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewDeliverableForm(0)}
                disabled={isSaving}
                className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                style={{ fontFamily: "Literata, serif" }}
              >
                + Add Decision Document
              </button>
            )}

            {/* Mark Stage 0 Complete Button */}
            {!completedStages.includes(0) &&
              deliverables.filter((d) => d.stage_number === 0).length > 0 && (
              <button
                onClick={() => handleMarkStageComplete(0)}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white w-full px-4 py-2 rounded font-bold text-sm disabled:opacity-50 mt-4"
                style={{ fontFamily: "Literata, serif" }}
              >
                ✓ Mark This Stage Complete
              </button>
            )}
          </div>
        </div>

        {/* Stages and Deliverables */}
        {!engagement?.program && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p
              className="text-blue-800 font-bold"
              style={{ fontFamily: "Literata, serif" }}
            >
              Confirm a program package with decision rationale in Stage 0 above
              to view the remaining stages.
            </p>
          </div>
        )}
        {engagement?.program && (
          <div className="space-y-6">
            <h3
              className="text-2xl font-bold"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Program Stages (Stages 1-7)
            </h3>
            {stages
              .filter((s) => s.number > 0)
              .map((stage) => {
                const isStageCompleted = completedStages.includes(stage.number);
                const isStageExpanded = expandedStages.includes(stage.number);
                const toggleExpand = () => {
                  setExpandedStages((prev) =>
                    prev.includes(stage.number)
                      ? prev.filter((s) => s !== stage.number)
                      : [...prev, stage.number]
                  );
                };
                return (
                <div
                  key={stage.number}
                  className={`rounded-lg shadow ${
                    isStageCompleted ? "bg-green-50" : "bg-white"
                  }`}
                >
                  {/* Stage Header - Clickable for expand/collapse */}
                  <div
                    onClick={toggleExpand}
                    className={`p-6 cursor-pointer transition-all ${
                      isStageCompleted ? "bg-green-50 border-b-2 border-green-400" : "border-b"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`text-2xl font-bold ${
                              isStageCompleted ? "text-green-700" : "text-[#37306B]"
                            }`}
                            style={{ fontFamily: "Epilogue, sans-serif" }}
                          >
                            Stage {stage.number}
                          </span>
                          {isStageCompleted && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-200 text-green-800">
                              ✓ Completed
                            </span>
                          )}
                          {!isStageCompleted && stage.included && (
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
                          {!isStageCompleted && !stage.included && selectedProgram && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                              Not Included
                            </span>
                          )}
                        </div>
                        <h4
                          className={`text-xl font-bold ${
                            isStageCompleted ? "text-green-700" : ""
                          }`}
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          {stage.name}
                        </h4>
                      </div>
                      <span className={`text-2xl transition-transform ${isStageExpanded ? "" : "rotate-90"}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Deliverables List - Only show if expanded or not completed */}
                  {(isStageExpanded || !isStageCompleted) && (
                  <div className="p-6 mb-6">
                    <h5
                      className="font-bold text-gray-700 mb-3"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Deliverables
                    </h5>

                    {deliverables.filter((d) => d.stage_number === stage.number)
                      .length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {deliverables
                          .filter((d) => d.stage_number === stage.number)
                          .map((deliverable) => (
                            <div
                              key={deliverable.id}
                              className="bg-gray-50 p-4 rounded border border-gray-200 flex items-start justify-between"
                            >
                              <div className="flex-1">
                                <p
                                  className="font-bold text-gray-800"
                                  style={{ fontFamily: "Epilogue, sans-serif" }}
                                >
                                  {deliverable.title}
                                </p>
                                {deliverable.description && (
                                  <p
                                    className="text-sm text-gray-600 mt-1"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    {deliverable.description}
                                  </p>
                                )}
                                {deliverable.url && (
                                  <a
                                    href={deliverable.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-[#37306B] hover:underline mt-2 break-all"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    {deliverable.url}
                                  </a>
                                )}
                                {deliverable.original_filename && (
                                  <p
                                    className="text-xs text-gray-500 mt-1"
                                    style={{ fontFamily: "Literata, serif" }}
                                  >
                                    File: {deliverable.original_filename}
                                  </p>
                                )}
                                <span
                                  className={`inline-block text-xs font-bold mt-2 px-2 py-1 rounded ${
                                    deliverable.visible_to_client
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-200 text-gray-800"
                                  }`}
                                >
                                  {deliverable.visible_to_client
                                    ? "Visible"
                                    : "Hidden"}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleDeleteDeliverable(deliverable.id)
                                }
                                disabled={isSaving}
                                className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                                style={{ fontFamily: "Literata, serif" }}
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p
                        className="text-gray-400 italic text-sm mb-4"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        No deliverables added yet
                      </p>
                    )}

                    {/* Add Deliverable Form */}
                    {showNewDeliverableForm === stage.number ? (
                      <div className="bg-gray-50 p-4 rounded border-2 border-[#37306B]">
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Deliverable title"
                            value={newDeliverable.title}
                            onChange={(e) =>
                              setNewDeliverable({
                                ...newDeliverable,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#37306B]"
                            style={{ fontFamily: "Literata, serif" }}
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={newDeliverable.description}
                            onChange={(e) =>
                              setNewDeliverable({
                                ...newDeliverable,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded min-h-[80px] focus:outline-none focus:border-[#37306B]"
                            style={{ fontFamily: "Literata, serif" }}
                          />
                          <input
                            type="url"
                            placeholder="URL or file link"
                            value={newDeliverable.url}
                            onChange={(e) =>
                              setNewDeliverable({
                                ...newDeliverable,
                                url: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#37306B]"
                            style={{ fontFamily: "Literata, serif" }}
                          />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAddDeliverable(stage.number)}
                            disabled={isSaving}
                            className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            Add Deliverable
                          </button>
                          <button
                            onClick={() => {
                              setShowNewDeliverableForm(null);
                              setNewDeliverable({
                                title: "",
                                description: "",
                                url: "",
                              });
                            }}
                            disabled={isSaving}
                            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewDeliverableForm(stage.number)}
                        disabled={isSaving}
                        className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        + Add Deliverable
                      </button>
                    )}

                    {/* Mark Stage Complete Button */}
                    {!isStageCompleted &&
                      stage.included &&
                      deliverables.filter((d) => d.stage_number === stage.number)
                        .length > 0 && (
                        <button
                          onClick={() => handleMarkStageComplete(stage.number)}
                          disabled={isSaving}
                          className="bg-green-600 hover:bg-green-700 text-white w-full px-4 py-2 rounded font-bold text-sm disabled:opacity-50 mt-4"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          ✓ Mark This Stage Complete
                        </button>
                      )}
                  </div>
                  )}
                </div>
                );
              })}
          </div>
        )}

        {/* Stage Completion Confirmation Dialog */}
        <AlertDialog
          open={stageCompletionDialog.isOpen}
          onOpenChange={(isOpen) =>
            setStageCompletionDialog((prev) => ({ ...prev, isOpen }))
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ fontFamily: "Epilogue, sans-serif" }}>
                Mark Stage Complete
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{ fontFamily: "Literata, serif" }}
              >
                Before marking this stage as complete, please confirm:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stageCompletionDialog.clientSatisfied}
                  onChange={(e) =>
                    setStageCompletionDialog((prev) => ({
                      ...prev,
                      clientSatisfied: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span
                  style={{ fontFamily: "Literata, serif" }}
                  className="text-sm"
                >
                  Client has confirmed satisfaction with this stage deliverables
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stageCompletionDialog.feedbackComplete}
                  onChange={(e) =>
                    setStageCompletionDialog((prev) => ({
                      ...prev,
                      feedbackComplete: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span
                  style={{ fontFamily: "Literata, serif" }}
                  className="text-sm"
                >
                  All client feedback has been addressed
                </span>
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                style={{ fontFamily: "Literata, serif" }}
                disabled={isSaving}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStageCompletion}
                disabled={
                  isSaving ||
                  !stageCompletionDialog.clientSatisfied ||
                  !stageCompletionDialog.feedbackComplete
                }
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                style={{ fontFamily: "Literata, serif" }}
              >
                Mark Complete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
