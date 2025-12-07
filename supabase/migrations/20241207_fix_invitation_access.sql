-- Add RLS policy to allow unauthenticated users to read engagement data during invitation verification
-- This policy allows users with a pending invitation to view the engagement title
CREATE POLICY "Invited users can view engagement details" ON crm_engagements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm_invitations
      WHERE crm_invitations.engagement_id = crm_engagements.id
      AND crm_invitations.status = 'pending'
    )
  );
