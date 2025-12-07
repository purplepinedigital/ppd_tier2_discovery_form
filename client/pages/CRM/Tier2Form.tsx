import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getClientEngagement } from '@/lib/crm-client';
import { supabase } from '@/lib/supabase';

const tier2Questions = [
  "Tell us about your company's history and background",
  "What are your main business objectives?",
  "Who are your target customers?",
  "What problems do you solve for your customers?",
  "Describe your competitive advantages",
  "What is your current marketing strategy?",
  "How do you currently acquire customers?",
  "What is your customer retention rate?",
  "What are your top services or products?",
  "What makes your brand unique?",
  "Describe your ideal customer",
  "What are your main business challenges?",
  "What is your business model?",
  "How do you measure success?",
  "What are your growth plans for the next year?",
  "What is your current website strategy?",
  "What are your main pain points with your current website?",
  "What would an ideal website solution look like?",
  "What features are most important to you?",
  "How do you want customers to interact with your brand online?",
  "What is your timeline for this project?",
  "Who are the key decision makers on your team?",
  "What is your budget for this project?",
  "Have you worked with agencies before?",
  "What did or didn't work in past projects?",
  "What are your expectations for communication and reporting?",
  "How frequently do you want to meet?",
  "What success metrics matter most to you?",
  "What are your long-term business goals?",
  "Is there anything else you'd like us to know?",
];

export default function Tier2Form() {
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<(string | null)[]>(new Array(30).fill(''));
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const fetchEngagement = async () => {
      const { data } = await getClientEngagement();
      if (data) {
        setEngagement(data);
      }
      setLoading(false);
    };
    fetchEngagement();
  }, []);

  const handleResponseChange = (index: number, value: string) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engagement) return;

    setSubmitting(true);
    setError('');

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data: tier2Data, error: tier2Error } = await supabase
        .from('tier2_form_progress')
        .insert({
          user_id: user.user.id,
          engagement_id: engagement.id,
          responses,
        })
        .select('id')
        .single();

      if (tier2Error) throw tier2Error;

      const { error: updateError } = await supabase
        .from('crm_engagements')
        .update({
          tier2_submitted_at: new Date().toISOString(),
          status: 'tier2_submitted',
          tier2_form_id: tier2Data.id,
        })
        .eq('id', engagement.id);

      if (updateError) throw updateError;

      navigate('/crm/dashboard');
    } catch (err: any) {
      console.error('Error submitting Tier 2 form:', err);
      setError(err.message || 'Failed to submit form');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!engagement) {
    return <div className="text-center py-12">Unable to load engagement</div>;
  }

  const questionsPerSection = 5;
  const totalSections = Math.ceil(tier2Questions.length / questionsPerSection);
  const startIndex = currentSection * questionsPerSection;
  const endIndex = Math.min(startIndex + questionsPerSection, tier2Questions.length);
  const currentQuestions = tier2Questions.slice(startIndex, endIndex);

  const progressPercentage = Math.round(
    (responses.filter(r => r && r.trim()).length / 30) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFAEE] to-[#F5E6D3]">
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="text-sm font-medium text-[#37306B] mb-2">
              Step 2 of 2: Discovery Form
            </div>
            <h1 className="text-4xl font-bold text-[#37306B] mb-2">
              Tier 2 Discovery Form
            </h1>
            <p className="text-lg text-gray-600">
              30 Detailed Questions to Help Us Understand Your Business
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Overall Progress</label>
                <span className="text-sm text-gray-600">{responses.filter(r => r && r.trim()).length}/30 answered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Section Progress */}
            <div className="mb-8">
              <div className="text-sm text-gray-600 mb-2">
                Section {currentSection + 1} of {totalSections}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalSections }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded transition-colors ${
                      idx <= currentSection ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Questions */}
              {currentQuestions.map((question, sectionIdx) => {
                const globalIdx = startIndex + sectionIdx;
                return (
                  <div key={globalIdx} className="border-b border-gray-200 pb-6 last:border-0">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {globalIdx + 1}. {question}
                      {!responses[globalIdx]?.trim() && <span className="text-red-600"> *</span>}
                    </label>
                    <textarea
                      value={responses[globalIdx] || ''}
                      onChange={(e) => handleResponseChange(globalIdx, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                      placeholder="Your answer..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Question {globalIdx + 1} of {tier2Questions.length}
                    </p>
                  </div>
                );
              })}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                {currentSection > 0 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(currentSection - 1)}
                    disabled={submitting}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                  >
                    ← Previous Section
                  </Button>
                )}
                
                {currentSection < totalSections - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(currentSection + 1)}
                    disabled={submitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Next Section →
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => navigate('/crm/dashboard')}
                      disabled={submitting}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                    >
                      Save & Exit
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {submitting ? 'Submitting...' : 'Submit Tier 2 Form'}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
