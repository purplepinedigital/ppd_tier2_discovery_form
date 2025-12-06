import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { adminLogout, isAdminAuthenticated } from "@/lib/admin-auth";
import { formQuestions, formSections } from "@/data/discovery-form";

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
              onClick={() => navigate("/admin/engagements")}
              className="px-4 py-2 bg-[#37306B] hover:bg-[#2C2758] text-white rounded font-bold text-sm"
              style={{ fontFamily: "Literata, serif" }}
            >
              View Engagements
            </button>
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
            <p style={{ fontFamily: "Literata, serif" }}>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Form Responses Tab */}
            {activeTab === "responses" && (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                {responses.length === 0 ? (
                  <p className="p-6" style={{ fontFamily: "Literata, serif" }}>
                    No form responses yet.
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
                          User
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-bold"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          Questions Answered
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-bold"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          Created At
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
                      {responses.map((response) => (
                        <tr
                          key={response.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td
                            className="px-6 py-4 text-sm cursor-pointer hover:text-[#37306B] font-medium"
                            onClick={() => setSelectedResponse(response)}
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {response.project_name}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {response.user_name}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {response.responses.filter((r) => r.trim()).length}{" "}
                            / {response.responses.length}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {new Date(response.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              onClick={() => {
                                setEditingResponse(response);
                                setEditResponses([...response.responses]);
                              }}
                              className="bg-[#37306B] hover:bg-[#2C2758] text-white px-3 py-1 rounded text-xs font-bold"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "response",
                                  id: response.id,
                                })
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Signups Tab */}
            {activeTab === "signups" && (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                {signups.length === 0 ? (
                  <p className="p-6" style={{ fontFamily: "Literata, serif" }}>
                    No signups yet.
                  </p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
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
                          Name
                        </th>
                        <th
                          className="px-6 py-3 text-left text-sm font-bold"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          Signed Up
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {signups.map((signup) => (
                        <tr
                          key={signup.user_id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {signup.email}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {signup.name}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {new Date(signup.subscribed_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "signup",
                                  id: signup.user_id,
                                  email: signup.email,
                                })
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold"
                              style={{ fontFamily: "Literata, serif" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit Modal */}
        {editingResponse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  Edit Responses - {editingResponse.user_name}
                </h2>
                <button
                  onClick={() => setEditingResponse(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {formSections.map((section) => {
                  const sectionQuestions = formQuestions.filter(
                    (q) => q.sectionId === section.id,
                  );

                  if (!sectionQuestions.length) return null;

                  return (
                    <div key={section.id} className="mb-8">
                      <div className="mb-4 pb-2 border-b-2 border-[#37306B]">
                        <h3
                          className="text-xl font-bold text-[#37306B]"
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          {section.title}
                        </h3>
                      </div>

                      <div className="space-y-6">
                        {sectionQuestions.map((question) => {
                          const answerIndex = question.overallNumber - 1;
                          return (
                            <div
                              key={question.overallNumber}
                              className="bg-gray-50 p-4 rounded"
                            >
                              <p
                                className="font-bold text-gray-800 mb-2"
                                style={{ fontFamily: "Epilogue, sans-serif" }}
                              >
                                Q{question.overallNumber}. {question.prompt}
                              </p>
                              <textarea
                                value={editResponses[answerIndex] || ""}
                                onChange={(e) => {
                                  const newResponses = [...editResponses];
                                  newResponses[answerIndex] = e.target.value;
                                  setEditResponses(newResponses);
                                }}
                                className="w-full border border-gray-300 rounded p-2 min-h-[100px]"
                                style={{ fontFamily: "Literata, serif" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-4">
                <Button
                  onClick={() => setEditingResponse(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-black"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!editingResponse) return;
                    try {
                      const client = getAdminSupabase();
                      const { error } = await client
                        .from("form_progress")
                        .update({ responses: editResponses })
                        .eq("id", editingResponse.id);

                      if (error) throw error;

                      // Refresh data
                      await fetchData();
                      setEditingResponse(null);
                    } catch (err: any) {
                      setError(err.message || "Failed to save changes");
                    }
                  }}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-white"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedResponse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  Response Details
                </h2>
                <button
                  onClick={() => setSelectedResponse(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <p
                  className="mb-6 text-gray-600"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  <strong>User ID:</strong> {selectedResponse.user_id}
                  <br />
                  <strong>Submitted:</strong>{" "}
                  {new Date(selectedResponse.created_at).toLocaleString()}
                </p>

                {/* Responses grouped by section */}
                {formSections.map((section) => {
                  const sectionQuestions = formQuestions.filter(
                    (q) => q.sectionId === section.id,
                  );
                  const sectionResponses = sectionQuestions.map(
                    (q, idx) =>
                      selectedResponse.responses[q.overallNumber - 1] || "",
                  );
                  const hasAnyResponse = sectionResponses.some((r) => r.trim());

                  if (!hasAnyResponse && !sectionQuestions.length) return null;

                  return (
                    <div key={section.id} className="mb-8">
                      <div className="mb-4 pb-2 border-b-2 border-[#37306B]">
                        <h3
                          className="text-xl font-bold text-[#37306B]"
                          style={{ fontFamily: "Epilogue, sans-serif" }}
                        >
                          {section.title}
                        </h3>
                        <p
                          className="text-sm text-gray-600"
                          style={{ fontFamily: "Literata, serif" }}
                        >
                          {section.description}
                        </p>
                      </div>

                      <div className="space-y-6">
                        {sectionQuestions.map((question, idx) => {
                          const answer =
                            selectedResponse.responses[
                              question.overallNumber - 1
                            ] || "";
                          return (
                            <div
                              key={question.overallNumber}
                              className="bg-gray-50 p-4 rounded"
                            >
                              <p
                                className="font-bold text-gray-800 mb-2"
                                style={{ fontFamily: "Epilogue, sans-serif" }}
                              >
                                Q{question.overallNumber}. {question.prompt}
                              </p>
                              <p
                                className="text-gray-700 whitespace-pre-wrap"
                                style={{ fontFamily: "Literata, serif" }}
                              >
                                {answer || (
                                  <span className="text-gray-400 italic">
                                    No response provided
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-4">
                <Button
                  onClick={() => setSelectedResponse(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-black"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md">
              <div className="p-6">
                <h2
                  className="text-2xl font-bold text-red-600 mb-4"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  Confirm Delete
                </h2>
                <p
                  className="text-gray-700 mb-6"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  {deleteConfirm.type === "response"
                    ? "Are you sure you want to delete this form response? This will only delete the response record, not any associated engagements or projects. This action cannot be undone."
                    : `Are you sure you want to delete this signup (${deleteConfirm.email})? This will remove the email from Klaviyo and delete the signup record, but will NOT delete any form responses or engagements. This action cannot be undone.`}
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-bold disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirm.type === "response") {
                        handleDeleteResponse(deleteConfirm.id);
                      } else {
                        handleDeleteSignup(
                          deleteConfirm.id,
                          deleteConfirm.email!,
                        );
                      }
                    }}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
