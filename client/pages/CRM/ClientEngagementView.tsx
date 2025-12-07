import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getClientEngagementData, getClientDeliverables, getClientActivity, getClientStageProgress } from '@/lib/crm-client';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ArrowLeft, Edit2, X, Download, CheckCircle, Clock } from 'lucide-react';

export default function ClientEngagementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tier1Assessment, setTier1Assessment] = useState<any>(null);
  const [tier2Responses, setTier2Responses] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Editing state for stage 0
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedProgram, setEditedProgram] = useState('');
  const [editedBudget, setEditedBudget] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [engData, stageData, delivData, actData] = await Promise.all([
          getClientEngagementData(id),
          getClientStageProgress(id),
          getClientDeliverables(id),
          getClientActivity(id),
        ]);

        if (engData.data) {
          setEngagement(engData.data);
          // Initialize edit fields
          setEditedTitle(engData.data.title || '');
          setEditedProgram(engData.data.program || '');
          setEditedBudget(engData.data.budget?.toString() || '');
        }
        if (stageData.data) setStages(stageData.data);
        if (delivData.data) setDeliverables(delivData.data);
        if (actData.data) setActivities(actData.data);

        // Fetch Tier 1 assessment if it exists (latest one)
        const { data: tier1List } = await supabase
          .from('tier1_temp')
          .select('*')
          .eq('engagement_id', id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (tier1List && tier1List.length > 0) setTier1Assessment(tier1List[0]);

        // Fetch Tier 2 responses if they exist (latest one)
        const { data: tier2List } = await supabase
          .from('tier2_temp')
          .select('*')
          .eq('engagement_id', id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (tier2List && tier2List.length > 0) setTier2Responses(tier2List[0]);
      } catch (error) {
        console.error('Error fetching engagement data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaveChanges = async () => {
    if (!engagement || !id) return;

    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('crm_engagements')
        .update({
          title: editedTitle,
          program: editedProgram,
          budget: editedBudget ? parseFloat(editedBudget) : null,
        })
        .eq('id', id);

      if (error) throw error;

      // Update local engagement state
      setEngagement({
        ...engagement,
        title: editedTitle,
        program: editedProgram,
        budget: editedBudget ? parseFloat(editedBudget) : null,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading your project...</div>;
  }

  if (!engagement) {
    return <div className="text-center py-12">Unable to load your project</div>;
  }

  const stageLabels = [
    'Deep Discovery & Package Decision',
    'Identity & Positioning',
    'Visual Identity & Branding',
    'Development',
    'Testing & QA',
    'Launch Preparation',
    'Go Live',
    'Post-Launch Support',
  ];

  const stageDescriptions = [
    'Initial discovery phase to determine program fit',
    'Define who you are and where you fit in the market',
    'Create your visual language and brand guidelines',
    'Build and implement the solution',
    'Thoroughly test all functionality and user experience',
    'Get everything ready for launch',
    'Launch to the world',
    'Support after launch',
  ];

  const getStageLabel = (stage: number) => stageLabels[stage] || `Stage ${stage}`;
  const getStageDescription = (stage: number) => stageDescriptions[stage] || '';

  const canEditResponses = !stages.some(s => s.stage_number === 0 && s.status === 'completed');
  const stage0Completed = stages.some(s => s.stage_number === 0 && s.status === 'completed');

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <div className="bg-white shadow mb-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/crm')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to projects"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                {engagement.title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">Engagement ID: {id}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            engagement.status === 'awaiting_tier1' ? 'bg-yellow-100 text-yellow-800' :
            engagement.status === 'tier1_submitted' ? 'bg-blue-100 text-blue-800' :
            engagement.status === 'awaiting_tier2' ? 'bg-purple-100 text-purple-800' :
            engagement.status === 'tier2_submitted' ? 'bg-indigo-100 text-indigo-800' :
            engagement.status === 'in_stages' ? 'bg-green-100 text-green-800' :
            'bg-emerald-100 text-emerald-800'
          }`}>
            {engagement.status === 'awaiting_tier1' ? '📋 Awaiting Tier 1' :
             engagement.status === 'tier1_submitted' ? '✓ Tier 1 Complete' :
             engagement.status === 'awaiting_tier2' ? '📋 Awaiting Tier 2' :
             engagement.status === 'tier2_submitted' ? '✓ Forms Complete' :
             engagement.status === 'in_stages' ? '🚀 In Progress' :
             '✅ Completed'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12 space-y-8">

      {/* Editable Proposal Section (Stage 0) */}
      {canEdit && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-blue-900">📝 Proposal Details (Stage 0)</h3>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Edit2 size={18} />
                Edit Details
              </Button>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700 font-semibold">Project Name</p>
                <p className="text-lg text-blue-900 font-bold">{engagement.title}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-semibold">Program</p>
                <p className="text-lg text-blue-900">{engagement.program || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-semibold">Budget</p>
                <p className="text-lg text-blue-900">{engagement.budget ? `$${engagement.budget.toLocaleString()}` : 'Not specified'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
                <input
                  type="text"
                  value={editedProgram}
                  onChange={(e) => setEditedProgram(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Enter program name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget</label>
                <input
                  type="number"
                  value={editedBudget}
                  onChange={(e) => setEditedBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Enter budget amount"
                  step="100"
                  min="0"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveChanges}
                  disabled={saveLoading || !editedTitle.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveLoading ? '💾 Saving...' : '💾 Save Changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(engagement.title);
                    setEditedProgram(engagement.program || '');
                    setEditedBudget(engagement.budget?.toString() || '');
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage Progress Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Project Progress</h3>
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((stage) => (
            <div
              key={stage}
              className={`flex-1 h-3 rounded transition-all cursor-pointer hover:opacity-80 ${
                stage <= engagement.current_stage
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                  : 'bg-gray-300'
              }`}
              title={getStageLabel(stage)}
            />
          ))}
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Current Stage</p>
          <p className="text-lg font-bold text-blue-900">
            Stage {engagement.current_stage}: {getStageLabel(engagement.current_stage)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Progress: {Math.round((engagement.current_stage / 7) * 100)}%</p>
        </div>
      </div>

      {/* Tier 1 Assessment */}
      {tier1Assessment && (
        <div className={`rounded-lg shadow p-6 ${stage0Completed ? 'bg-gray-50 border border-gray-300' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">🎯 Tier 1 Assessment</h3>
            {!stage0Completed && canEditResponses && (
              <Button
                onClick={() => navigate(`/crm/tier1/${id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Edit2 size={18} />
                Edit Responses
              </Button>
            )}
            {stage0Completed && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                📦 Stage 0 Delivered - Read Only
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Business Name</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.business_name}</p>
            </div>
            <div>
              <p className="text-gray-600">Industry</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.industry}</p>
            </div>
            <div>
              <p className="text-gray-600">Current State</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.current_state}</p>
            </div>
            <div>
              <p className="text-gray-600">Budget Range</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.budget_range}</p>
            </div>
            <div>
              <p className="text-gray-600">Website Scope</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.website_scope}</p>
            </div>
            <div>
              <p className="text-gray-600">Timeline</p>
              <p className="font-semibold text-gray-900">{tier1Assessment.timeline_expectation}</p>
            </div>
          </div>

          {tier1Assessment.needs_array && tier1Assessment.needs_array.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-600 mb-2">Your Needs</p>
              <div className="flex flex-wrap gap-2">
                {tier1Assessment.needs_array.map((need: string) => (
                  <span key={need} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tier1Assessment.primary_goal && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-gray-600 text-sm">Primary Goal</p>
              <p className="text-gray-700 mt-1">{tier1Assessment.primary_goal}</p>
            </div>
          )}

          {tier1Assessment.recommended_package && (
            <div className="mt-4 p-3 bg-purple-50 rounded">
              <p className="text-gray-600 text-sm">Recommended Package</p>
              <p className="text-lg font-bold text-purple-600">{tier1Assessment.recommended_package.toUpperCase()}</p>
            </div>
          )}
        </div>
      )}

      {/* Tier 2 Discovery Form */}
      {tier2Responses && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Tier 2 Discovery Responses</h3>
          <Tier2ResponsesClientView responses={tier2Responses.responses || []} />
        </div>
      )}

      {/* Project Stages with Deliverables */}
      {stages.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">🎯 Project Stages</h3>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {stages.map((stage) => {
              const stageDeliverables = deliverables.filter(d => d.stage_number === stage.stage_number);
              const isStageCompleted = stage.status === 'completed';
              const isStageInProgress = stage.status === 'in_progress';
              const isCurrentStage = stage.stage_number === engagement.current_stage;

              return (
                <AccordionItem
                  key={stage.id}
                  value={`stage-${stage.stage_number}`}
                  className="border-0 border-b border-gray-200 last:border-0"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4 w-full text-left">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-gray-900">
                            Stage {stage.stage_number}
                          </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Included
                          </span>
                          {isStageCompleted && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 text-white flex items-center gap-1">
                              <CheckCircle size={12} />
                              Completed
                            </span>
                          )}
                          {isStageInProgress && !isStageCompleted && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Clock size={12} />
                              In Progress
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900">{getStageLabel(stage.stage_number)}</h4>
                        <p className="text-sm text-gray-600 mt-1">{getStageDescription(stage.stage_number)}</p>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 py-4 bg-gray-50">
                    {/* Deliverables for this stage */}
                    {stageDeliverables.length > 0 ? (
                      <div className="mb-4">
                        <h5 className="font-semibold text-gray-900 mb-3">Deliverables</h5>
                        <div className="space-y-2">
                          {stageDeliverables.map((del) => (
                            <div
                              key={del.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h6 className="font-semibold text-gray-900">{del.title}</h6>
                                  {del.description && (
                                    <p className="text-sm text-gray-600 mt-1">{del.description}</p>
                                  )}
                                </div>
                                {del.file_url && (
                                  <a
                                    href={del.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm font-medium transition-colors flex-shrink-0"
                                  >
                                    <Download size={16} />
                                    Download
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">No deliverables for this stage yet</p>
                      </div>
                    )}

                    {/* Notes if available */}
                    {stage.notes && (
                      <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700 font-semibold mb-1">Notes</p>
                        <p className="text-sm text-gray-600">{stage.notes}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Feedback */}
      <div className="space-y-4">
        {engagement.tier1_feedback && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-bold text-blue-900 mb-2">Tier 1 Assessment Feedback</h4>
            <p className="text-blue-800">{engagement.tier1_feedback}</p>
          </div>
        )}

        {engagement.tier2_feedback && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h4 className="font-bold text-purple-900 mb-2">Tier 2 Discovery Feedback</h4>
            <p className="text-purple-800">{engagement.tier2_feedback}</p>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Updates</h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <div className="text-xl flex-shrink-0">📌</div>
                <div>
                  <p className="font-semibold text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Helper component to display Tier 2 responses for clients
function Tier2ResponsesClientView({ responses }: { responses: (string | null)[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  const answeredCount = responses.filter(r => r && r.trim()).length;

  return (
    <div className="space-y-3">
      <div className="p-3 bg-purple-50 rounded">
        <p className="text-sm text-purple-800">
          <strong>{answeredCount} out of {tier2Questions.length}</strong> questions answered
        </p>
        <div className="w-full bg-purple-200 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-purple-600 h-full transition-all"
            style={{ width: `${(answeredCount / tier2Questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {tier2Questions.map((question, index) => (
          <div key={index}>
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-start justify-between gap-2"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">
                  {index + 1}. {question}
                </p>
                {responses[index] ? (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {responses[index]}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1 italic">No response</p>
                )}
              </div>
              <div className="text-xl text-gray-400 flex-shrink-0">
                {expandedIndex === index ? '▼' : '▶'}
              </div>
            </button>

            {expandedIndex === index && responses[index] && (
              <div className="mt-1 p-3 bg-white border-l-4 border-purple-600 rounded">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {responses[index]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
