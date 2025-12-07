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
