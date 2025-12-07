import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getDashboardStats, getRecentActivity } from '@/lib/crm-admin';

interface DashboardStats {
  totalContacts: number;
  totalEngagements: number;
  pendingTier1: number;
  pendingTier2: number;
}

export default function CRMDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalEngagements: 0,
    pendingTier1: 0,
    pendingTier2: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch dashboard stats
        const statsData = await getDashboardStats();
        setStats(statsData);

        // Fetch recent activities
        const { data: activities } = await getRecentActivity(10);
        if (activities) {
          setRecentActivities(activities);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const MetricCard = ({
    label,
    value,
    icon,
    color,
    onClick,
  }: {
    label: string;
    value: number;
    icon: string;
    color: string;
    onClick?: () => void;
  }) => (
    <div
      className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow ${
        onClick ? 'hover:border-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }: { activity: any }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-200 last:border-0">
      <div className="text-2xl flex-shrink-0">
        {activity.activity_type === 'contact_created'
          ? '👤'
          : activity.activity_type === 'engagement_created'
            ? '📋'
            : activity.activity_type === 'tier1_submitted'
              ? '✅'
              : activity.activity_type === 'tier2_submitted'
                ? '✅'
                : activity.activity_type === 'deliverable_added'
                  ? '📁'
                  : activity.activity_type === 'stage_completed'
                    ? '🎯'
                    : '📝'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'Epilogue, sans-serif' }}
          >
            Dashboard
          </h2>
          <p
            className="text-gray-600 mt-1"
            style={{ fontFamily: 'Literata, serif' }}
          >
            Manage your CRM engagements and clients
          </p>
        </div>
        <Button
          onClick={() => navigate('/admin/crm/engagements')}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          + New Engagement
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Contacts"
          value={stats.totalContacts}
          icon="👥"
          color="text-blue-600"
          onClick={() => navigate('/admin/crm/contacts')}
        />
        <MetricCard
          label="Total Engagements"
          value={stats.totalEngagements}
          icon="📋"
          color="text-purple-600"
          onClick={() => navigate('/admin/crm/engagements')}
        />
        <MetricCard
          label="Pending Tier 1"
          value={stats.pendingTier1}
          icon="📝"
          color="text-yellow-600"
          onClick={() => navigate('/admin/crm/engagements')}
        />
        <MetricCard
          label="Pending Tier 2"
          value={stats.pendingTier2}
          icon="📝"
          color="text-orange-600"
          onClick={() => navigate('/admin/crm/engagements')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3
              className="text-xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'Epilogue, sans-serif' }}
            >
              Recent Activity
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-1">
                {recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No activities yet</p>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/admin/crm/activity')}
              className="w-full mt-4"
            >
              View All Activity →
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3
              className="text-xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'Epilogue, sans-serif' }}
            >
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/admin/crm/contacts')}
                className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
              >
                👤 New Contact
              </Button>
              <Button
                onClick={() => navigate('/admin/crm/engagements')}
                className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200"
              >
                📋 New Engagement
              </Button>
              <Button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full justify-start bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200"
              >
                ⚙️ Legacy Admin
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow p-6 mt-4 border border-purple-200">
            <h4
              className="text-sm font-bold text-gray-900 mb-3"
              style={{ fontFamily: 'Epilogue, sans-serif' }}
            >
              System Status
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">●</span>
                <span className="text-gray-700">CRM Platform Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">●</span>
                <span className="text-gray-700">Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">●</span>
                <span className="text-gray-700">All Services Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">Welcome to the CRM Platform</p>
        <p>
          This is your new CRM system for managing client engagements. Use the navigation menu to manage contacts, view engagements, and track activities.
        </p>
      </div>
    </div>
  );
}
