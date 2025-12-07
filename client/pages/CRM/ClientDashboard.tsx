import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getClientEngagement, isAwaitingTier1, isAwaitingTier2, getNextAction } from '@/lib/crm-client';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p>Loading your project...</p>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="text-center py-12">
        <p>Unable to load your project</p>
      </div>
    );
  }

  const nextAction = getNextAction(engagement);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          {engagement.title}
        </h2>
        <p className="text-gray-600">Program: {engagement.program}</p>
      </div>

      {/* Current Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Current Status</h3>
          <p className="text-2xl font-bold text-blue-900">
            {engagement.status === 'awaiting_tier1' ? '📋 Tier 1 Form'
            : engagement.status === 'tier1_submitted' ? '✓ Tier 1 Complete'
            : engagement.status === 'awaiting_tier2' ? '📋 Tier 2 Form'
            : engagement.status === 'tier2_submitted' ? '✓ Forms Complete'
            : engagement.status === 'in_stages' ? '🚀 In Progress'
            : '✅ Completed'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6 border border-purple-200">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">Current Stage</h3>
          <p className="text-2xl font-bold text-purple-900">{engagement.current_stage}/7</p>
          <p className="text-xs text-purple-700 mt-1">Stages 0-7</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Next Action</h3>
          <p className="text-lg font-bold text-green-900">{nextAction}</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-300">
        <h3 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h3>

        {isAwaitingTier1(engagement) && (
          <div>
            <p className="text-gray-600 mb-4">
              Complete your Tier 1 assessment form to help us understand your business and needs.
            </p>
            <Button
              onClick={() => navigate('/crm/tier1')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Tier 1 Form →
            </Button>
          </div>
        )}

        {isAwaitingTier2(engagement) && (
          <div>
            <p className="text-gray-600 mb-4">
              Great! Now let's dive deeper with our detailed discovery form.
            </p>
            <Button
              onClick={() => navigate('/crm/tier2')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Tier 2 Form →
            </Button>
          </div>
        )}

        {engagement.tier2_submitted_at && !isAwaitingTier1(engagement) && !isAwaitingTier2(engagement) && (
          <div>
            <p className="text-gray-600 mb-4">
              Your forms are complete! Our team is working on your project. Stay tuned for updates.
            </p>
            <div className="space-y-2">
              {engagement.tier1_feedback && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Tier 1 Feedback:</p>
                  <p className="text-sm text-blue-800">{engagement.tier1_feedback}</p>
                </div>
              )}
              {engagement.tier2_feedback && (
                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Tier 2 Feedback:</p>
                  <p className="text-sm text-purple-800">{engagement.tier2_feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
