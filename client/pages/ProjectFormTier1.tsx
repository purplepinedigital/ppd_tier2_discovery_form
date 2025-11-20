import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  calculatePackageRecommendation,
  type RecommendationInput,
  type RecommendationOutput,
} from "@/lib/recommendation";
import type { User } from "@supabase/supabase-js";

type Tier1Screen =
  | "form"
  | "recommendation"
  | "mismatch"
  | "complete"
  | "loading";

export default function ProjectFormTier1() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Tier1Screen>("form");

  // Form state
  const [projectName, setProjectName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [otherIndustry, setOtherIndustry] = useState("");
  const [phone, setPhone] = useState("");

  // Section 2 - Assessment
  const [currentState, setCurrentState] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [websiteScope, setWebsiteScope] = useState("");
  const [marketingTiming, setMarketingTiming] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timelineExpectation, setTimelineExpectation] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");

  const [recommendation, setRecommendation] =
    useState<RecommendationOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUser(data.session.user);
      } else {
        navigate("/");
      }
    };
    getUser();
  }, [navigate]);

  const industries = [
    "Professional Services",
    "Healthcare & Wellness",
    "Hospitality & Food Services",
    "Real Estate & Property",
    "Retail & E-commerce",
    "Technology & SaaS",
    "Education & Training",
    "Creative & Design Services",
    "Home Services & Trades",
    "Fitness & Sports",
    "Finance & Insurance",
    "Manufacturing & Industrial",
    "Non-Profit & NGO",
    "Other",
  ];

  const toggleNeed = (need: string) => {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!projectName.trim()) errors.push("Project name is required");
    if (!businessName.trim()) errors.push("Business name is required");
    if (!industry) errors.push("Industry selection is required");
    if (industry === "Other" && !otherIndustry.trim())
      errors.push("Please specify your industry");
    if (!phone.trim()) errors.push("Phone number is required");
    if (!currentState) errors.push("Current digital presence is required");
    if (needs.length === 0) errors.push("Select at least one need");
    if (!websiteScope) errors.push("Website scope is required");
    if (!marketingTiming) errors.push("Marketing timing is required");
    if (!budgetRange) errors.push("Budget range is required");
    if (!timelineExpectation) errors.push("Timeline expectation is required");
    if (timelineExpectation === "specific_date" && !targetDate) {
      errors.push("Target launch date is required");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const recommendationInput: RecommendationInput = {
      currentState,
      needs,
      websiteScope,
      marketingTiming,
      budgetRange,
      timelineExpectation,
      targetDate: targetDate || undefined,
    };

    const result = calculatePackageRecommendation(recommendationInput);
    setRecommendation(result);

    if (result.showMismatchScreen) {
      setScreen("mismatch");
    } else {
      setScreen("recommendation");
    }
  };

  const handleMismatchResolution = (option: string) => {
    // Update form based on mismatch resolution
    if (option === "reduce_scope") {
      setWebsiteScope("standard");
    } else if (option === "adjust_budget") {
      setBudgetRange("growth_budget");
    } else if (option === "extend_timeline") {
      setTimelineExpectation("patient");
    } else if (option === "reduce_timeline_scope") {
      setWebsiteScope("compact");
    }

    // Recalculate
    const recommendationInput: RecommendationInput = {
      currentState,
      needs,
      websiteScope,
      marketingTiming,
      budgetRange,
      timelineExpectation,
      targetDate: targetDate || undefined,
    };

    const result = calculatePackageRecommendation(recommendationInput);
    setRecommendation(result);

    if (result.showMismatchScreen) {
      setScreen("mismatch");
    } else {
      setScreen("recommendation");
    }
  };

  const handleContinueToTier2 = async () => {
    if (!user || !recommendation) return;

    setLoading(true);
    try {
      // Save Tier 1 assessment
      const { data: tier1Data, error: tier1Error } = await supabase
        .from("tier1_assessments")
        .insert({
          user_id: user.id,
          project_name: projectName,
          business_name: businessName,
          industry: industry === "Other" ? otherIndustry : industry,
          phone,
          current_state: currentState,
          needs_array: needs,
          website_scope: websiteScope,
          marketing_timing: marketingTiming,
          budget_range: budgetRange,
          timeline_expectation: timelineExpectation,
          target_date: targetDate || null,
          primary_goal: primaryGoal,
          recommended_package: recommendation.recommendedPackage,
          recommendation_confidence: recommendation.confidenceLevel,
          budget_aligned: recommendation.budgetAligned,
          has_mismatch: recommendation.hasMismatch,
          mismatch_type: recommendation.mismatchType,
          mismatch_resolved: true,
          reasoning: recommendation.reasoning,
          internal_notes: recommendation.internalNotes,
        })
        .select("id")
        .single();

      if (tier1Error) throw tier1Error;

      // Create engagement
      const { data: engagementData, error: engagementError } = await supabase
        .from("engagements")
        .insert({
          user_id: user.id,
          project_name: projectName,
          program_rationale: null,
          tier1_completed: true,
          tier1_assessment_id: tier1Data.id,
          recommended_package: recommendation.recommendedPackage,
        })
        .select("id")
        .single();

      if (engagementError) throw engagementError;

      setScreen("complete");
      setTimeout(() => {
        navigate(`/project/lifecycle/${engagementData.id}`);
      }, 1500);
    } catch (error) {
      console.error("Error saving Tier 1 assessment:", error);
      alert("Failed to save assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;
    return (
      <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="font-semibold text-red-800 mb-2">Please fix these issues:</p>
        <ul className="list-disc list-inside space-y-1">
          {validationErrors.map((error, idx) => (
            <li key={idx} className="text-red-700 text-sm">
              {error}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (screen === "form") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="text-sm font-medium text-[#37306B] mb-2">
              Step 1 of 3: Project Setup
            </div>
            <h1 className="text-4xl font-bold text-[#37306B] mb-2">
              Let's Get Started!
            </h1>
            <p className="text-lg text-gray-600">
              Tell us about your project so we can recommend the right approach
              and timeline for you.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {renderValidationErrors()}

            {/* Section 1: Project Basics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#37306B] mb-6">
                Project Basics
              </h2>

              {/* Project Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What should we call your project?
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Give your project a name - this is how you'll see it throughout
                  your dashboard. Keep it simple!
                </p>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Acme Realty Website Redesign"
                  maxLength={60}
                  className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {projectName.length}/60 characters
                </p>
              </div>

              {/* Business Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What's your business or company name?
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  If you're a solopreneur or freelancer, just use your
                  professional name.
                </p>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                />
              </div>

              {/* Industry */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What industry or business type are you in?
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  This helps us understand your competitive landscape and audience.
                </p>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                >
                  <option value="">Select an industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                {industry === "Other" && (
                  <input
                    type="text"
                    value={otherIndustry}
                    onChange={(e) => setOtherIndustry(e.target.value)}
                    placeholder="Please specify your industry"
                    className="w-full mt-3 rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                  />
                )}
              </div>

              {/* Phone */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Best phone number to reach you
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                />
              </div>
            </div>

            {/* Section 2: Assessment Questions */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#37306B] mb-6">
                Current State & Needs Assessment
              </h2>

              {/* Q1: Current Digital Presence */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What best describes where you are right now with your digital
                  presence?
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Be honest - we work with businesses at every stage.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      value: "scratch",
                      label: "🌱 Starting from scratch",
                      desc: "No logo, no website, building everything new",
                    },
                    {
                      value: "basics",
                      label: "🔧 Have basics, need upgrade",
                      desc: "Basic logo exists but need professional brand + website",
                    },
                    {
                      value: "refresh",
                      label: "🏗 Need complete refresh",
                      desc: "Have brand and website but want to rebuild from ground up",
                    },
                    {
                      value: "marketing_only",
                      label: "✅ Solid foundation, need marketing",
                      desc: "Happy with brand/website, just need marketing help",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="currentState"
                        value={option.value}
                        checked={currentState === option.value}
                        onChange={(e) => setCurrentState(e.target.value)}
                        className="mt-1 mr-4"
                      />
                      <div>
                        <div className="font-medium text-gray-800">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q2: What You Need */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What do you need help with? (Select all that apply)
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Check everything that's relevant - we'll factor it all in.
                </p>
                <div className="space-y-3">
                  {[
                    { value: "brand", label: "🎨 Brand identity" },
                    { value: "website", label: "🌐 Professional website" },
                    { value: "social", label: "📱 Social media presence" },
                    { value: "marketing", label: "📈 Marketing campaigns" },
                    { value: "optimization", label: "🎯 Ongoing optimization" },
                    { value: "collateral", label: "💼 Business collateral" },
                    { value: "ecommerce", label: "🛒 E-commerce functionality" },
                    { value: "booking", label: "📅 Booking/appointment system" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={needs.includes(option.value)}
                        onChange={() => toggleNeed(option.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-800">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q3: Website Scope */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  How extensive does your website need to be?
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Think about all the pages and sections you need: Home, About,
                  Services, Portfolio, Blog, Resources, etc.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      value: "compact",
                      label: "📄 Compact (5-15 pages)",
                      desc: "Just the essentials",
                    },
                    {
                      value: "standard",
                      label: "📚 Standard (15-30 pages)",
                      desc: "Good depth across key sections",
                    },
                    {
                      value: "comprehensive",
                      label: "🏢 Comprehensive (30-50 pages)",
                      desc: "Full content library",
                    },
                    {
                      value: "extensive",
                      label: "🏭 Extensive (50+ pages)",
                      desc: "Major resource hub or large catalog",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="websiteScope"
                        value={option.value}
                        checked={websiteScope === option.value}
                        onChange={(e) => setWebsiteScope(e.target.value)}
                        className="mt-1 mr-4"
                      />
                      <div>
                        <div className="font-medium text-gray-800">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q4: Marketing Timing - CRITICAL */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  When do you want to start bringing in customers through
                  marketing?
                </label>
                <p className="text-sm text-red-600 font-medium mb-4">
                  ⚠️ This is the most important question - it determines which
                  package is right for you.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      value: "foundation_first",
                      label: "🏗 Foundation first, marketing later",
                      desc: "Build brand + website properly first, then add marketing when ready",
                      package: "FOUNDATION",
                    },
                    {
                      value: "together",
                      label: "🚀 Build and market together",
                      desc:
                        "Launch everything within 3-4 months with marketing running",
                      package: "GROWTH",
                    },
                    {
                      value: "ongoing",
                      label: "⚡ Need ongoing growth partnership",
                      desc: "Long-term partner managing everything month-after-month",
                      package: "PERFORMANCE",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="marketingTiming"
                        value={option.value}
                        checked={marketingTiming === option.value}
                        onChange={(e) => setMarketingTiming(e.target.value)}
                        className="mt-1 mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-800">
                            {option.label}
                          </div>
                          <span className="text-xs font-semibold bg-[#37306B] text-white px-2 py-1 rounded">
                            {option.package}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q5: Investment Range */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What's your investment range for this project?
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  This helps us recommend a package that fits your budget. Our
                  packages are designed for different investment levels.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      value: "foundation_budget",
                      label: "💚 ₹50,000 - ₹1,50,000",
                      desc: "Foundation Package range",
                    },
                    {
                      value: "growth_budget",
                      label: "💙 ₹2,00,000 - ₹4,00,000",
                      desc: "Growth Package range",
                    },
                    {
                      value: "performance_budget",
                      label: "💜 ₹5,00,000+",
                      desc: "Performance Package range",
                    },
                    {
                      value: "unsure",
                      label: "🤔 Not sure yet",
                      desc: "Help me understand what I need first",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="budgetRange"
                        value={option.value}
                        checked={budgetRange === option.value}
                        onChange={(e) => setBudgetRange(e.target.value)}
                        className="mt-1 mr-4"
                      />
                      <div>
                        <div className="font-medium text-gray-800">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Q6: Timeline Expectation */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What's your ideal timeline?
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  We maintain high quality standards, so we'll be honest if a
                  timeline isn't realistic.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      value: "asap",
                      label: "⚡ As soon as possible (6-8 weeks)",
                    },
                    {
                      value: "normal",
                      label: "🎯 Normal pace (3-4 months)",
                    },
                    {
                      value: "patient",
                      label: "🌟 Take the time needed (6-12 months)",
                    },
                    {
                      value: "specific_date",
                      label: "📅 Specific deadline (I'll specify below)",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="timelineExpectation"
                        value={option.value}
                        checked={timelineExpectation === option.value}
                        onChange={(e) => setTimelineExpectation(e.target.value)}
                        className="mr-4"
                      />
                      <span className="text-gray-800">{option.label}</span>
                    </label>
                  ))}
                </div>

                {timelineExpectation === "specific_date" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      What's your target launch date?
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Q7: Primary Goal */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  In one sentence - what's the #1 goal you want to achieve with
                  this project?
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Examples: "Get 50+ qualified leads per month", "Look more
                  professional than competitors", "Launch online store"
                </p>
                <textarea
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value.slice(0, 200))}
                  placeholder="Tell us what success looks like..."
                  maxLength={200}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-4 py-2 focus:border-[#37306B] focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {primaryGoal.length}/200 characters (optional)
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-[#37306B] hover:bg-[#2C2758] text-white"
              >
                See My Recommendation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "recommendation" && recommendation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="text-sm font-medium text-[#37306B] mb-2">
              Step 2 of 3: Your Recommendation
            </div>
            <h1 className="text-4xl font-bold text-[#37306B] mb-2">
              ✅ Your Recommended Package
            </h1>
            <p className="text-lg text-gray-600">
              Based on your responses, here's what we recommend:
            </p>
          </div>

          {/* Recommendation Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold mb-2">
                {recommendation.recommendedPackage === "FOUNDATION" && "🌱"}
                {recommendation.recommendedPackage === "GROWTH" && "🚀"}
                {recommendation.recommendedPackage === "PERFORMANCE" && "⚡"}
              </div>
              <h2 className="text-3xl font-bold text-[#37306B] mb-4">
                {recommendation.recommendedPackage} Program
              </h2>
              <div className="flex justify-center gap-2">
                <span
                  className={`px-4 py-2 rounded-full text-white font-semibold ${
                    recommendation.confidenceLevel === "HIGH"
                      ? "bg-green-500"
                      : recommendation.confidenceLevel === "MEDIUM"
                        ? "bg-yellow-500"
                        : "bg-orange-500"
                  }`}
                >
                  {recommendation.confidenceLevel} Confidence
                </span>
              </div>
            </div>

            {/* Why This Package */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">
                Why this package?
              </h3>
              <ul className="space-y-2">
                <li className="flex gap-3">
                  <span className="text-[#37306B]">•</span>
                  <span className="text-gray-700">
                    {recommendation.reasoning.primaryFactor}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#37306B]">•</span>
                  <span className="text-gray-700">
                    {recommendation.reasoning.budgetFit}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#37306B]">•</span>
                  <span className="text-gray-700">
                    {recommendation.reasoning.scopeFit}
                  </span>
                </li>
              </ul>
            </div>

            {/* Package Details */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-4">
                What's Included:
              </h3>
              <div className="bg-gray-50 rounded p-4">
                {recommendation.recommendedPackage === "FOUNDATION" && (
                  <ul className="space-y-2 text-gray-700">
                    <li>✅ Complete brand identity (Brand 1.0)</li>
                    <li>✅ Professional website (10-50 pages based on scope)</li>
                    <li>✅ Social media presence setup</li>
                    <li>✅ Google Analytics + Search Console</li>
                    <li>✅ SEO foundation</li>
                    <li>✅ Ready to scale when you add marketing later</li>
                  </ul>
                )}
                {recommendation.recommendedPackage === "GROWTH" && (
                  <ul className="space-y-2 text-gray-700">
                    <li>✅ Everything in Foundation (brand + website)</li>
                    <li>✅ PLUS: 90-day marketing activation</li>
                    <li>✅ SEO campaign setup</li>
                    <li>✅ Paid ads (Google + Meta)</li>
                    <li>✅ Landing pages + blog setup</li>
                    <li>✅ Content strategy + starter posts</li>
                    <li>✅ Monthly performance tracking</li>
                  </ul>
                )}
                {recommendation.recommendedPackage === "PERFORMANCE" && (
                  <ul className="space-y-2 text-gray-700">
                    <li>✅ Everything in Foundation + Growth</li>
                    <li>✅ PLUS: 12-month continuous optimization</li>
                    <li>✅ Monthly content (4-8 posts)</li>
                    <li>✅ Ongoing A/B testing + CRO</li>
                    <li>✅ Advanced campaigns + retargeting</li>
                    <li>✅ Email flows + retention programs</li>
                    <li>✅ Quarterly strategy reviews</li>
                    <li>✅ Dedicated account manager</li>
                  </ul>
                )}
              </div>
            </div>

            {/* Investment & Timeline */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded p-4">
                <p className="text-sm text-gray-600 mb-1">Investment:</p>
                <p className="font-semibold text-gray-800">
                  {recommendation.recommendedPackage === "FOUNDATION" &&
                    "₹75,000 - ₹1,50,000"}
                  {recommendation.recommendedPackage === "GROWTH" &&
                    "₹3,00,000 - ₹3,50,000"}
                  {recommendation.recommendedPackage === "PERFORMANCE" &&
                    "₹8,00,000 - ₹12,00,000/year"}
                </p>
              </div>
              <div className="bg-green-50 rounded p-4">
                <p className="text-sm text-gray-600 mb-1">Timeline:</p>
                <p className="font-semibold text-gray-800">
                  {recommendation.recommendedPackage === "FOUNDATION" &&
                    "6-8 weeks"}
                  {recommendation.recommendedPackage === "GROWTH" &&
                    "12-14 weeks (~3 months)"}
                  {recommendation.recommendedPackage === "PERFORMANCE" &&
                    "15-18 months"}
                </p>
              </div>
            </div>

            {/* Next Step */}
            <div className="bg-[#F5E6D3] rounded p-4 mb-8">
              <h3 className="font-semibold text-[#37306B] mb-2">
                Ready for Your Discovery Deep-Dive?
              </h3>
              <p className="text-gray-700 text-sm">
                Great! Now that we've identified the right package for you, it's
                time to dive deeper into your brand, audience, and goals. The
                next set of questions will take 15-20 minutes.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => setScreen("form")}
                variant="outline"
                className="flex-1"
              >
                Edit Answers
              </Button>
              <Button
                onClick={handleContinueToTier2}
                disabled={loading}
                className="flex-1 bg-[#37306B] hover:bg-[#2C2758] text-white"
              >
                {loading ? "Saving..." : "Continue to Discovery"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "mismatch" && recommendation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#37306B] mb-2">
              ⚠️ We Noticed a Mismatch
            </h1>
            <p className="text-lg text-gray-600">
              Based on your responses, there's a gap between what you want and
              what you indicated. Let's fix that:
            </p>
          </div>

          {/* Mismatch Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
              <p className="font-semibold text-yellow-800 mb-2">
                Issue: {recommendation.mismatchType}
              </p>
              <p className="text-yellow-700 text-sm">
                {recommendation.reasoning.primaryFactor}
              </p>
            </div>

            <h2 className="text-2xl font-bold text-[#37306B] mb-6">
              What would you like to do?
            </h2>

            <div className="space-y-3 mb-8">
              {recommendation.mismatchType === "BUDGET_SCOPE" && (
                <>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="reduce_scope"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Start with Foundation first (recommended)
                      </div>
                      <div className="text-sm text-gray-600">
                        Build your foundation now (₹75K-₹1.5L), add Growth later
                        (₹2.5L-₹3L additional)
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="adjust_budget"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Increase budget for Growth now
                      </div>
                      <div className="text-sm text-gray-600">
                        Allocate ₹3L-₹3.5L to get everything in one go
                      </div>
                    </div>
                  </label>
                </>
              )}

              {recommendation.mismatchType === "SCOPE_TOO_LARGE" && (
                <>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="reduce_scope"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Reduce scope to 15-30 pages
                      </div>
                      <div className="text-sm text-gray-600">
                        Fits perfectly in Foundation (₹75K-₹1.5L)
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="adjust_budget"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Keep 50+ pages, upgrade to Growth
                      </div>
                      <div className="text-sm text-gray-600">
                        Extensive scope needs Growth investment (₹3L-₹3.5L)
                      </div>
                    </div>
                  </label>
                </>
              )}

              {recommendation.mismatchType === "TIMELINE_UNREALISTIC" && (
                <>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="reduce_timeline_scope"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Reduce scope to 15-30 pages
                      </div>
                      <div className="text-sm text-gray-600">
                        Achievable in 6-8 weeks with quality
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mismatchResolution"
                      value="extend_timeline"
                      onChange={(e) =>
                        handleMismatchResolution(e.target.value)
                      }
                      className="mt-1 mr-4"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        Extend timeline to 12-16 weeks
                      </div>
                      <div className="text-sm text-gray-600">
                        Build your full scope with proper quality
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>

            {/* Updated Recommendation Info */}
            {recommendation && (
              <div className="bg-blue-50 rounded p-4 mb-8">
                <p className="text-sm text-gray-600 mb-2">
                  Updated Recommendation:
                </p>
                <p className="font-bold text-[#37306B]">
                  {recommendation.recommendedPackage} Package
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => setScreen("form")}
                variant="outline"
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handleContinueToTier2}
                disabled={loading}
                className="flex-1 bg-[#37306B] hover:bg-[#2C2758] text-white"
              >
                {loading ? "Saving..." : "Continue with {package}"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] p-6 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-[#37306B] mb-2">
            Assessment Complete!
          </h1>
          <p className="text-gray-600 mb-6">
            Your Tier 1 assessment has been saved. Redirecting to your
            discovery form...
          </p>
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#37306B] border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-[#37306B] border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
