import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getEngagement, getStageProgress, getDeliverables, getInternalNotes, deleteEngagement } from '@/lib/crm-admin';
import { Button } from '@/components/ui/button';
import { formSections } from '@/data/discovery-form';

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

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this engagement? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await deleteEngagement(id);
      if (error) {
        alert('Error deleting engagement: ' + error.message);
      } else {
        navigate('/admin/crm/engagements');
      }
    } finally {
      setDeleting(false);
    }
  };

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
      <div className="flex items-center justify-between gap-4">
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
        <Button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {deleting ? 'Deleting...' : 'Delete Engagement'}
        </Button>
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
              {engagement.tier1_assessment_id ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-gray-700">Submitted At</label>
                      <p className="text-gray-600">{engagement.tier1_submitted_at ? new Date(engagement.tier1_submitted_at).toLocaleString() : 'Not submitted'}</p>
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">Recommended Package</label>
                      <p className="text-gray-600 font-bold text-purple-600">{engagement.recommended_package?.toUpperCase() || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Assessment Details</h4>
                    <Tier1AssessmentDisplay engagementId={engagement.id} engagementTitle={engagement.title} />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">Feedback</label>
                    <textarea
                      value={engagement.tier1_feedback || ''}
                      readOnly
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
                      rows={4}
                      placeholder="No feedback yet"
                    />
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No Tier 1 assessment submitted yet</p>
              )}
            </div>
          )}

          {activeTab === 'tier2' && (
            <div className="space-y-4">
              {engagement.status === 'tier2_submitted' || engagement.status === 'in_stages' || engagement.status === 'completed' ? (
                <>
                  <div>
                    <label className="font-semibold text-gray-700">Submitted At</label>
                    <p className="text-gray-600">{engagement.tier2_submitted_at ? new Date(engagement.tier2_submitted_at).toLocaleString() : 'Not submitted'}</p>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Discovery Responses (31 Questions)</h4>
                    <Tier2ResponsesDisplay engagementId={engagement.id} engagementTitle={engagement.title} />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">Feedback</label>
                    <textarea
                      value={engagement.tier2_feedback || ''}
                      readOnly
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
                      rows={4}
                      placeholder="No feedback yet"
                    />
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No Tier 2 assessment submitted yet</p>
              )}
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

// Helper component to display Tier 1 assessment details
function Tier1AssessmentDisplay({ engagementId, engagementTitle }: { engagementId: string; engagementTitle?: string }) {
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const exportToCSV = () => {
    if (!assessment) return;

    const headers = ['Field', 'Value'];
    const data = [
      ['Project Name', assessment.project_name],
      ['Business Name', assessment.business_name],
      ['Industry', assessment.industry],
      ['Current State', assessment.current_state],
      ['Needs', (assessment.needs_array || []).join('; ')],
      ['Website Scope', assessment.website_scope],
      ['Marketing Timing', assessment.marketing_timing],
      ['Budget Range', assessment.budget_range],
      ['Timeline Expectation', assessment.timeline_expectation],
      ['Primary Goal', assessment.primary_goal],
      ['Recommended Package', assessment.recommended_package],
      ['Confidence Level', assessment.recommendation_confidence],
      ['Budget Aligned', assessment.budget_aligned ? 'Yes' : 'No'],
    ];

    const csv = [headers, ...data].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${engagementTitle}-tier1-assessment.csv`;
    link.click();
  };

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const { data, error } = await supabase
          .from('tier1_temp')
          .select('*')
          .eq('engagement_id', engagementId)
          .single();

        if (!error && data) {
          setAssessment(data);
        }
      } catch (err) {
        console.error('Error fetching Tier 1 assessment:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [engagementId]);

  if (loading) return <p className="text-gray-500">Loading assessment...</p>;
  if (!assessment) return <p className="text-gray-500">No assessment data found</p>;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-gray-600">Business Name:</span>
          <p className="font-semibold">{assessment.business_name}</p>
        </div>
        <div>
          <span className="text-gray-600">Industry:</span>
          <p className="font-semibold">{assessment.industry}</p>
        </div>
        <div>
          <span className="text-gray-600">Current State:</span>
          <p className="font-semibold">{assessment.current_state}</p>
        </div>
        <div>
          <span className="text-gray-600">Website Scope:</span>
          <p className="font-semibold">{assessment.website_scope}</p>
        </div>
        <div>
          <span className="text-gray-600">Budget Range:</span>
          <p className="font-semibold">{assessment.budget_range}</p>
        </div>
        <div>
          <span className="text-gray-600">Timeline:</span>
          <p className="font-semibold">{assessment.timeline_expectation}</p>
        </div>
      </div>

      {assessment.needs_array && assessment.needs_array.length > 0 && (
        <div>
          <span className="text-gray-600">Needs:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {assessment.needs_array.map((need: string) => (
              <span key={need} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {need}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="text-gray-600">Primary Goal:</span>
        <p className="mt-1 text-gray-700">{assessment.primary_goal}</p>
      </div>

      {assessment.recommendation_confidence && (
        <div className="bg-blue-50 p-3 rounded">
          <span className="text-gray-600">Recommendation Confidence:</span>
          <p className="font-semibold text-blue-600">{assessment.recommendation_confidence}%</p>
        </div>
      )}

      {assessment.reasoning && (
        <div>
          <span className="text-gray-600">Reasoning:</span>
          <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">{assessment.reasoning}</p>
        </div>
      )}

      <button
        onClick={exportToCSV}
        className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
      >
        📥 Export as CSV
      </button>
    </div>
  );
}

// Helper component to display Tier 2 form responses
function Tier2ResponsesDisplay({ engagementId, engagementTitle }: { engagementId: string; engagementTitle?: string }) {
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const exportToCSV = () => {
    if (!formData || !formData.responses) return;

    const responses = formData.responses || [];
    const headers = ['Question #', 'Question', 'Response'];
    const tier2Questions = formSections.flatMap(section =>
      section.questions.map(q => q.prompt)
    );

    const data = tier2Questions.map((question, index) => [
      index + 1,
      question,
      responses[index] || 'No response'
    ]);

    const csv = [headers, ...data].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${engagementTitle}-tier2-discovery.csv`;
    link.click();
  };

  const tier2Questions = formSections.flatMap(section =>
    section.questions.map(q => q.prompt)
  );

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const { data, error } = await supabase
          .from('tier2_temp')
          .select('*')
          .eq('engagement_id', engagementId)
          .single();

        if (!error && data) {
          setFormData(data);
        }
      } catch (err) {
        console.error('Error fetching Tier 2 responses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [engagementId]);

  if (loading) return <p className="text-gray-500">Loading responses...</p>;
  if (!formData) return <p className="text-gray-500">No responses found</p>;

  const responses = formData.responses || [];
  const answeredCount = responses.filter((r: string) => r && r.trim()).length;

  return (
    <div className="space-y-4">
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          <strong>{answeredCount} out of {tier2Questions.length}</strong> questions answered
        </p>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all"
            style={{ width: `${(answeredCount / tier2Questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {tier2Questions.map((question, index) => (
          <div key={index} className="border rounded-lg p-3 bg-gray-50">
            <p className="font-semibold text-sm text-gray-900">
              {index + 1}. {question}
            </p>
            {responses[index] ? (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {responses[index]}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-2 italic">No response provided</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={exportToCSV}
        className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
      >
        📥 Export as CSV
      </button>
    </div>
  );
}
