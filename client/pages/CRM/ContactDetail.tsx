import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getContact } from '@/lib/crm-admin';
import { Button } from '@/components/ui/button';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContact = async () => {
      if (!id) return;
      const { data } = await getContact(id);
      setContact(data);
      setLoading(false);
    };
    fetchContact();
  }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!contact) return <div className="text-center py-8">Contact not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/crm/contacts')} className="text-gray-600 hover:text-gray-900">
          ← Back
        </button>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          {contact.first_name} {contact.last_name}
        </h2>
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
              <p className="text-gray-600">{contact.business_name}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Industry</label>
              <p className="text-gray-600">{contact.industry}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Status</label>
              <p className="text-gray-600">{contact.status}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Engagements</h3>
          <p className="text-gray-600">View all engagements for this contact</p>
          <Button className="mt-4 w-full">View Engagements</Button>
        </div>
      </div>
    </div>
  );
}
