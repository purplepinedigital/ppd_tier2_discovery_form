import { useNavigate, Outlet, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getClientEngagement } from '@/lib/crm-client';
import { supabase } from '@/lib/supabase';

export default function ClientLayout() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();

        if (!user.user) {
          setError('You need to accept an invitation to access your project. Check your email for the invitation link.');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await getClientEngagement();
        if (fetchError) {
          setError(fetchError);
        } else if (data) {
          setEngagement(data);
        } else {
          setError('No project found. Please check that you have accepted the correct invitation link.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchEngagement();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStageColor = (stage: number) => {
    const colors = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-rose-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
    ];
    return colors[stage] || 'bg-gray-500';
  };

  const getStageLabel = (stage: number) => {
    const labels = [
      'Discovery',
      'Strategy',
      'Design',
      'Development',
      'Testing',
      'Launch',
      'Optimization',
      'Completion',
    ];
    return labels[stage] || `Stage ${stage}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your project...</p>
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error || 'Unable to load your project'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
              Home
            </Button>
            <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-3xl font-bold text-[#37306B]"
                style={{ fontFamily: 'Epilogue, sans-serif' }}
              >
                {engagement.title}
              </h1>
              <p
                className="text-sm text-gray-600 mt-1"
                style={{ fontFamily: 'Literata, serif' }}
              >
                Your engagement project
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
            >
              Logout
            </button>
          </div>

          {/* Stage Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Current Stage: {getStageLabel(engagement.current_stage)}
              </label>
              <span className="text-xs text-gray-500">
                Stage {engagement.current_stage + 1} of 8
              </span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((stage) => (
                <div
                  key={stage}
                  className={`flex-1 h-3 rounded transition-all ${
                    stage <= engagement.current_stage
                      ? getStageColor(stage)
                      : 'bg-gray-300'
                  }`}
                  title={getStageLabel(stage)}
                />
              ))}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                engagement.status === 'awaiting_tier1'
                  ? 'bg-yellow-100 text-yellow-800'
                  : engagement.status === 'tier1_submitted'
                    ? 'bg-blue-100 text-blue-800'
                    : engagement.status === 'tier2_submitted'
                      ? 'bg-purple-100 text-purple-800'
                      : engagement.status === 'in_stages'
                        ? 'bg-green-100 text-green-800'
                        : engagement.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
              }`}
            >
              {engagement.status === 'awaiting_tier1'
                ? '📋 Awaiting Tier 1 Form'
                : engagement.status === 'tier1_submitted'
                  ? '✓ Tier 1 Submitted'
                  : engagement.status === 'awaiting_tier2'
                    ? '📋 Awaiting Tier 2 Form'
                    : engagement.status === 'tier2_submitted'
                      ? '✓ Forms Complete'
                      : engagement.status === 'in_stages'
                        ? '🚀 In Progress'
                        : engagement.status === 'completed'
                          ? '✅ Completed'
                          : engagement.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

// Import Supabase for logout
import { supabase } from '@/lib/supabase';
