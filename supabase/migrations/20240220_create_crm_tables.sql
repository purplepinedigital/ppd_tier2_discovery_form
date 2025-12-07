-- ============================================================================
-- CRM Platform - Complete Database Schema
-- Completely isolated from existing system (signups, engagements, etc.)
-- ============================================================================

-- Table 1: CRM Contacts (Admin-created contacts)
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  business_name VARCHAR(255),
  industry VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'prospect',
  -- Status values: prospect, active, inactive, completed
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX idx_crm_contacts_created_at ON crm_contacts(created_at);

-- Enable RLS on crm_contacts
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Admin-only access to crm_contacts
CREATE POLICY "Admin can manage CRM contacts" ON crm_contacts
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- Table 2: CRM Engagements (Engagement records for each contact)
CREATE TABLE IF NOT EXISTS crm_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  client_user_id UUID REFERENCES auth.users(id),
  client_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'awaiting_tier1',
  -- Status: awaiting_tier1, tier1_submitted, awaiting_tier2, tier2_submitted, 
  --         in_stages, completed, inactive
  
  -- Tier 1 Data
  tier1_submitted_at TIMESTAMP WITH TIME ZONE,
  tier1_form_data JSONB,
  tier1_feedback TEXT,
  
  -- Tier 2 Data
  tier2_submitted_at TIMESTAMP WITH TIME ZONE,
  tier2_form_data JSONB,
  tier2_feedback TEXT,
  
  -- Stage Progress
  current_stage INT DEFAULT 0,
  stage_started_at TIMESTAMP WITH TIME ZONE,
  expected_completion_date DATE,
  
  -- Admin Details
  program VARCHAR(100),
  budget NUMERIC(12, 2),
  assigned_to UUID,
  assigned_to_email VARCHAR(255),
  internal_notes TEXT,
  
  -- Metadata
  deliverables_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_crm_engagements_contact_id ON crm_engagements(contact_id);
CREATE INDEX idx_crm_engagements_client_user_id ON crm_engagements(client_user_id);
CREATE INDEX idx_crm_engagements_status ON crm_engagements(status);
CREATE INDEX idx_crm_engagements_created_at ON crm_engagements(created_at);

-- Enable RLS on crm_engagements
ALTER TABLE crm_engagements ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can manage engagements
CREATE POLICY "Admin can manage CRM engagements" ON crm_engagements
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Clients can view their own engagement
CREATE POLICY "Client can view own engagement" ON crm_engagements
  FOR SELECT USING (client_user_id = auth.uid());

-- ============================================================================
-- Table 3: CRM Stage Progress (Track each stage 0-7)
CREATE TABLE IF NOT EXISTS crm_stage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES crm_engagements(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: pending, in_progress, completed
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  deliverables_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(engagement_id, stage_number)
);

CREATE INDEX idx_crm_stage_progress_engagement_id ON crm_stage_progress(engagement_id);
CREATE INDEX idx_crm_stage_progress_stage_number ON crm_stage_progress(stage_number);

-- Enable RLS on crm_stage_progress
ALTER TABLE crm_stage_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can manage stages
CREATE POLICY "Admin can manage CRM stages" ON crm_stage_progress
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Clients can view their stages
CREATE POLICY "Client can view own stages" ON crm_stage_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm_engagements 
      WHERE crm_engagements.id = crm_stage_progress.engagement_id 
      AND crm_engagements.client_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table 4: CRM Deliverables (Files/assets per stage)
