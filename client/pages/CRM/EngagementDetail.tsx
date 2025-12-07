import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getEngagement, getStageProgress, getDeliverables, getInternalNotes, deleteEngagement } from '@/lib/crm-admin';
import { Button } from '@/components/ui/button';

export default function EngagementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tier1' | 'tier2' | 'stages' | 'deliverables' | 'notes'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: eng } = await getEngagement(id);
        setEngagement(eng);

        const { data: stageData } = await getStageProgress(id);
        setStages(stageData || []);

        const { data: delData } = await getDeliverables(id);
        setDeliverables(delData || []);

        const { data: noteData } = await getInternalNotes(id);
        setNotes(noteData || []);
      } catch (error) {
        console.error('Error fetching engagement:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!engagement) return <div className="text-center py-8">Engagement not found</div>;

  const TabButton = ({ name, label }: { name: typeof activeTab; label: string }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
        activeTab === name
          ? 'border-purple-600 text-purple-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/crm/engagements')} className="text-gray-600 hover:text-gray-900">
          ← Back
        </button>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          {engagement.title}
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {engagement.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 flex">
          <TabButton name="overview" label="Overview" />
          <TabButton name="tier1" label="Tier 1" />
          <TabButton name="tier2" label="Tier 2" />
          <TabButton name="stages" label="Stages" />
          <TabButton name="deliverables" label="Deliverables" />
          <TabButton name="notes" label="Notes" />
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">Client Email</label>
                  <p className="text-gray-600">{engagement.client_email || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Program</label>
                  <p className="text-gray-600">{engagement.program}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Budget</label>
                  <p className="text-gray-600">${engagement.budget || '0'}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Current Stage</label>
                  <p className="text-gray-600">{engagement.current_stage}/7</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tier1' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Submitted At</label>
                <p className="text-gray-600">{engagement.tier1_submitted_at ? new Date(engagement.tier1_submitted_at).toLocaleString() : 'Not submitted'}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Feedback</label>
                <textarea
                  value={engagement.tier1_feedback || ''}
                  readOnly
                  className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
                  rows={4}
                />
              </div>
            </div>
          )}

          {activeTab === 'tier2' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-gray-700">Submitted At</label>
                <p className="text-gray-600">{engagement.tier2_submitted_at ? new Date(engagement.tier2_submitted_at).toLocaleString() : 'Not submitted'}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Feedback</label>
                <textarea
                  value={engagement.tier2_feedback || ''}
                  readOnly
                  className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
                  rows={4}
                />
              </div>
            </div>
          )}

          {activeTab === 'stages' && (
            <div className="space-y-3">
              {stages.length > 0 ? (
                stages.map((stage) => (
                  <div key={stage.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold">Stage {stage.stage_number}</h4>
                      <span className="px-2 py-1 text-xs rounded bg-gray-100">{stage.status}</span>
                    </div>
                    {stage.notes && <p className="text-sm text-gray-600 mt-2">{stage.notes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No stages yet</p>
              )}
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-3">
              {deliverables.length > 0 ? (
                deliverables.map((del) => (
                  <div key={del.id} className="border rounded-lg p-4">
                    <h4 className="font-bold">{del.title}</h4>
                    <p className="text-sm text-gray-600">{del.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No deliverables yet</p>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-600">{note.author_email}</p>
                    <p className="text-sm text-gray-500">{new Date(note.created_at).toLocaleString()}</p>
                    <p className="mt-2">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No notes yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
