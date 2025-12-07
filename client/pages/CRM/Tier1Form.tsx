import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { submitTier1Form, getClientEngagement } from '@/lib/crm-client';
import { useEffect } from 'react';

export default function Tier1Form() {
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    currentState: '',
    websiteScope: '',
    timeline: '',
    budget: '',
    primaryGoal: '',
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engagement) return;

    setSubmitting(true);
    setError('');

    const result = await submitTier1Form(engagement.id, formData);
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          Tier 1 Assessment Form
        </h2>
        <p className="text-gray-600 mb-6">
          Tell us about your business and your project goals
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name *</label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Your business name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Industry *</label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="e.g., Technology, Healthcare, Retail"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Digital State *</label>
            <input
              type="text"
              name="currentState"
              value={formData.currentState}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Describe your current online presence"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Website Scope *</label>
            <input
              type="text"
              name="websiteScope"
              value={formData.websiteScope}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="What do you want your website to include?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Timeline Expectation *</label>
            <select
              name="timeline"
              value={formData.timeline}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
            >
              <option value="">Select timeline...</option>
              <option value="ASAP">ASAP</option>
              <option value="1-3 months">1-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6+ months">6+ months</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Range *</label>
            <select
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
            >
              <option value="">Select budget...</option>
              <option value="Under $5k">Under $5k</option>
              <option value="$5k - $10k">$5k - $10k</option>
              <option value="$10k - $25k">$10k - $25k</option>
              <option value="$25k - $50k">$25k - $50k</option>
              <option value="$50k+">$50k+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Goal *</label>
            <textarea
              name="primaryGoal"
              value={formData.primaryGoal}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="What's your main goal for this project?"
              rows={4}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/crm/dashboard')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submitting ? 'Submitting...' : 'Submit Tier 1 Form'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
