import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getEngagements, deleteEngagement } from '@/lib/crm-admin';
import { Trash2 } from 'lucide-react';
import NewEngagementModal from './NewEngagementModal';

export default function EngagementsManagement() {
  const navigate = useNavigate();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewEngagementModal, setShowNewEngagementModal] = useState(false);
  const [refetch, setRefetch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (engagementId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(engagementId);
    try {
      const { error } = await deleteEngagement(engagementId);
      if (error) {
        alert('Error deleting engagement: ' + error.message);
      } else {
        setEngagements(engagements.filter(e => e.id !== engagementId));
      }
    } finally {
      setDeletingId(null);
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Client Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Budget</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {engagements.map((eng) => (
                  <tr key={eng.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium cursor-pointer hover:text-purple-600" onClick={() => navigate(`/admin/crm/engagements/${eng.id}`)}>
                      {eng.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eng.client_email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {eng.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{eng.current_stage}/7</td>
                    <td className="px-4 py-3 text-gray-600">{eng.budget ? `$${(eng.budget).toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => navigate(`/admin/crm/engagements/${eng.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                        >
                          View
                        </Button>
                        <button
                          onClick={() => handleDelete(eng.id, eng.title)}
                          disabled={deletingId === eng.id}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete engagement"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No engagements found</div>
        )}
      </div>

      <NewEngagementModal
        isOpen={showNewEngagementModal}
        onClose={() => setShowNewEngagementModal(false)}
        onSuccess={() => setRefetch(!refetch)}
      />
    </div>
  );
}