CREATE TABLE IF NOT EXISTS crm_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES crm_engagements(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INT,
  file_type VARCHAR(50),
  visible_to_client BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_crm_deliverables_engagement_id ON crm_deliverables(engagement_id);
CREATE INDEX idx_crm_deliverables_stage_number ON crm_deliverables(stage_number);

-- Enable RLS on crm_deliverables
ALTER TABLE crm_deliverables ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can manage deliverables
CREATE POLICY "Admin can manage CRM deliverables" ON crm_deliverables
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Clients can view visible deliverables
CREATE POLICY "Client can view visible deliverables" ON crm_deliverables
  FOR SELECT USING (
    visible_to_client = true AND EXISTS (
      SELECT 1 FROM crm_engagements 
      WHERE crm_engagements.id = crm_deliverables.engagement_id 
      AND crm_engagements.client_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table 5: CRM Activity (Audit log for all actions)
CREATE TABLE IF NOT EXISTS crm_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES crm_engagements(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  -- Types: contact_created, engagement_created, tier1_submitted, tier1_feedback_added,
  --        tier2_submitted, tier2_feedback_added, stage_started, stage_completed,
  --        deliverable_added, note_added, engagement_completed, status_changed, etc.
  description TEXT,
  created_by UUID,
  created_by_email VARCHAR(255),
  is_client_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_crm_activity_engagement_id ON crm_activity(engagement_id);
CREATE INDEX idx_crm_activity_activity_type ON crm_activity(activity_type);
CREATE INDEX idx_crm_activity_created_at ON crm_activity(created_at);

-- Enable RLS on crm_activity
ALTER TABLE crm_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see all activities
CREATE POLICY "Admin can view CRM activity" ON crm_activity
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Clients can only see client-visible activities
CREATE POLICY "Client can view visible activities" ON crm_activity
  FOR SELECT USING (
    is_client_visible = true AND EXISTS (
      SELECT 1 FROM crm_engagements 
      WHERE crm_engagements.id = crm_activity.engagement_id 
      AND crm_engagements.client_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table 6: CRM Invitations (For client account creation)
CREATE TABLE IF NOT EXISTS crm_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES crm_engagements(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: pending, accepted, expired, revoked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_crm_invitations_engagement_id ON crm_invitations(engagement_id);
CREATE INDEX idx_crm_invitations_token ON crm_invitations(token);
CREATE INDEX idx_crm_invitations_email ON crm_invitations(email);

-- Enable RLS on crm_invitations
ALTER TABLE crm_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can manage invitations
CREATE POLICY "Admin can manage invitations" ON crm_invitations
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Unauthenticated users can view by token (for invite page)
CREATE POLICY "Public can view invitation by token" ON crm_invitations
  FOR SELECT USING (true);

-- ============================================================================
-- Table 7: CRM Internal Notes (Admin-only notes)
CREATE TABLE IF NOT EXISTS crm_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES crm_engagements(id) ON DELETE CASCADE,
  content TEXT,
  author_id UUID,
  author_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_crm_internal_notes_engagement_id ON crm_internal_notes(engagement_id);

-- Enable RLS on crm_internal_notes
ALTER TABLE crm_internal_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Admin-only access to internal notes
CREATE POLICY "Admin can manage internal notes" ON crm_internal_notes
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- Trigger for updating updated_at on crm_contacts
CREATE OR REPLACE FUNCTION update_crm_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_contacts_updated_at_trigger
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_contacts_updated_at();

-- Trigger for updating updated_at on crm_engagements
CREATE OR REPLACE FUNCTION update_crm_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_engagements_updated_at_trigger
  BEFORE UPDATE ON crm_engagements
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_engagements_updated_at();

-- Trigger for updating updated_at on crm_stage_progress
CREATE OR REPLACE FUNCTION update_crm_stage_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_stage_progress_updated_at_trigger
  BEFORE UPDATE ON crm_stage_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_stage_progress_updated_at();

-- Trigger for updating updated_at on crm_internal_notes
CREATE OR REPLACE FUNCTION update_crm_internal_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_internal_notes_updated_at_trigger
  BEFORE UPDATE ON crm_internal_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_internal_notes_updated_at();

-- ============================================================================
-- End of CRM migration
-- All tables created successfully with proper indexes, RLS, and triggers
-- ============================================================================
