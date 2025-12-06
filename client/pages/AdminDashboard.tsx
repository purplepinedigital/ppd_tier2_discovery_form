import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { adminLogout, isAdminAuthenticated } from "@/lib/admin-auth";

// Create an admin client that bypasses RLS using service role key
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

interface UserWithEngagements {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  subscribed_at: string;
  engagement_count: number;
  tier1_completed_count: number;
  last_activity?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithEngagements[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }

    // Fetch data
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getAdminSupabase();

      // Fetch all signups
      const { data: signupsData, error: signupsError } = await client
        .from("signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (signupsError) throw signupsError;

      // Fetch all engagements with tier 1 assessment info
      const { data: engagementsData } = await client
        .from("engagements")
        .select("*");

      const { data: tier1Data } = await client
        .from("tier1_assessments")
        .select("id, engagement_id");

      const tier1Set = new Set(
        (tier1Data || []).map((t: any) => t.engagement_id),
      );

      // Enrich signups with engagement counts and activity
      if (signupsData) {
        const enrichedUsers = signupsData.map((signup) => {
          const userEngagements = (engagementsData || []).filter(
            (e: any) => e.user_id === signup.user_id,
          );

          const tier1CompletedCount = userEngagements.filter(
            (e: any) => tier1Set.has(e.id),
          ).length;

          const lastActivity = userEngagements.length > 0
            ? new Date(
              Math.max(
                ...userEngagements.map((e: any) =>
                  new Date(e.updated_at).getTime(),
                ),
              ),
            ).toISOString()
            : undefined;

          return {
            user_id: signup.user_id,
            email: signup.email,
            name: signup.name,
            phone: signup.phone,
            subscribed_at: signup.subscribed_at,
            engagement_count: userEngagements.length,
            tier1_completed_count: tier1CompletedCount,
            last_activity: lastActivity,
          };
        });

        setUsers(enrichedUsers);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };


  const handleCleanupOrphanedData = async () => {
    if (
      !confirm(
        "This will remove orphaned tier1_assessments and other records. Continue?",
      )
    ) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const response = await fetch("/api/admin/cleanup-orphaned-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to cleanup orphaned data");
      }

      const data = await response.json();
      alert(
        `Cleanup successful!\nDeleted tier1_assessments: ${data.deleted?.tier1_assessments || 0}\nDeleted other records: ${data.deleted?.other_records || 0}`,
      );

      // Refresh data
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to cleanup orphaned data");
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Admin Dashboard
            </h1>
            <button
              onClick={() => navigate("/admin/login-as-user")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Login as User
            </button>
            <button
              onClick={handleCleanupOrphanedData}
              disabled={isCleaningUp}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold text-sm disabled:opacity-50"
              style={{ fontFamily: "Literata, serif" }}
            >
              {isCleaningUp ? "Cleaning..." : "Cleanup Orphaned Data"}
            </button>
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

        {/* User Search Filter */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#37306B]"
            style={{ fontFamily: "Literata, serif" }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Total Users
            </p>
            <p
              className="text-3xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {users.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p
              className="text-gray-600 text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              Total Engagements
            </p>
            <p
              className="text-3xl font-bold text-blue-600"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              {users.reduce((sum, u) => sum + u.engagement_count, 0)}
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
              {users.reduce((sum, u) => sum + u.tier1_completed_count, 0)}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <p style={{ fontFamily: "Literata, serif" }}>Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            {users.length === 0 ? (
              <p className="p-6" style={{ fontFamily: "Literata, serif" }}>
                No users yet.
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-sm font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Name
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Email
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      # Engagements
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Tier 1 Completed
                    </th>
                    <th
                      className="px-6 py-3 text-left text-sm font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Signup Date
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
                  {users
                    .filter(
                      (u) =>
                        u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        (u.phone && u.phone.includes(searchFilter)),
                    )
                    .map((user) => (
                      <tr key={user.user_id} className="border-b hover:bg-gray-50">
                        <td
                          className="px-6 py-4 text-sm font-medium"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {user.name}
                        </td>
                        <td
                          className="px-6 py-4 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {user.email}
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-center"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                            {user.engagement_count}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-center"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 font-bold text-sm">
                            {user.tier1_completed_count}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 text-sm"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {new Date(user.subscribed_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Button
                            onClick={() =>
                              navigate(`/admin/users/${user.user_id}`)
                            }
                            className="bg-[#37306B] hover:bg-[#2C2758] text-white px-4 py-2 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            View Engagements
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
