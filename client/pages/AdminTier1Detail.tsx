import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Tier1Assessment {
  id: string;
  project_name: string;
  business_name: string;
  industry: string;
  phone: string;
  current_state: string;
  needs_array: string[];
  website_scope: string;
  marketing_timing: string;
  budget_range: string;
  timeline_expectation: string;
  target_date: string | null;
  primary_goal: string;
  recommended_package: string;
  recommendation_confidence: string;
  budget_aligned: boolean;
  has_mismatch: boolean;
  mismatch_type: string | null;
  mismatch_resolved: boolean;
  reasoning: any;
  internal_notes: string;
  created_at: string;
  user_id: string;
  user_email: string;
}

export default function AdminTier1Detail() {
  const navigate = useNavigate();
  const { assessmentId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [assessment, setAssessment] = useState<Tier1Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/admin/login");
        return;
      }

      setUser(data.session.user);

      if (!assessmentId) return;

      // Fetch assessment
      const { data: assessmentData, error } = await supabase
        .from("tier1_assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (error) {
        console.error("Error fetching assessment:", error);
      } else if (assessmentData) {
        // Fetch user email from signups table
        const { data: signupData } = await supabase
          .from("signups")
          .select("email")
          .eq("user_id", assessmentData.user_id)
          .single();

        const formatted: Tier1Assessment = {
          ...assessmentData,
          user_email: signupData?.email || "Unknown",
        };
        setAssessment(formatted);
        setInternalNotes(formatted.internal_notes || "");
      }

      setLoading(false);
    };

    checkAdminAndFetch();
  }, [navigate, assessmentId]);

  const handleSaveNotes = async () => {
    if (!assessmentId) return;

    setSaving(true);
    const { error } = await supabase
      .from("tier1_assessments")
      .update({ internal_notes: internalNotes })
      .eq("id", assessmentId);

    if (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
    } else {
      setEditing(false);
      if (assessment) {
        setAssessment({ ...assessment, internal_notes: internalNotes });
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-[#37306B] border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-600">Assessment not found</p>
          <Button onClick={() => navigate("/admin/tier1")} className="mt-4">
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const packageIcon: { [key: string]: string } = {
    FOUNDATION: "🌱",
    GROWTH: "🚀",
    PERFORMANCE: "⚡",
  };

  const currentStateLabels: { [key: string]: string } = {
    scratch: "Starting from scratch",
    basics: "Have basics, need upgrade",
    refresh: "Need complete refresh",
    marketing_only: "Solid foundation, need marketing",
  };

  const websiteScopeLabels: { [key: string]: string } = {
    compact: "Compact (5-15 pages)",
    standard: "Standard (15-30 pages)",
    comprehensive: "Comprehensive (30-50 pages)",
    extensive: "Extensive (50+ pages)",
  };

  const marketingTimingLabels: { [key: string]: string } = {
    foundation_first: "Foundation first, marketing later",
    together: "Build and market together",
    ongoing: "Need ongoing growth partnership",
  };

  const budgetRangeLabels: { [key: string]: string } = {
    foundation_budget: "₹50,000 - ₹1,50,000",
    growth_budget: "₹2,00,000 - ₹4,00,000",
    performance_budget: "₹5,00,000+",
    unsure: "Not sure yet",
  };

  const timelineLabels: { [key: string]: string } = {
    asap: "As soon as possible (6-8 weeks)",
    normal: "Normal pace (3-4 months)",
    patient: "Take the time needed (6-12 months)",
    specific_date: `Specific deadline: ${assessment.target_date}`,
  };

  const needsLabels: { [key: string]: string } = {
    brand: "Brand identity",
    website: "Professional website",
    social: "Social media presence",
    marketing: "Marketing campaigns",
    optimization: "Ongoing optimization",
    collateral: "Business collateral",
    ecommerce: "E-commerce functionality",
    booking: "Booking/appointment system",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button
                onClick={() => navigate("/admin/tier1")}
                variant="outline"
                className="mb-4"
              >
                ← Back to Assessments
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">
                {assessment.project_name}
              </h1>
              <p className="text-gray-600 mt-1">{assessment.business_name}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-2">
                {packageIcon[assessment.recommended_package]}
              </div>
              <span className="inline-block px-4 py-2 rounded-full text-white font-semibold bg-[#37306B]">
                {assessment.recommended_package}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Email</p>
            <p className="font-semibold text-gray-900">
              {assessment.user_email}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Phone</p>
            <p className="font-semibold text-gray-900">{assessment.phone}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Industry</p>
            <p className="font-semibold text-gray-900">{assessment.industry}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Submitted</p>
            <p className="font-semibold text-gray-900">
              {new Date(assessment.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Assessment Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Assessment Details
          </h2>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">
                Current State
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Digital Presence</p>
                  <p className="font-medium text-gray-900">
                    {currentStateLabels[assessment.current_state] ||
                      assessment.current_state}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Needs</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assessment.needs_array?.map((need) => (
                      <span
                        key={need}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                      >
                        {needsLabels[need] || need}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-4">
                Project Scope
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Website Scope</p>
                  <p className="font-medium text-gray-900">
                    {websiteScopeLabels[assessment.website_scope] ||
                      assessment.website_scope}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Primary Goal</p>
                  <p className="font-medium text-gray-900">
                    {assessment.primary_goal || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Budget */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Timeline & Investment
          </h2>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Marketing Timing</p>
              <p className="font-medium text-gray-900">
                {marketingTimingLabels[assessment.marketing_timing] ||
                  assessment.marketing_timing}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Budget Range</p>
              <p className="font-medium text-gray-900">
                {budgetRangeLabels[assessment.budget_range] ||
                  assessment.budget_range}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Timeline</p>
              <p className="font-medium text-gray-900">
                {timelineLabels[assessment.timeline_expectation] ||
                  assessment.timeline_expectation}
              </p>
            </div>
          </div>
        </div>

        {/* Recommendation Reasoning */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recommendation Reasoning
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Confidence Level</p>
              <span
                className={`inline-block px-4 py-1 rounded-full text-white font-semibold ${
                  assessment.recommendation_confidence === "HIGH"
                    ? "bg-green-500"
                    : assessment.recommendation_confidence === "MEDIUM"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              >
                {assessment.recommendation_confidence}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Budget Aligned</p>
                <p className="font-medium">
                  {assessment.budget_aligned ? (
                    <span className="text-green-600">✓ Yes</span>
                  ) : (
                    <span className="text-red-600">✗ No</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Has Mismatch</p>
                <p className="font-medium">
                  {assessment.has_mismatch ? (
                    <span className="text-red-600">⚠️ Yes</span>
                  ) : (
                    <span className="text-green-600">✓ No</span>
                  )}
                </p>
              </div>
            </div>

            {assessment.mismatch_type && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Mismatch Type</p>
                <p className="font-medium text-red-600">
                  {assessment.mismatch_type}
                </p>
              </div>
            )}

            {assessment.reasoning && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Algorithm Reasoning:
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  {assessment.reasoning.primaryFactor && (
                    <p>
                      <strong>Primary Factor:</strong>{" "}
                      {assessment.reasoning.primaryFactor}
                    </p>
                  )}
                  {assessment.reasoning.budgetFit && (
                    <p>
                      <strong>Budget Fit:</strong>{" "}
                      {assessment.reasoning.budgetFit}
                    </p>
                  )}
                  {assessment.reasoning.scopeFit && (
                    <p>
                      <strong>Scope Fit:</strong>{" "}
                      {assessment.reasoning.scopeFit}
                    </p>
                  )}
                  {assessment.reasoning.timelineFit && (
                    <p>
                      <strong>Timeline Fit:</strong>{" "}
                      {assessment.reasoning.timelineFit}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Internal Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Internal Notes</h2>
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#37306B]"
                placeholder="Add internal notes..."
              />
              <div className="flex gap-4">
                <Button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-white"
                >
                  {saving ? "Saving..." : "Save Notes"}
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false);
                    setInternalNotes(assessment.internal_notes || "");
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg min-h-24">
              <p className="text-gray-700 whitespace-pre-wrap">
                {internalNotes || "No notes added yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
