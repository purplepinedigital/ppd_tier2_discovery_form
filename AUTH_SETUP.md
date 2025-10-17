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

## Step 4: Enable Email Confirmation (Email Verification)

Email verification requires new users to confirm their email address before they can log in.

### Enable Email Confirmation:

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Under **Email Confirmation**, toggle **Enable email confirmations**
3. You should see the toggle switch turn ON (blue)
4. Save the settings

### Configure Redirect URLs:

1. In the same Email section, look for **Redirect URLs** (or go to **Authentication** → **URL Configuration**)
2. Add your application URL(s):
   - For local development: `http://localhost:5173` (or your dev server port)
   - For production: `https://your-netlify-domain.netlify.app`
   - For staging: Any staging URLs you use
3. Save these settings

### How It Works:

- When a user signs up, Supabase automatically sends a verification email
- The verification email contains a link that redirects to your application
- Once the user clicks the link, their `email_confirmed_at` field is automatically set
- The application checks this field during login and won't allow access until email is verified
- Users see a "Verify Your Email" page while waiting to confirm their address

## Step 5: Configure Email Templates (Optional)

For password reset and confirmation emails, you can customize the email templates:

1. Go to **Authentication** → **Email Templates** in Supabase
2. Find the relevant template:
   - **"Confirm your email"** - Sent to new signups
   - **"Reset password"** - Sent when user requests password reset
3. Customize the subject and body as needed
4. The default templates already include the confirmation link

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
