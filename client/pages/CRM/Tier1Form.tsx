import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getClientEngagement } from '@/lib/crm-client';
import { supabase } from '@/lib/supabase';
import {
  calculatePackageRecommendation,
  type RecommendationInput,
  type RecommendationOutput,
} from '@/lib/recommendation';

type Tier1Screen =
  | 'form'
  | 'recommendation'
  | 'mismatch'
  | 'complete'
  | 'loading';

export default function Tier1Form() {
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [screen, setScreen] = useState<Tier1Screen>('form');

  // Form state
  const [projectName, setProjectName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [otherIndustry, setOtherIndustry] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [websiteScope, setWebsiteScope] = useState('');
  const [marketingTiming, setMarketingTiming] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [timelineExpectation, setTimelineExpectation] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');

  const [recommendation, setRecommendation] = useState<RecommendationOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const industries = [
    'Professional Services',
    'Healthcare & Wellness',
    'Hospitality & Food Services',
    'Real Estate & Property',
    'Retail & E-commerce',
    'Technology & SaaS',
    'Education & Training',
    'Creative & Design Services',
    'Home Services & Trades',
    'Fitness & Sports',
    'Finance & Insurance',
    'Manufacturing & Industrial',
    'Non-Profit & NGO',
    'Other',
  ];

  const needsOptions = [
    'New Website',
    'Website Redesign',
    'E-commerce Functionality',
    'Mobile Responsiveness',
    'SEO Optimization',
    'CMS Implementation',
    'Brand Identity',
    'Content Strategy',
  ];

  useEffect(() => {
    const fetchEngagement = async () => {
      const { data } = await getClientEngagement();
      if (data) {
        setEngagement(data);
        setProjectName(data.title || '');
      }
      setLoading(false);
    };
    fetchEngagement();
  }, []);

  const toggleNeed = (need: string) => {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!projectName.trim()) errors.push('Project name is required');
    if (!businessName.trim()) errors.push('Business name is required');
    if (!industry) errors.push('Industry selection is required');
    if (industry === 'Other' && !otherIndustry.trim())
      errors.push('Please specify your industry');
    if (!currentState) errors.push('Current digital presence is required');
    if (needs.length === 0) errors.push('Select at least one need');
    if (!websiteScope) errors.push('Website scope is required');
    if (!marketingTiming) errors.push('Marketing timing is required');
    if (!budgetRange) errors.push('Budget range is required');
    if (!timelineExpectation) errors.push('Timeline expectation is required');
    if (timelineExpectation === 'specific_date' && !targetDate) {
      errors.push('Target launch date is required');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!engagement) return;

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      // Calculate recommendation for data storage
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

      // Save Tier 1 assessment
      const { data: tier1Data, error: tier1Error } = await supabase
        .from('tier1_assessments')
        .insert({
          user_id: user.user.id,
          engagement_id: engagement.id,
          project_name: projectName,
          business_name: businessName,
          industry: industry === 'Other' ? otherIndustry : industry,
          current_state: currentState,
          needs_array: needs,
          website_scope: websiteScope,
          marketing_timing: marketingTiming,
          budget_range: budgetRange,
          timeline_expectation: timelineExpectation,
          target_date: targetDate || null,
          primary_goal: primaryGoal,
          recommended_package: result.recommendedPackage,
          recommendation_confidence: result.confidenceLevel,
          budget_aligned: result.budgetAligned,
          has_mismatch: result.hasMismatch,
          mismatch_type: result.mismatchType,
          mismatch_resolved: true,
          reasoning: result.reasoning,
          internal_notes: result.internalNotes,
        })
        .select();

      if (tier1Error) throw tier1Error;

      // Update engagement to point to tier1 assessment
      if (tier1Data && tier1Data[0]) {
        await supabase
          .from('engagements')
          .update({
            tier1_assessment_id: tier1Data[0].id,
            recommended_package: result.recommendedPackage,
          })
          .eq('id', engagement.id);
      }

      // Navigate directly to Tier 2 form
      navigate(`/crm/tier2-form/${engagement.id}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMismatchResolution = (option: string) => {
    if (option === 'reduce_scope') {
      setWebsiteScope('standard');
    } else if (option === 'adjust_budget') {
      setBudgetRange('growth_budget');
    } else if (option === 'extend_timeline') {
      setTimelineExpectation('patient');
    } else if (option === 'reduce_timeline_scope') {
      setWebsiteScope('compact');
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
      setScreen('mismatch');
    } else {
      setScreen('recommendation');
    }
  };

  const handleContinueToTier2 = async () => {
    if (!engagement || !recommendation) return;

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data: tier1Data, error: tier1Error } = await supabase
        .from('tier1_assessments')
        .insert({
          user_id: user.user.id,
          engagement_id: engagement.id,
          project_name: projectName,
          business_name: businessName,
          industry: industry === 'Other' ? otherIndustry : industry,
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
        .select('id')
        .single();

      if (tier1Error) throw tier1Error;

      const { error: updateError } = await supabase
        .from('crm_engagements')
        .update({
          tier1_submitted_at: new Date().toISOString(),
          status: 'tier1_submitted',
          tier1_assessment_id: tier1Data.id,
          recommended_package: recommendation.recommendedPackage,
        })
        .eq('id', engagement.id);

      if (updateError) throw updateError;

      setScreen('complete');
      setTimeout(() => {
        navigate('/crm/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving Tier 1 assessment:', error);
      alert('Failed to save assessment. Please try again.');
      setSubmitting(false);
    }
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;
    return (
      <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="font-semibold text-red-800 mb-2">
          Please fix these issues:
        </p>
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

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!engagement) {
    return <div className="text-center py-12">Unable to load engagement</div>;
  }

  if (screen === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-4xl font-bold text-[#37306B] mb-4">
            Tier 1 Complete!
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Thank you! We're processing your assessment...
          </p>
          <p className="text-gray-500">Redirecting in a moment...</p>
        </div>
      </div>
    );
  }

  if (screen === 'mismatch') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3]">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-[#37306B] mb-4">
              Let's Align Your Expectations
            </h1>
            <p className="text-gray-600 mb-8">
              We've identified a mismatch between your timeline, budget, and scope. Let's resolve this together.
            </p>

            <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-yellow-800">
                  <strong>Issue:</strong> {recommendation?.reasoning}
                </p>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-gray-900">How would you like to proceed?</p>
                
                <button
                  onClick={() => handleMismatchResolution('reduce_scope')}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all"
                >
                  <div className="font-semibold text-gray-900">Reduce Scope</div>
                  <div className="text-sm text-gray-600">Simplify features to fit timeline and budget</div>
                </button>

                <button
                  onClick={() => handleMismatchResolution('adjust_budget')}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all"
                >
                  <div className="font-semibold text-gray-900">Increase Budget</div>
                  <div className="text-sm text-gray-600">Upgrade to a larger budget tier</div>
                </button>

                <button
                  onClick={() => handleMismatchResolution('extend_timeline')}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all"
                >
                  <div className="font-semibold text-gray-900">Extend Timeline</div>
                  <div className="text-sm text-gray-600">Take more time to build your vision</div>
                </button>

                <button
                  onClick={() => handleMismatchResolution('reduce_timeline_scope')}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all"
                >
                  <div className="font-semibold text-gray-900">Phased Approach</div>
                  <div className="text-sm text-gray-600">Start with essentials, add features later</div>
                </button>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  onClick={() => {
                    setScreen('form');
                    setRecommendation(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                >
                  Back to Form
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'recommendation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3]">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-[#37306B] mb-4">
              Your Package Recommendation
            </h1>

            <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
              <div className="text-center py-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <div className="text-6xl font-bold text-purple-600 mb-2">
                  {recommendation?.recommendedPackage.toUpperCase()}
                </div>
                <p className="text-gray-600">Based on your requirements</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Confidence Level</p>
                  <p className="text-2xl font-bold text-blue-600">{recommendation?.confidenceLevel}%</p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Budget Alignment</p>
                  <p className="text-2xl font-bold text-green-600">
                    {recommendation?.budgetAligned ? '✓' : '×'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Why This Package?</h3>
                <p className="text-gray-600 bg-gray-50 p-4 rounded">
                  {recommendation?.reasoning}
                </p>
              </div>

              {recommendation?.internalNotes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Internal Notes</h3>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded">
                    {recommendation.internalNotes}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setScreen('form');
                    setRecommendation(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                >
                  Edit Responses
                </Button>
                <Button
                  onClick={handleContinueToTier2}
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submitting ? 'Saving...' : 'Proceed to Tier 2'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3]">
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="text-sm font-medium text-[#37306B] mb-2">
              Step 1 of 2: Project Assessment
            </div>
            <h1 className="text-4xl font-bold text-[#37306B] mb-2">
              Let's Get Started!
            </h1>
            <p className="text-lg text-gray-600">
              Tell us about your project so we can recommend the right approach for you.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {renderValidationErrors()}

            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Section 1: Project Basics */}
              <div className="space-y-6 pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Project Basics</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                    placeholder="Your project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                    placeholder="Your business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select an industry...</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {industry === 'Other' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Please Specify *
                    </label>
                    <input
                      type="text"
                      value={otherIndustry}
                      onChange={(e) => setOtherIndustry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                      placeholder="Your industry"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Assessment */}
              <div className="space-y-6 pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Assessment</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Digital Presence *
                  </label>
                  <select
                    value={currentState}
                    onChange={(e) => setCurrentState(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select...</option>
                    <option value="no_online">No online presence</option>
                    <option value="outdated">Outdated website</option>
                    <option value="basic">Basic website</option>
                    <option value="functional">Functional but needs improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What do you need? (Select all that apply) *
                  </label>
                  <div className="space-y-2">
                    {needsOptions.map((need) => (
                      <label key={need} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={needs.includes(need)}
                          onChange={() => toggleNeed(need)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="ml-3 text-gray-700">{need}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website Scope *
                  </label>
                  <select
                    value={websiteScope}
                    onChange={(e) => setWebsiteScope(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select scope...</option>
                    <option value="compact">Compact (5-10 pages)</option>
                    <option value="standard">Standard (10-20 pages)</option>
                    <option value="comprehensive">Comprehensive (20+ pages)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    When do you want to start marketing? *
                  </label>
                  <select
                    value={marketingTiming}
                    onChange={(e) => setMarketingTiming(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select timing...</option>
                    <option value="immediately">Immediately</option>
                    <option value="during_build">During build phase</option>
                    <option value="after_launch">After launch</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Timeline & Budget */}
              <div className="space-y-6 pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Timeline & Budget</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget Range *
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select budget...</option>
                    <option value="starter_budget">Under $5k</option>
                    <option value="growth_budget">$5k - $15k</option>
                    <option value="professional_budget">$15k - $35k</option>
                    <option value="enterprise_budget">$35k+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Timeline Expectation *
                  </label>
                  <select
                    value={timelineExpectation}
                    onChange={(e) => setTimelineExpectation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  >
                    <option value="">Select timeline...</option>
                    <option value="urgent">ASAP (1-2 months)</option>
                    <option value="normal">Normal (2-4 months)</option>
                    <option value="patient">Flexible (4+ months)</option>
                    <option value="specific_date">Specific launch date</option>
                  </select>
                </div>

                {timelineExpectation === 'specific_date' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Target Launch Date *
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Goals */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Goals</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Primary Goal *
                  </label>
                  <textarea
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                    placeholder="What's your main goal for this project?"
                    rows={4}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  onClick={() => navigate('/crm/dashboard')}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Get Recommendation
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
