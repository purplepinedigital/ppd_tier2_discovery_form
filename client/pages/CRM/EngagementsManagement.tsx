import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getEngagements } from '@/lib/crm-admin';
import NewEngagementModal from './NewEngagementModal';

export default function EngagementsManagement() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewEngagementModal, setShowNewEngagementModal] = useState(false);
  const [refetch, setRefetch] = useState(false);

  const loadEngagements = async () => {
    setLoading(true);
    try {
      const query = await getEngagements(statusFilter ? { status: statusFilter } : undefined);
      const { data } = await query;
      setEngagements(data || []);
    } catch (error) {
      console.error('Error fetching engagements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngagements();
  }, [statusFilter, refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          Engagements
        </h2>
        <Button
          onClick={() => setShowNewEngagementModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          + New Engagement
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="awaiting_tier1">Awaiting Tier 1</option>
            <option value="tier1_submitted">Tier 1 Submitted</option>
            <option value="awaiting_tier2">Awaiting Tier 2</option>
            <option value="tier2_submitted">Tier 2 Submitted</option>
            <option value="in_stages">In Stages</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading engagements...</div>
        ) : engagements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engagements.map((eng) => (
              <div key={eng.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/crm/engagements/${eng.id}`)}>
                <h3 className="font-bold text-lg mb-2">{eng.title}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Client: {eng.client_email || 'Not assigned'}</p>
                  <p>Status: <span className="font-semibold">{eng.status}</span></p>
                  <p>Stage: {eng.current_stage}/7</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No engagements found</div>
        )}
      </div>
    </div>
  );
}
