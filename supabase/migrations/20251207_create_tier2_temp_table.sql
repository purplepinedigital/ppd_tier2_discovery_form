-- Create temporary tier2_temp table for Tier 2 discovery form responses
-- This is a temporary storage table without foreign key constraints
CREATE TABLE IF NOT EXISTS tier2_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  engagement_id UUID,
  responses TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_tier2_temp_user_id ON tier2_temp(user_id);
CREATE INDEX idx_tier2_temp_engagement_id ON tier2_temp(engagement_id);
CREATE INDEX idx_tier2_temp_created_at ON tier2_temp(created_at);

-- Enable RLS on tier2_temp
ALTER TABLE tier2_temp ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/insert their own data
CREATE POLICY "Users can manage their own tier2_temp data" ON tier2_temp
  FOR ALL USING (user_id = auth.uid());

-- Trigger for updating updated_at on tier2_temp
CREATE OR REPLACE FUNCTION update_tier2_temp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tier2_temp_updated_at_trigger
  BEFORE UPDATE ON tier2_temp
  FOR EACH ROW
  EXECUTE FUNCTION update_tier2_temp_updated_at();
