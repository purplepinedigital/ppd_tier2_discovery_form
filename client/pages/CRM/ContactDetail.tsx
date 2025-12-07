import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getContact, getEngagementsByContactId, deleteContact, deleteEngagement } from '@/lib/crm-admin';
import { getAdminId } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletingEngagementId, setDeletingEngagementId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const { data: contactData } = await getContact(id);
      setContact(contactData);

      if (contactData) {
        const { data: engagementsData } = await getEngagementsByContactId(id);
        setEngagements(engagementsData || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleDeleteContact = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this contact and all its engagements? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await deleteContact(id);
      if (error) {
        alert('Error deleting contact: ' + error.message);
      } else {
        navigate('/admin/crm/contacts');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteEngagement = async (engagementId: string) => {
    if (!window.confirm('Are you sure you want to delete this engagement?')) {
      return;
    }

    setDeletingEngagementId(engagementId);
    try {
      const adminId = getAdminId();
      const { error } = await deleteEngagement(engagementId);
      if (error) {
        alert('Error deleting engagement: ' + error.message);
      } else {
        setEngagements(engagements.filter(e => e.id !== engagementId));
      }
    } finally {
      setDeletingEngagementId(null);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!contact) return <div className="text-center py-8">Contact not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/crm/contacts')} className="text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            {contact.first_name} {contact.last_name}
          </h2>
        </div>
        <Button
          onClick={handleDeleteContact}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {deleting ? 'Deleting...' : 'Delete Contact'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Contact Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="font-semibold text-gray-700">Email</label>
              <p className="text-gray-600">{contact.email}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Business</label>
              <p className="text-gray-600">{contact.business_name || '-'}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Industry</label>
              <p className="text-gray-600">{contact.industry || '-'}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Status</label>
              <p className="text-gray-600">{contact.status}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Actions</h3>
          <div className="space-y-2">
            <Button
              onClick={() => navigate('/admin/crm/engagements')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Create New Engagement
            </Button>
            <Button
              onClick={() => navigate('/admin/crm/contacts')}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900"
            >
              Back to Contacts
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Engagements ({engagements.length})</h3>
        {engagements.length === 0 ? (
          <p className="text-gray-600">No engagements yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {engagements.map((engagement) => (
              <div key={engagement.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{engagement.title}</h4>
                  <p className="text-sm text-gray-600">Program: {engagement.program || '-'}</p>
                  <p className="text-sm text-gray-600">Status: <span className="font-medium">{engagement.status}</span></p>
                  <p className="text-sm text-gray-600">Stage: {engagement.current_stage}/7</p>
                  {engagement.budget && (
                    <p className="text-sm text-gray-600">Budget: ${(engagement.budget).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => navigate(`/admin/crm/engagements/${engagement.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    View
                  </Button>
                  <Button
                    onClick={() => handleDeleteEngagement(engagement.id)}
                    disabled={deletingEngagementId === engagement.id}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    {deletingEngagementId === engagement.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
