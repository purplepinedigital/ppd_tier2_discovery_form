-- Create temporary tier1_temp table for Tier 1 assessment data
-- This is a temporary storage table without foreign key constraints
CREATE TABLE IF NOT EXISTS tier1_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  engagement_id UUID,
  project_name VARCHAR(255),
  business_name VARCHAR(255),
  industry VARCHAR(100),
  current_state VARCHAR(100),
  needs_array TEXT[],
  website_scope VARCHAR(100),
  marketing_timing VARCHAR(100),
  budget_range VARCHAR(100),
  timeline_expectation VARCHAR(100),
  target_date DATE,
  primary_goal TEXT,
  recommended_package VARCHAR(50),
  recommendation_confidence VARCHAR(20),
  budget_aligned BOOLEAN,
  has_mismatch BOOLEAN,
  mismatch_type VARCHAR(100),
  mismatch_resolved BOOLEAN,
  reasoning JSONB,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_tier1_temp_user_id ON tier1_temp(user_id);
CREATE INDEX idx_tier1_temp_engagement_id ON tier1_temp(engagement_id);
CREATE INDEX idx_tier1_temp_created_at ON tier1_temp(created_at);

-- Enable RLS on tier1_temp
ALTER TABLE tier1_temp ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/insert their own data
CREATE POLICY "Users can manage their own tier1_temp data" ON tier1_temp
  FOR ALL USING (user_id = auth.uid());

-- Trigger for updating updated_at on tier1_temp
CREATE OR REPLACE FUNCTION update_tier1_temp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tier1_temp_updated_at_trigger
  BEFORE UPDATE ON tier1_temp
  FOR EACH ROW
  EXECUTE FUNCTION update_tier1_temp_updated_at();
