# Authentication Setup Guide

This application uses **Supabase** for authentication and database management. Follow these steps to set up authentication:

## Step 1: Connect to Supabase

1. Click **[Connect to Supabase](#open-mcp-popover)** in the Builder.io interface
2. Follow the prompts to connect your Supabase account
3. Select or create a project for this application

## Step 2: Set Environment Variables

After connecting Supabase, you'll need to set the following environment variables:

```bash
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project:
- Go to **Project Settings** → **API**
- Copy the **Project URL** (for `VITE_SUPABASE_URL`)
- Copy the **anon/public key** (for `VITE_SUPABASE_ANON_KEY`)

### Setting Environment Variables

You can set environment variables in two ways:

1. **Using DevServerControl tool** (Recommended - keeps secrets secure):
   - The AI assistant can set these for you using the DevServerControl tool
   
2. **Using .env file**:
   - Create a `.env` file in the project root
   - Copy the contents from `.env.example`
   - Replace the placeholder values with your actual Supabase credentials

## Step 3: Run Database Migration

Apply the database migration to create the `form_progress` table:

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-migration.sql`
3. Paste and run the SQL in the editor

Alternatively, if you've connected Supabase MCP, the AI can run the migration for you.

## Step 4: Configure Email Templates (Optional)

For password reset emails, you can customize the email template:

1. Go to **Authentication** → **Email Templates** in Supabase
2. Find the "Reset Password" template
3. Customize the subject and body as needed

## Authentication Features

The application includes:
- ✅ User signup with email/password
- ✅ User login
- ✅ Password reset flow
- ✅ Automatic form progress saving
- ✅ Session persistence
- ✅ Secure Row Level Security (RLS) policies

## How It Works

1. **Signup Flow**: Users create an account before starting the form
2. **Auto-Save**: Form responses are automatically saved to the database every second
3. **Resume Anytime**: Users can close the browser and resume where they left off
4. **Secure**: Each user can only access their own form progress
5. **Password Reset**: Users can reset forgotten passwords via email

## Testing

To test the authentication flow:

1. Start the dev server: `npm run dev`
2. Click "Get Started" on the hero page
3. Click "Begin your story" on the intro page
4. You'll be directed to the signup page
5. Create an account and complete the form
6. Close and reopen the browser - your progress will be saved!

## Troubleshooting

**Error: "Invalid Supabase URL or anon key"**
- Check that your environment variables are set correctly
- Restart the dev server after setting environment variables

**Error: "relation 'form_progress' does not exist"**
- Run the database migration from `supabase-migration.sql`

**Password reset email not received**
- Check your spam folder
- Verify email templates are enabled in Supabase
- Check Supabase logs for email delivery errors
