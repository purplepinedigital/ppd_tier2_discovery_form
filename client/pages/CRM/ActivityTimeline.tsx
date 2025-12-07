import { useState, useEffect } from 'react';
import { getActivity } from '@/lib/crm-admin';

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const query = await getActivity(undefined, filter ? { activityType: filter } : undefined);
        const { data } = await query;
        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [filter]);

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      'contact_created': '👤',
      'engagement_created': '📋',
      'tier1_submitted': '✅',
      'tier2_submitted': '✅',
      'deliverable_added': '📁',
      'stage_completed': '🎯',
      'note_added': '📝',
    };
    return icons[type] || '📌';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
        Activity Timeline
      </h2>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Activities</option>
            <option value="contact_created">Contact Created</option>
            <option value="engagement_created">Engagement Created</option>
            <option value="tier1_submitted">Tier 1 Submitted</option>
            <option value="tier2_submitted">Tier 2 Submitted</option>
            <option value="deliverable_added">Deliverable Added</option>
            <option value="stage_completed">Stage Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading activities...</div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                <div className="text-2xl flex-shrink-0">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    By: {activity.created_by_email || 'System'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No activities found</div>
        )}
      </div>
    </div>
  );
}
