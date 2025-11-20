export interface RecommendationInput {
  currentState: string;
  needs: string[];
  websiteScope: string;
  marketingTiming: string;
  budgetRange: string;
  timelineExpectation: string;
  targetDate?: string;
}

export interface RecommendationOutput {
  recommendedPackage: "FOUNDATION" | "GROWTH" | "PERFORMANCE";
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  budgetAligned: boolean;
  hasMismatch: boolean;
  mismatchType: string | null;
  flags: string[];
  reasoning: {
    primaryFactor: string;
    budgetFit: string;
    scopeFit: string;
    timelineFit: string;
  };
  internalNotes: string;
  showMismatchScreen: boolean;
}

export function calculatePackageRecommendation(
  input: RecommendationInput,
): RecommendationOutput {
  const flags: string[] = [];
  let hasMismatch = false;
  let mismatchType: string | null = null;
  const reasoning = {
    primaryFactor: "",
    budgetFit: "",
    scopeFit: "",
    timelineFit: "",
  };

  // STEP 1: PRIMARY FACTOR - Marketing Timing (Q4)
  let primaryRecommendation: "FOUNDATION" | "GROWTH" | "PERFORMANCE" =
    "FOUNDATION";
  let reasonCode = "";

  if (input.marketingTiming === "foundation_first") {
    primaryRecommendation = "FOUNDATION";
    reasonCode = "MKT_LATER";
    reasoning.primaryFactor =
      "You want to build foundation first before marketing";
  } else if (input.marketingTiming === "together") {
    primaryRecommendation = "GROWTH";
    reasonCode = "MKT_NOW";
    reasoning.primaryFactor =
      "You want brand, website AND marketing campaigns running together";
  } else if (input.marketingTiming === "ongoing") {
    primaryRecommendation = "PERFORMANCE";
    reasonCode = "LONG_TERM";
    reasoning.primaryFactor =
      "You want a long-term partner managing everything month-after-month";
  }

  // STEP 2: VALIDATION - Budget Alignment (Q5)
  let budgetAligned = false;

  if (primaryRecommendation === "FOUNDATION" && input.budgetRange === "foundation_budget") {
    budgetAligned = true;
    reasoning.budgetFit = "Aligned with Foundation range (₹50K-₹1.5L)";
  } else if (primaryRecommendation === "GROWTH" && input.budgetRange === "growth_budget") {
    budgetAligned = true;
    reasoning.budgetFit = "Aligned with Growth range (₹3L-₹3.5L)";
  } else if (primaryRecommendation === "PERFORMANCE" && input.budgetRange === "performance_budget") {
    budgetAligned = true;
    reasoning.budgetFit = "Aligned with Performance range (₹8L-₹12L/year)";
  } else if (input.budgetRange === "unsure") {
    budgetAligned = true;
    reasoning.budgetFit = "Budget TBD - Will clarify in discovery";
  } else {
    hasMismatch = true;
    mismatchType = "BUDGET_SCOPE";
    flags.push("budget_mismatch");
    reasoning.budgetFit = `Mismatch: ${primaryRecommendation} needs different budget than indicated`;
  }

  // STEP 3: VALIDATION - Scope Complexity (Q3)
  if (
    input.websiteScope === "extensive" &&
    primaryRecommendation === "FOUNDATION"
  ) {
    hasMismatch = true;
    mismatchType = "SCOPE_TOO_LARGE";
    flags.push("scope_too_large_for_foundation");
    reasoning.scopeFit =
      "Extensive website (50+ pages) cannot fit in Foundation package";
  } else if (input.websiteScope === "compact" && primaryRecommendation === "PERFORMANCE") {
    flags.push("oversized_package_warning");
    reasoning.scopeFit = "Performance might be overkill for compact website scope";
  } else {
    reasoning.scopeFit = `${input.websiteScope} website scope fits ${primaryRecommendation}`;
  }

  // STEP 4: VALIDATION - Timeline Feasibility (Q6)
  if (
    input.timelineExpectation === "asap" &&
    primaryRecommendation === "PERFORMANCE"
  ) {
    hasMismatch = true;
    mismatchType = "TIMELINE_UNREALISTIC";
    flags.push("timeline_too_short_for_performance");
    reasoning.timelineFit =
      "Performance takes 15-18 months minimum, not 6-8 weeks";
  } else if (
    input.timelineExpectation === "asap" &&
    input.websiteScope === "extensive"
  ) {
    hasMismatch = true;
    mismatchType = "TIMELINE_UNREALISTIC";
    flags.push("timeline_too_short_for_scope");
    reasoning.timelineFit =
      "50+ page site cannot be done in 6-8 weeks with quality";
  } else {
    const timelineMap = {
      asap: "6-8 weeks",
      normal: "3-4 months",
      patient: "6-12 months",
      specific_date: input.targetDate || "Custom deadline",
    };
    reasoning.timelineFit = `Timeline ${timelineMap[input.timelineExpectation as keyof typeof timelineMap] || "achievable"}`;
  }

  // STEP 5: CHECK FOR E-COMMERCE (Q2)
  const hasEcommerce = input.needs.includes("ecommerce");
  const hasMarketing = input.needs.includes("marketing");

  if (hasEcommerce && hasMarketing && primaryRecommendation === "FOUNDATION") {
    flags.push("ecommerce_marketing_combo");
    // Don't hard mismatch, but suggest bump
  }

  if (input.websiteScope === "extensive" && hasEcommerce) {
    flags.push("complex_ecommerce_scope");
  }

  // Determine confidence level
  let confidenceLevel: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  if (flags.length > 1 || hasMismatch) {
    confidenceLevel = "MEDIUM";
  }
  if (flags.length > 2) {
    confidenceLevel = "LOW";
  }

  const internalNotes =
    flags.length > 0
      ? `Flags: ${flags.join(", ")}`
      : "Clean recommendation. No issues detected.";

  return {
    recommendedPackage: primaryRecommendation,
    confidenceLevel,
    budgetAligned,
    hasMismatch,
    mismatchType,
    flags,
    reasoning,
    internalNotes,
    showMismatchScreen: hasMismatch,
  };
}
