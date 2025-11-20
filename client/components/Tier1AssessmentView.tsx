interface Tier1Assessment {
  id: string;
  engagement_id: string;
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
  reasoning: any;
  created_at: string;
  updated_at: string;
}

interface Tier1AssessmentViewProps {
  assessment: Tier1Assessment | null;
  isLoading: boolean;
  onViewFullAssessment?: (assessmentId: string) => void;
}

export default function Tier1AssessmentView({
  assessment,
  isLoading,
  onViewFullAssessment,
}: Tier1AssessmentViewProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <p style={{ fontFamily: "Literata, serif" }}>
          Loading Tier 1 assessment...
        </p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <p
          className="text-yellow-800 font-bold"
          style={{ fontFamily: "Literata, serif" }}
        >
          ⏳ Tier 1 Assessment not yet completed by the client
        </p>
        <p
          className="text-yellow-700 text-sm mt-2"
          style={{ fontFamily: "Literata, serif" }}
        >
          The client needs to complete the Tier 1 assessment form before you can
          assign a program package.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-green-500">
      <div className="mb-6 pb-6 border-b">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <h2
              className="text-2xl font-bold text-[#37306B]"
              style={{ fontFamily: "Epilogue, sans-serif" }}
            >
              Tier 1 Assessment
            </h2>
          </div>
          {onViewFullAssessment && (
            <button
              onClick={() => onViewFullAssessment(assessment.id)}
              className="text-sm text-[#37306B] hover:text-[#2C2758] font-semibold underline"
              style={{ fontFamily: "Literata, serif" }}
            >
              View Full Assessment →
            </button>
          )}
        </div>
        <p
          className="text-sm text-gray-600"
          style={{ fontFamily: "Literata, serif" }}
        >
          Completed on {new Date(assessment.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p
            className="text-gray-600 text-sm"
            style={{ fontFamily: "Literata, serif" }}
          >
            Business Name
          </p>
          <p
            className="text-lg font-semibold"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.business_name}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm"
            style={{ fontFamily: "Literata, serif" }}
          >
            Industry
          </p>
          <p
            className="text-lg font-semibold"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.industry}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm"
            style={{ fontFamily: "Literata, serif" }}
          >
            Phone
          </p>
          <p className="text-lg" style={{ fontFamily: "Literata, serif" }}>
            {assessment.phone}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm"
            style={{ fontFamily: "Literata, serif" }}
          >
            Current State
          </p>
          <p
            className="text-lg font-semibold capitalize"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.current_state?.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
        <div>
          <p
            className="text-gray-600 text-xs"
            style={{ fontFamily: "Literata, serif" }}
          >
            Recommended Package
          </p>
          <p
            className="text-lg font-bold text-[#37306B]"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.recommended_package}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-xs"
            style={{ fontFamily: "Literata, serif" }}
          >
            Confidence
          </p>
          <p
            className={`text-lg font-bold ${
              assessment.recommendation_confidence === "HIGH"
                ? "text-green-600"
                : assessment.recommendation_confidence === "MEDIUM"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.recommendation_confidence}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-xs"
            style={{ fontFamily: "Literata, serif" }}
          >
            Budget Aligned
          </p>
          <p
            className={`text-lg font-bold ${
              assessment.budget_aligned ? "text-green-600" : "text-yellow-600"
            }`}
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.budget_aligned ? "✓ Yes" : "⚠ Review"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p
            className="text-gray-600 text-sm font-bold"
            style={{ fontFamily: "Literata, serif" }}
          >
            Needs
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {assessment.needs_array?.map((need, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold"
              >
                {need}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm font-bold"
            style={{ fontFamily: "Literata, serif" }}
          >
            Website Scope
          </p>
          <p
            className="text-lg capitalize mt-2"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.website_scope?.replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm font-bold"
            style={{ fontFamily: "Literata, serif" }}
          >
            Marketing Timing
          </p>
          <p
            className="text-lg capitalize mt-2"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.marketing_timing?.replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p
            className="text-gray-600 text-sm font-bold"
            style={{ fontFamily: "Literata, serif" }}
          >
            Timeline Expectation
          </p>
          <p
            className="text-lg capitalize mt-2"
            style={{ fontFamily: "Epilogue, sans-serif" }}
          >
            {assessment.timeline_expectation?.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {assessment.primary_goal && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p
            className="text-gray-600 text-sm font-bold"
            style={{ fontFamily: "Literata, serif" }}
          >
            Primary Goal
          </p>
          <p
            className="text-gray-800 mt-2"
            style={{ fontFamily: "Literata, serif" }}
          >
            {assessment.primary_goal}
          </p>
        </div>
      )}
    </div>
  );
}
