import { useNavigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getClientEngagement } from '@/lib/crm-client';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, FileText, BookOpen, CheckSquare, LogOut } from 'lucide-react';

export default function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
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

        // If we have an engagement ID in params, use that
        if (id) {
          const { data, error: fetchError } = await supabase
            .from('crm_engagements')
            .select('*')
            .eq('id', id)
            .eq('client_user_id', user.user.id)
            .single();

          if (fetchError) {
            console.error('Error fetching engagement:', fetchError);
            setError(`Failed to load engagement: ${fetchError}`);
          } else if (data) {
            setEngagement(data);
          }
        } else {
          // No ID provided, try to get the first/primary engagement
          const { data, error: fetchError } = await supabase
            .from('crm_engagements')
            .select('*')
            .eq('client_user_id', user.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (fetchError) {
            console.error('Error fetching engagement:', fetchError);
            setError(`Failed to load engagement: ${fetchError}`);
          } else if (data && data.length > 0) {
            setEngagement(data[0]);
          } else {
            console.error('No engagement data returned for user:', user.user?.id);
            setError('No project found for your account. Please ensure you have accepted the invitation and contact support if the issue persists.');
          }
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchEngagement();
  }, [location.pathname, id]);

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
      {/* Header with Navigation */}
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 mt-4 border-b border-gray-200 pb-0 flex-wrap">
            <button
              onClick={() => navigate('/crm/engagements')}
              className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 border-b-2 border-transparent hover:border-purple-600 transition-colors"
            >
              <LayoutDashboard size={18} />
              My Projects
            </button>
            <button
              onClick={() => navigate('/crm/dashboard')}
              className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 border-b-2 border-transparent hover:border-purple-600 transition-colors"
            >
              <FileText size={18} />
              Project Overview
            </button>
            {(engagement.status === 'awaiting_tier1') && (
              <button
                onClick={() => navigate('/crm/tier1')}
                className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600 bg-purple-50 rounded-t"
              >
                <BookOpen size={18} />
                Tier 1 Form
              </button>
            )}
            {(engagement.status === 'tier1_submitted' || engagement.status === 'awaiting_tier2') && (
              <button
                onClick={() => navigate('/crm/tier2')}
                className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600 bg-purple-50 rounded-t"
              >
                <BookOpen size={18} />
                Tier 2 Form
              </button>
            )}
            {(engagement.status === 'tier2_submitted' || engagement.status === 'in_stages' || engagement.status === 'completed') && (
              <button
                onClick={() => navigate(`/crm/client/${engagement.id}`)}
                className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 border-b-2 border-transparent hover:border-purple-600 transition-colors"
              >
                <CheckSquare size={18} />
                Project Progress
              </button>
            )}
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
