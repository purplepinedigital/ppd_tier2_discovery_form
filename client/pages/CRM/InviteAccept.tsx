import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { acceptInvitationAndCreateAccount, verifyInvitation } from '@/lib/crm-client';
import { useEffect } from 'react';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      const result = await verifyInvitation(token);
      if (result.error) {
        setError(result.error);
      } else {
        setInvitationInfo(result);
      }
      setLoading(false);
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!token) {
      setError('Invalid invitation token');
      setSubmitting(false);
      return;
    }

    const result = await acceptInvitationAndCreateAccount(token, password, firstName, lastName);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      // Success - redirect to client dashboard
      navigate('/crm/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE]">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFAEE] py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Welcome!
          </h2>
          <p className="text-gray-600 mt-2">Create your account to get started</p>
        </div>

        {invitationInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-blue-900">Project: {invitationInfo.projectName}</p>
            <p className="text-sm text-blue-700 mt-1">Email: {invitationInfo.email}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="John"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email (read-only)</label>
            <input
              type="email"
              value={invitationInfo?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="••••••••"
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
