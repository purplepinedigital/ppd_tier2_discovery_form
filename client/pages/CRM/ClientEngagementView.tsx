import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getClientEngagementData, getClientDeliverables, getClientActivity, getClientStageProgress } from '@/lib/crm-client';

export default function ClientEngagementView() {
  const { id } = useParams();
  const [engagement, setEngagement] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tier1Assessment, setTier1Assessment] = useState<any>(null);
  const [tier2Responses, setTier2Responses] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

        if (engData.data) setEngagement(engData.data);
        if (stageData.data) setStages(stageData.data);
        if (delivData.data) setDeliverables(delivData.data);
        if (actData.data) setActivities(actData.data);

        // Fetch Tier 1 assessment if it exists
        const { data: tier1Data } = await supabase
          .from('tier1_assessments')
          .select('*')
          .eq('engagement_id', id)
          .single();
        if (tier1Data) setTier1Assessment(tier1Data);

        // Fetch Tier 2 responses if they exist
        const { data: tier2Data } = await supabase
          .from('tier2_form_progress')
          .select('*')
          .eq('engagement_id', id)
          .single();
        if (tier2Data) setTier2Responses(tier2Data);
      } catch (error) {
        console.error('Error fetching engagement data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12">Loading your project...</div>;
  }

  if (!engagement) {
    return <div className="text-center py-12">Unable to load your project</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stage Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Project Progress</h3>
        <div className="flex gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((stage) => (
            <div
              key={stage}
              className={`flex-1 h-3 rounded transition-all ${
                stage <= engagement.current_stage
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Currently in Stage {engagement.current_stage} of 7
        </p>
      </div>

      {/* Tier 1 Assessment */}
      {tier1Assessment && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Tier 1 Assessment</h3>
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

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📁 Deliverables</h3>
          <div className="space-y-3">
            {deliverables.map((del) => (
              <div key={del.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-900">{del.title}</h4>
                {del.description && <p className="text-sm text-gray-600 mt-1">{del.description}</p>}
                {del.file_url && (
                  <a
                    href={del.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-900 text-sm font-medium mt-2 inline-block"
                  >
                    Download →
                  </a>
                )}
              </div>
            ))}
          </div>
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
  );
}
