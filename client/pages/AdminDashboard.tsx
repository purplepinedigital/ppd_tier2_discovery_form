import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { adminLogout, isAdminAuthenticated } from "@/lib/admin-auth";
import { formQuestions, formSections } from "@/data/discovery-form";

interface FormResponse {
  id: string;
  user_id: string;
  responses: string[];
  created_at: string;
  updated_at: string;
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
      // Fetch form responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("form_progress")
        .select("*")
        .order("created_at", { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // Fetch signups
      const { data: signupsData, error: signupsError } = await supabase
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
      "User ID",
      "Created At",
      "Updated At",
      ...formQuestions.map((q) => q.prompt),
    ];

    const rows = responses.map((response) => [
      response.user_id,
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

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            Admin Dashboard
          </h1>
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
                          User ID
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
                          Questions Answered
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((response) => (
                        <tr
                          key={response.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedResponse(response)}
                        >
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {response.user_id.slice(0, 8)}...
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {new Date(response.created_at).toLocaleString()}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ fontFamily: "Literata, serif" }}
                          >
                            {response.responses.filter((r) => r.trim()).length}{" "}
                            / {response.responses.length}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
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
      </main>
    </div>
  );
}
