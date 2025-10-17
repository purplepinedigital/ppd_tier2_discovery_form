-- Create signups table to store user contact info
CREATE TABLE IF NOT EXISTS signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  klaviyo_contact_id VARCHAR(255),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);
CREATE INDEX IF NOT EXISTS idx_signups_user_id ON signups(user_id);

-- Create admin_credentials table for single admin login
CREATE TABLE IF NOT EXISTS admin_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Note: Run this separately to insert the admin credentials:
-- INSERT INTO admin_credentials (email, password_hash) 
-- VALUES ('lovish.bishnoi@purplepine.digital', crypt('rGaneshaL123#', gen_salt('bf')));
-- Make sure pgcrypto extension is enabled in Supabase before running the INSERT statement.

-- Enable Row Level Security (RLS) on signups - disabled for now since we'll authenticate differently for admin
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage signups (for Klaviyo integration)
CREATE POLICY "Service role can manage signups"
  ON signups
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
