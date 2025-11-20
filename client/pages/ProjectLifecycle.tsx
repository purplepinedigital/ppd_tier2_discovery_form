import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function ProjectLifecycle() {
  const navigate = useNavigate();
  const { engagementId } = useParams<{ engagementId: string }>();

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const client = getClientSupabase();
        
        // Get current user
        const { data: { user } } = await client.auth.getUser();
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
      const client = getClientSupabase();

      // Fetch engagement and verify ownership
      const { data: engagementData, error: engagementError } = await client
        .from("engagements")
        .select("*")
        .eq("id", engagementId)
        .eq("user_id", userId)
        .single();

      if (engagementError) {
        if (engagementError.code === "PGRST116") {
          setError("Engagement not found or you don't have access to it");
        } else {
          setError(engagementError.message);
        }
        console.error("Fetch engagement error:", engagementError);
        return;
      }

      if (engagementData) {
        setEngagement(engagementData);

        // Fetch deliverables visible to client
        const { data: deliverableData, error: deliverableError } = await client
          .from("deliverables")
          .select("*")
          .eq("engagement_id", engagementId)
          .eq("visible_to_client", true)
          .order("stage_number", { ascending: true });

        if (deliverableError) {
          console.error("Fetch deliverables error:", deliverableError);
        }
        setDeliverables(deliverableData || []);

        // Fetch stage coverage if program is set
        if (engagementData.program) {
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
      const client = getClientSupabase();
      const { data: coverageData, error: coverageError } = await client
        .from("stage_coverage")
        .select("*")
        .eq("program", program)
        .order("stage_number", { ascending: true });

      if (coverageError) {
        console.error("Fetch stage coverage error:", coverageError);
        return;
      }

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

  const handleLogout = async () => {
    const client = getClientSupabase();
    await client.auth.signOut();
    navigate("/");
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
          <Button
            onClick={() => navigate("/project/journey")}
            className="bg-[#37306B] hover:bg-[#2C2758] text-white"
          >
            Back to Projects
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
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
              alt="Purple Pine Digital"
              className="h-10 w-auto md:h-12 lg:h-[50px]"
            />
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
              onClick={() => navigate("/project/journey")}
            >
              My Projects
            </h1>
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

        {/* Project Info */}
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
          </div>
        </div>

        {/* Lifecycle Stages */}
        <div className="space-y-6">
          <h3
            className="text-3xl font-bold"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Your Lifecycle Roadmap
          </h3>

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
                    {!stage.included && engagement.program && (
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
                  <p
                    className="text-gray-600 text-sm mt-2"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>

              {/* Deliverables List */}
              <div className="mt-6">
                <h5
                  className="font-bold text-gray-700 mb-3"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Deliverables
                </h5>

                {deliverables.filter((d) => d.stage_number === stage.number)
                  .length > 0 ? (
                  <div className="space-y-3">
                    {deliverables
                      .filter((d) => d.stage_number === stage.number)
                      .map((deliverable) => (
                        <div
                          key={deliverable.id}
                          className="bg-gray-50 p-4 rounded border border-gray-200"
                        >
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
                              className="text-sm text-[#37306B] hover:underline mt-2 break-all inline-block"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              View Deliverable →
                            </a>
                          )}
                          {deliverable.original_filename && (
                            <p
                              className="text-xs text-gray-500 mt-2"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              File: {deliverable.original_filename}
                            </p>
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
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
