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

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  subscribed_at: string;
}

interface Engagement {
  id: string;
  user_id: string;
  project_name: string;
  program: string | null;
  created_at: string;
  updated_at: string;
  tier1_completed?: boolean;
  tier1_assessment_id?: string;
  recommended_package?: string;
}

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }

    if (userId) {
      fetchUserData();
    }
  }, [navigate, userId]);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      // Fetch user profile
      const { data: userData, error: userError } = await client
        .from("signups")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Fetch all engagements for this user
      const { data: engagementData, error: engagementError } = await client
        .from("engagements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (engagementError) throw engagementError;

      // Fetch Tier 1 assessments for all engagements
      const { data: tier1Data } = await client
        .from("tier1_assessments")
        .select("id, engagement_id, recommended_package");

      const tier1Map = new Map(
        (tier1Data || []).map((t: any) => [t.engagement_id, t]),
      );

      if (engagementData) {
        const enrichedEngagements = engagementData.map((engagement) => {
          const tier1Assessment = tier1Map.get(engagement.id);
          return {
            ...engagement,
            tier1_completed: !!tier1Assessment,
            tier1_assessment_id: tier1Assessment?.id,
            recommended_package: tier1Assessment?.recommended_package,
          };
        });
        setEngagements(enrichedEngagements);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch user data");
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
      (e.program && e.program.toLowerCase().includes(searchFilter.toLowerCase())),
  );

  const programColors: Record<string, string> = {
    foundation: "bg-green-100 text-green-800",
    growth: "bg-blue-100 text-blue-800",
    performance: "bg-purple-100 text-purple-800",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAEE] flex items-center justify-center">
        <p style={{ fontFamily: "Literata, serif" }}>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFFAEE] flex items-center justify-center">
        <div className="text-center">
          <p
            className="text-red-600 mb-4"
            style={{ fontFamily: "Literata, serif" }}
          >
            User not found
          </p>
          <Button
            onClick={() => navigate("/admin/dashboard")}
            className="bg-[#37306B] hover:bg-[#2C2758] text-white"
          >
            Back to Dashboard
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
            <h2
              className="text-xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {user.name}
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

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Name
              </p>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {user.name}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Email
              </p>
              <p
                className="text-lg"
                style={{ fontFamily: "Literata, serif" }}
              >
                {user.email}
              </p>
            </div>
            <div>
              <p
                className="text-gray-600 text-sm"
                style={{ fontFamily: "Literata, serif" }}
              >
                Signup Date
              </p>
              <p className="text-lg" style={{ fontFamily: "Literata, serif" }}>
                {new Date(user.subscribed_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Engagements Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
              Tier 1 Completed
            </p>
            <p
              className="text-3xl font-bold text-green-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.tier1_completed).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Program Assigned
            </p>
            <p
              className="text-3xl font-bold text-blue-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {engagements.filter((e) => e.program).length}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by project name or program..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#37306B]"
            style={{ fontFamily: "Literata, serif" }}
          />
        </div>

        {/* Engagements Table */}
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
                    Program
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
                  <tr key={engagement.id} className="border-b hover:bg-gray-50">
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
                    <td className="px-6 py-4 text-sm">
                      {engagement.tier1_completed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          ✅ {engagement.recommended_package || "Completed"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                          ⏳ Pending
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
                          navigate(
                            `/admin/engagements/${engagement.id}`,
                          )
                        }
                        className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 text-sm"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
