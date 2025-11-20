import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
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

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New deliverable form
  const [showNewDeliverableForm, setShowNewDeliverableForm] =
    useState<number | null>(null);
  const [newDeliverable, setNewDeliverable] = useState({
    title: "",
    description: "",
    url: "",
  });

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
        setSelectedProgram(enriched.program);
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

    setIsSaving(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      // Update engagement with new program
      const { error: updateError } = await client
        .from("engagements")
        .update({ program })
        .eq("id", engagement.id);

      if (updateError) throw updateError;

      setSelectedProgram(program);
      await fetchStageCoverage(program);

      // TODO: Send email notification to client
      console.log(`Program set to ${program} for engagement ${engagement.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to update program");
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

      const { error: insertError } = await client
        .from("deliverables")
        .insert({
          engagement_id: engagement.id,
          stage_number: stageNumber,
          title: newDeliverable.title,
          description: newDeliverable.description || null,
          url: newDeliverable.url,
          visible_to_client: true,
        });

      if (insertError) throw insertError;

      // Reset form and fetch updated data
      setNewDeliverable({ title: "", description: "", url: "" });
      setShowNewDeliverableForm(null);
      await fetchEngagementData();

      // TODO: Send email notification to client
      console.log(
        `Deliverable added to stage ${stageNumber} for engagement ${engagement.id}`,
      );
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
              <p
                className="text-2xl font-bold"
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
              <p
                className="text-lg"
                style={{ fontFamily: "Literata, serif" }}
              >
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

        {/* Program Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Set Program / Package
          </h3>
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
                } disabled:opacity-50`}
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {program.charAt(0).toUpperCase() + program.slice(1)}
              </button>
            ))}
          </div>
          {selectedProgram && (
            <p
              className="mt-4 text-green-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              ✓ Program set to {selectedProgram}
            </p>
          )}
        </div>

        {/* Stages and Deliverables */}
        <div className="space-y-6">
          {stages.map((stage) => (
            <div key={stage.number} className="bg-white rounded-lg shadow p-6">
              {/* Stage Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="text-2xl font-bold text-[#37306B]"
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
                    {!stage.included && selectedProgram && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                        Not Included
                      </span>
                    )}
                  </div>
                  <h4
                    className="text-xl font-bold"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    {stage.name}
                  </h4>
                </div>
              </div>

              {/* Deliverables List */}
              <div className="mb-6">
                <h5
                  className="font-bold text-gray-700 mb-3"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Deliverables
                </h5>

                {deliverables
                  .filter((d) => d.stage_number === stage.number)
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
                        onClick={() =>
                          handleAddDeliverable(stage.number)
                        }
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
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
