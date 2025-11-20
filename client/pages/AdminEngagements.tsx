import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  tier1_completed?: boolean;
  tier1_assessment_id?: string;
  recommended_package?: string;
}

export default function AdminEngagements() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }

    fetchEngagements();
  }, [navigate]);

  const fetchEngagements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      const { data: engagementsData, error: engagementsError } = await client
        .from("engagements")
        .select("*")
        .order("created_at", { ascending: false });

      if (engagementsError) throw engagementsError;

      if (engagementsData) {
        const enrichedEngagements = await Promise.all(
          engagementsData.map(async (engagement) => {
            try {
              const { data: signupData } = await client
                .from("signups")
                .select("email, name")
                .eq("user_id", engagement.user_id)
                .single();

              return {
                ...engagement,
                user_email: signupData?.email || "Unknown",
                user_name: signupData?.name || "Unknown",
              };
            } catch (err) {
              return {
                ...engagement,
                user_email: "Unknown",
                user_name: "Unknown",
              };
            }
          }),
        );
        setEngagements(enrichedEngagements);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch engagements");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  const filteredEngagements = engagements.filter(
    (e) =>
      e.project_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.user_email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.user_name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const programColors: Record<string, string> = {
    foundation: "bg-green-100 text-green-800",
    growth: "bg-blue-100 text-blue-800",
    performance: "bg-purple-100 text-purple-800",
  };

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
            <h2
              className="text-xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Engagements
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

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by project name, client email, or client name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#37306B]"
            style={{ fontFamily: "Literata, serif" }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Total Engagements
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
              Foundation
            </p>
            <p
              className="text-3xl font-bold text-green-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.program === "foundation").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Growth
            </p>
            <p
              className="text-3xl font-bold text-blue-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.program === "growth").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Performance
            </p>
            <p
              className="text-3xl font-bold text-purple-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.program === "performance").length}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <p style={{ fontFamily: "Literata, serif" }}>
              Loading engagements...
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            {filteredEngagements.length === 0 ? (
              <p className="p-6" style={{ fontFamily: "Literata, serif" }}>
                {searchFilter
                  ? "No engagements match your search."
                  : "No engagements yet."}
              </p>
            ) : (
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
                      Client
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
                  {filteredEngagements.map((engagement) => (
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
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        <div>{engagement.user_name}</div>
                        <div className="text-gray-500 text-xs">
                          {engagement.user_email}
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
                        <Button
                          onClick={() =>
                            navigate(`/admin/engagements/${engagement.id}`)
                          }
                          className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
