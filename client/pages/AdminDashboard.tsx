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

interface FormResponse {
  id: string;
  user_id: string;
  engagement_id: string | null;
  responses: string[];
  created_at: string;
  updated_at: string;
  user_name?: string;
  project_name?: string;
}

interface SignupData {
  email: string;
  name: string;
  user_id: string;
  subscribed_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [signups, setSignups] = useState<SignupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"responses" | "signups">(
    "responses",
  );
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(
    null,
  );
  const [editingResponse, setEditingResponse] = useState<FormResponse | null>(
    null,
  );
  const [editResponses, setEditResponses] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "response" | "signup";
    id: string;
    email?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Fetch form responses with user names using admin client to bypass RLS
      const { data: responsesData, error: responsesError } = await client
        .from("form_progress")
        .select("*")
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;

      // Enrich responses with user names and project names
      if (responsesData) {
        const enrichedResponses = await Promise.all(
          responsesData.map(async (response) => {
            try {
              // Fetch user name
              const { data: signupData, error: signupError } = await client
                .from("signups")
                .select("name")
                .eq("user_id", response.user_id);

              const userName =
                signupData && signupData.length > 0
                  ? signupData[0].name
                  : "Unknown";

              // Fetch project name if engagement_id exists
              let projectName = "No Project";
              if (response.engagement_id) {
                try {
                  const { data: engagementData, error: engagementError } =
                    await client
                      .from("engagements")
                      .select("project_name")
                      .eq("id", response.engagement_id)
                      .maybeSingle();

                  if (engagementData && engagementData.project_name) {
                    projectName = engagementData.project_name;
                  }
                } catch (err) {
                  console.error("Error fetching engagement:", err);
                }
              }

              return {
                ...response,
                user_name: userName,
                project_name: projectName,
              };
            } catch (err) {
              console.error("Exception enriching response:", err);
              return {
                ...response,
                user_name: "Unknown",
                project_name: "No Project",
              };
            }
          }),
        );
        setResponses(enrichedResponses);
      }

      // Fetch signups using admin client to bypass RLS
      const { data: signupsData, error: signupsError } = await client
        .from("signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (signupsError) throw signupsError;
      setSignups(signupsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === "responses") {
      exportResponsesToCSV();
    } else {
      exportSignupsToCSV();
    }
  };

  const exportResponsesToCSV = () => {
    const headers = [
      "Project Name",
      "User Name",
      "User ID",
      "Questions Answered",
      "Created At",
      "Updated At",
      ...formQuestions.map((q) => q.prompt),
    ];

    const rows = responses.map((response) => [
      response.project_name || "No Project",
      response.user_name,
      response.user_id,
      `${response.responses.filter((r) => r.trim()).length}/${response.responses.length}`,
      new Date(response.created_at).toLocaleString(),
      new Date(response.updated_at).toLocaleString(),
      ...response.responses,
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    downloadCSV(csvContent, "form-responses.csv");
  };

  const exportSignupsToCSV = () => {
    const headers = ["Email", "Name", "User ID", "Subscribed At"];
    const rows = signups.map((signup) => [
      signup.email,
      signup.name,
      signup.user_id,
      new Date(signup.subscribed_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    downloadCSV(csvContent, "signups.csv");
  };

  const downloadCSV = (content: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(content),
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  const handleDeleteResponse = async (id: string) => {
    setIsDeleting(true);
    try {
      const client = getAdminSupabase();

      // Only delete the form_progress entry - do NOT cascade to engagements
      const { error: deleteFormError } = await client
        .from("form_progress")
        .delete()
        .eq("id", id);

      if (deleteFormError) throw deleteFormError;

      setResponses(responses.filter((r) => r.id !== id));
      setError(null);
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete form response");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSignup = async (userId: string, email: string) => {
    setIsDeleting(true);
    try {
      const client = getAdminSupabase();

      // Delete from Klaviyo first
      const klaviyoDeleteResponse = await fetch("/api/klaviyo/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!klaviyoDeleteResponse.ok) {
        const errorData = await klaviyoDeleteResponse.json();
        console.error("Klaviyo unsubscribe error:", errorData);
      }

      // Delete from signups table only - do NOT cascade to form_progress or engagements
      const { error } = await client
        .from("signups")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setSignups(signups.filter((s) => s.user_id !== userId));
      setError(null);
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete signup");
    } finally {
      setIsDeleting(false);
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

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            onClick={() => setActiveTab("responses")}
            className={`pb-3 font-bold transition-colors ${
              activeTab === "responses"
                ? "border-b-2 border-[#37306B] text-[#37306B]"
                : "text-gray-600 hover:text-gray-900"
            }`}
            style={{ fontFamily: "Literata, serif" }}
          >
            Form Responses ({responses.length})
          </button>
          <button
            onClick={() => setActiveTab("signups")}
            className={`pb-3 font-bold transition-colors ${
              activeTab === "signups"
                ? "border-b-2 border-[#37306B] text-[#37306B]"
                : "text-gray-600 hover:text-gray-900"
            }`}
            style={{ fontFamily: "Literata, serif" }}
          >
            Signups ({signups.length})
          </button>
        </div>

        {/* Export button */}
        <div className="mb-6">
          <Button
            onClick={handleExportCSV}
            disabled={
              isLoading ||
              (activeTab === "responses"
                ? responses.length === 0
                : signups.length === 0)
            }
            className="bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE]"
            style={{ fontFamily: "Literata, serif" }}
          >
            Export to CSV
          </Button>
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
