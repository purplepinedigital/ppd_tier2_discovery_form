import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createEngagement, getContacts } from '@/lib/crm-admin';
import { getAdminId, isAdminAuthenticated } from '@/lib/admin-auth';
import { PROGRAMS } from '@/lib/crm-constants';

interface NewEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewEngagementModal({ isOpen, onClose, onSuccess }: NewEngagementModalProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [formData, setFormData] = useState({
    contact_id: '',
    title: '',
    program: '',
    budget: '',
    assigned_to: '',
    assigned_to_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const query = await getContacts();
      const { data } = await query;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.contact_id) {
        setError('Please select a contact');
        setLoading(false);
        return;
      }

      if (!isAdminAuthenticated()) {
        setError('You must be logged in as an admin to create an engagement');
        setLoading(false);
        return;
      }

      const adminId = getAdminId();
      const { error: createError } = await createEngagement(
        {
          contact_id: formData.contact_id,
          title: formData.title,
          program: formData.program || undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          assigned_to: formData.assigned_to || undefined,
          assigned_to_email: formData.assigned_to_email || undefined,
        },
        adminId
      );

      if (createError) {
        setError(createError.message);
      } else {
        setFormData({
          contact_id: '',
          title: '',
          program: '',
          budget: '',
          assigned_to: '',
          assigned_to_email: '',
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Engagement</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contact *
            </label>
            {loadingContacts ? (
              <div className="text-sm text-gray-500 py-2">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="text-sm text-red-600 py-2">
                No contacts found. Please create a contact first.
              </div>
            ) : (
              <select
                name="contact_id"
                value={formData.contact_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              >
                <option value="">Select a contact...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} ({contact.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Engagement Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Website Redesign"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Program
            </label>
            <input
              type="text"
              name="program"
              value={formData.program}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Standard Program"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Budget
            </label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="50000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Assigned To (Name)
              </label>
              <input
                type="text"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Assigned To (Email)
              </label>
              <input
                type="email"
                name="assigned_to_email"
                value={formData.assigned_to_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                placeholder="jane@company.com"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={loading || loadingContacts}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingContacts || contacts.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Creating...' : 'Create Engagement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
