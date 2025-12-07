import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { submitTier2Form, getClientEngagement } from '@/lib/crm-client';

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
  const [currentQuestion, setCurrentQuestion] = useState(0);

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

    const result = await submitTier2Form(engagement.id, { responses });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      navigate('/crm/dashboard');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!engagement) {
    return <div className="text-center py-12">Unable to load engagement</div>;
  }

  const progressPercentage = Math.round(
    (responses.filter(r => r && r.trim()).length / 30) * 100
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Tier 2 Discovery Form
          </h2>
          <p className="text-gray-600 mt-2">30 Detailed Questions to Help Us Understand Your Business</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Progress</label>
            <span className="text-sm text-gray-600">{responses.filter(r => r && r.trim()).length}/30 answered</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {tier2Questions.map((question, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {index + 1}. {question} *
              </label>
              <textarea
                value={responses[index] || ''}
                onChange={(e) => handleResponseChange(index, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                placeholder="Your answer..."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-2">
                Question {index + 1} of {tier2Questions.length}
              </p>
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/crm/dashboard')}
              disabled={submitting}
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
          </div>
        </form>
      </div>
    </div>
  );
}
