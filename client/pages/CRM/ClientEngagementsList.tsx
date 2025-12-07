import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getClientEngagements } from "@/lib/crm-client";
import { supabase } from "@/lib/supabase";

export default function ClientEngagementsList() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.email) {
          setEmail(user.user.email);
        }

        const { data, error } = await getClientEngagements();
        if (!error && data) {
          setEngagements(data);
        }
      } catch (error) {
        console.error("Error fetching engagements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awaiting_tier1":
        return "bg-yellow-100 text-yellow-800";
      case "tier1_submitted":
        return "bg-blue-100 text-blue-800";
      case "awaiting_tier2":
        return "bg-purple-100 text-purple-800";
      case "tier2_submitted":
        return "bg-indigo-100 text-indigo-800";
      case "in_stages":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "awaiting_tier1":
        return "📋 Waiting for Tier 1";
      case "tier1_submitted":
        return "✓ Tier 1 Complete";
      case "awaiting_tier2":
        return "📋 Waiting for Tier 2";
      case "tier2_submitted":
        return "✓ Forms Complete";
      case "in_stages":
        return "🚀 In Progress";
      case "completed":
        return "✅ Completed";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              My Projects
            </h1>
            <p className="text-gray-600 text-sm mt-1">Welcome {email}</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {engagements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">No projects assigned yet.</p>
            <p className="text-gray-500">
              Please check back later or contact your administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engagements.map((engagement) => (
              <div
                key={engagement.id}
                onClick={() => navigate(`/crm/client/${engagement.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-purple-300"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {engagement.title}
                  </h3>

                  {engagement.program && (
                    <p className="text-sm text-gray-600 mb-3">
                      Program:{" "}
                      <span className="font-semibold">
                        {engagement.program}
                      </span>
                    </p>
                  )}

                  {engagement.budget && (
                    <p className="text-sm text-gray-600 mb-3">
                      Budget:{" "}
                      <span className="font-semibold">
                        ${engagement.budget.toLocaleString()}
                      </span>
                    </p>
                  )}

                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(engagement.status)}`}
                    >
                      {getStatusLabel(engagement.status)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{engagement.current_stage}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(engagement.current_stage / 7) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => navigate(`/crm/client/${engagement.id}`)}
                  >
                    View Project →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
