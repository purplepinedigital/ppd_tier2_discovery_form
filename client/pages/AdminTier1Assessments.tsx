import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Tier1Assessment {
  id: string;
  project_name: string;
  business_name: string;
  user_id: string;
  user_email: string;
  recommended_package: string;
  recommendation_confidence: string;
  has_mismatch: boolean;
  created_at: string;
}

export default function AdminTier1Assessments() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [assessments, setAssessments] = useState<Tier1Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPackage, setFilterPackage] = useState<string>("");

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/admin/login");
        return;
      }

      setUser(data.session.user);

      // Fetch Tier 1 assessments
      const { data: assessmentsData, error } = await supabase
        .from("tier1_assessments")
        .select(
          `
          id,
          project_name,
          business_name,
          user_id,
          recommended_package,
          recommendation_confidence,
          has_mismatch,
          created_at
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching assessments:", error);
      } else if (assessmentsData) {
        // Fetch user emails from signups table
        const userIds = [
          ...new Set(assessmentsData.map((a: any) => a.user_id)),
        ];
        const { data: signupsData } = await supabase
          .from("signups")
          .select("user_id, email")
          .in("user_id", userIds);

        const userEmailMap = new Map(
          (signupsData || []).map((s: any) => [s.user_id, s.email]),
        );

        const formatted = assessmentsData.map((a: any) => ({
          id: a.id,
          project_name: a.project_name,
          business_name: a.business_name,
          user_id: a.user_id,
          user_email: userEmailMap.get(a.user_id) || "Unknown",
          recommended_package: a.recommended_package,
          recommendation_confidence: a.recommendation_confidence,
          has_mismatch: a.has_mismatch,
          created_at: a.created_at,
        }));

        setAssessments(formatted);
      }

      setLoading(false);
    };

    checkAdminAndFetch();
  }, [navigate]);

  const filteredAssessments = filterPackage
    ? assessments.filter((a) => a.recommended_package === filterPackage)
    : assessments;

  const getPackageColor = (pkg: string) => {
    switch (pkg) {
      case "FOUNDATION":
        return "bg-green-100 text-green-800";
      case "GROWTH":
        return "bg-blue-100 text-blue-800";
      case "PERFORMANCE":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "HIGH":
        return "text-green-600";
      case "MEDIUM":
        return "text-yellow-600";
      case "LOW":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-[#37306B] border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tier 1 Assessments
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredAssessments.length} assessments
              </p>
            </div>
            <Button
              onClick={() => navigate("/admin/dashboard")}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Package
              </label>
              <select
                value={filterPackage}
                onChange={(e) => setFilterPackage(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#37306B]"
              >
                <option value="">All Packages</option>
                <option value="FOUNDATION">Foundation</option>
                <option value="GROWTH">Growth</option>
                <option value="PERFORMANCE">Performance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredAssessments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No assessments found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Mismatch
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {assessment.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {assessment.business_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {assessment.user_email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getPackageColor(
                          assessment.recommended_package,
                        )}`}
                      >
                        {assessment.recommended_package}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm font-medium ${getConfidenceColor(assessment.recommendation_confidence)}`}
                    >
                      {assessment.recommendation_confidence}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {assessment.has_mismatch ? (
                        <span className="text-red-600 font-medium">⚠️ Yes</span>
                      ) : (
                        <span className="text-green-600">✓ No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(assessment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Button
                        onClick={() =>
                          navigate(`/admin/tier1/${assessment.id}`)
                        }
                        variant="outline"
                        size="sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
