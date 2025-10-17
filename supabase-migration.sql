-- Create the form_progress table to store user form responses
CREATE TABLE IF NOT EXISTS form_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  active_section_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE form_progress ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own progress
CREATE POLICY "Users can view own form progress"
  ON form_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own progress
CREATE POLICY "Users can insert own form progress"
  ON form_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own progress
CREATE POLICY "Users can update own form progress"
  ON form_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own progress
CREATE POLICY "Users can delete own form progress"
  ON form_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_form_progress_user_id ON form_progress(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before update
CREATE TRIGGER update_form_progress_updated_at
  BEFORE UPDATE ON form_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
