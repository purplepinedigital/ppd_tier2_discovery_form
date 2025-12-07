import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getClientEngagements } from '@/lib/crm-client';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user?.email) {
          setEmail(user.user.email);
        }

        const { data } = await getClientEngagements();
        if (data) {
          setEngagements(data);
        }
      } catch (error) {
        console.error('Error fetching engagements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_tier1':
        return 'bg-yellow-100 text-yellow-800';
      case 'tier1_submitted':
        return 'bg-blue-100 text-blue-800';
      case 'awaiting_tier2':
        return 'bg-purple-100 text-purple-800';
      case 'tier2_submitted':
        return 'bg-indigo-100 text-indigo-800';
      case 'in_stages':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'awaiting_tier1':
        return '📋 Complete Tier 1 Form';
      case 'tier1_submitted':
        return '📋 Complete Tier 2 Form';
      case 'awaiting_tier2':
        return '📋 Complete Tier 2 Form';
      case 'tier2_submitted':
        return '✓ Forms Complete';
      case 'in_stages':
        return '🚀 In Progress';
      case 'completed':
        return '✅ Completed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              My Projects
            </h1>
            <p className="text-gray-600 text-sm mt-2">Welcome, {email}</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {engagements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">No projects assigned yet.</p>
            <p className="text-gray-500">Please check back later or contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engagements.map((engagement) => (
              <div
                key={engagement.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-purple-400 overflow-hidden"
              >
                <div className="p-6">
                  {/* Project Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {engagement.title}
                  </h3>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(engagement.status)}`}>
                      {getStatusLabel(engagement.status)}
                    </span>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-2 mb-6 text-sm">
                    {engagement.program && (
                      <div>
                        <p className="text-gray-600">Program: <span className="font-semibold text-gray-900">{engagement.program}</span></p>
                      </div>
                    )}
                    {engagement.budget && (
                      <div>
                        <p className="text-gray-600">Budget: <span className="font-semibold text-gray-900">${(engagement.budget).toLocaleString()}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span className="font-semibold">Stage Progress</span>
                      <span>{engagement.current_stage}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${(engagement.current_stage / 7) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Action */}
                  {engagement.status === 'awaiting_tier1' && (
                    <Button
                      onClick={() => navigate(`/crm/tier1/${engagement.id}`)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Fill Tier 1 Form →
                    </Button>
                  )}
                  {(engagement.status === 'tier1_submitted' || engagement.status === 'awaiting_tier2') && (
                    <Button
                      onClick={() => navigate(`/crm/tier2/${engagement.id}`)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Fill Tier 2 Form →
                    </Button>
                  )}
                  {(engagement.status === 'tier2_submitted' || engagement.status === 'in_stages' || engagement.status === 'completed') && (
                    <Button
                      onClick={() => navigate(`/crm/client/${engagement.id}`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View Project Details →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
