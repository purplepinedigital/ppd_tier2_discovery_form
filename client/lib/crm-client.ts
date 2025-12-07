import { supabase } from './supabase';

// ============================================================================
// Client Auth Functions
// ============================================================================

export async function acceptInvitationAndCreateAccount(token: string, password: string, firstName: string, lastName: string) {
  try {
    // First, get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('crm_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return { error: 'Invalid or expired invitation' };
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { error: 'Invitation has expired' };
    }

    // Call server endpoint to create account (bypasses confirmation email)
    try {
      const response = await fetch('/api/create-invitation-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email: invitation.email,
          password,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Failed to create account' };
      }

      const result = await response.json();

      // Now sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInError) {
        console.error('Sign-in error after account creation:', signInError);
        return { error: signInError.message || 'Failed to sign in - please try logging in manually' };
      }

      return {
        user: result,
        engagementId: result.engagementId,
      };
    } catch (error: any) {
      return { error: error.message || 'Failed to process invitation' };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getClientEngagement() {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    const { data: engagement, error } = await supabase
      .from('crm_engagements')
      .select('*')
      .eq('client_user_id', user.user.id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: engagement };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================================================
// Client Form Submission Functions
// ============================================================================

export interface Tier1FormData {
  [key: string]: string | string[];
}

export interface Tier2FormData {
  responses: (string | null)[];
}

export async function submitTier1Form(engagementId: string, formData: Tier1FormData) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    // Update engagement with Tier 1 data
    const { data, error } = await supabase
      .from('crm_engagements')
      .update({
        tier1_form_data: formData,
        tier1_submitted_at: new Date().toISOString(),
        status: 'tier1_submitted',
      })
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function submitTier2Form(engagementId: string, formData: Tier2FormData) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    // Update engagement with Tier 2 data
    const { data, error } = await supabase
      .from('crm_engagements')
      .update({
        tier2_form_data: formData,
        tier2_submitted_at: new Date().toISOString(),
        status: 'tier2_submitted',
      })
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================================================
// Client View Functions
// ============================================================================

export async function getClientEngagementData(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('crm_engagements')
      .select('*')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getClientDeliverables(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    // First verify the engagement belongs to this client
    const { data: engagement, error: engagementError } = await supabase
      .from('crm_engagements')
      .select('id')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (engagementError || !engagement) {
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('crm_deliverables')
      .select('*')
      .eq('engagement_id', engagementId)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getClientActivity(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    // First verify the engagement belongs to this client
    const { data: engagement, error: engagementError } = await supabase
      .from('crm_engagements')
      .select('id')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (engagementError || !engagement) {
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('crm_activity')
      .select('*')
      .eq('engagement_id', engagementId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getClientFeedback(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('crm_engagements')
      .select('tier1_feedback, tier2_feedback')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================================================
// Invitation Verification
// ============================================================================

export async function verifyInvitation(token: string) {
  try {
    const { data, error } = await supabase
      .from('crm_invitations')
      .select('engagement_id, email, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      return { error: 'Invalid invitation' };
    }

    // Check if invitation has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { error: 'Invitation has expired' };
    }

    // Fetch engagement details separately since RLS policies may restrict direct access
    const { data: engagement, error: engagementError } = await supabase
      .from('crm_engagements')
      .select('title')
      .eq('id', data.engagement_id)
      .single();

    if (engagementError || !engagement) {
      // Invitation exists but engagement doesn't - still allow user to proceed with email
      return {
        email: data.email,
        projectName: 'Your Project',
      };
    }

    return {
      email: data.email,
      projectName: engagement.title,
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================================================
// Stage Progress Viewing
// ============================================================================

export async function getClientStageProgress(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    // Verify engagement belongs to this client
    const { data: engagement, error: engagementError } = await supabase
      .from('crm_engagements')
      .select('id')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (engagementError || !engagement) {
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('crm_stage_progress')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('stage_number', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getCurrentStage(engagementId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('crm_engagements')
      .select('current_stage')
      .eq('id', engagementId)
      .eq('client_user_id', user.user.id)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { currentStage: data?.current_stage };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================================================
// Client Status Helper Functions
// ============================================================================

export function isAwaitingTier1(engagement: any): boolean {
  return engagement.status === 'awaiting_tier1' && !engagement.tier1_submitted_at;
}

export function isAwaitingTier2(engagement: any): boolean {
  return engagement.status === 'tier1_submitted' && !engagement.tier2_submitted_at;
}

export function hasCompletedTier2(engagement: any): boolean {
  return engagement.status !== 'awaiting_tier1' && engagement.tier2_submitted_at;
}

export function isInStages(engagement: any): boolean {
  return engagement.status === 'in_stages' || (engagement.tier2_submitted_at && !engagement.tier1_feedback);
}

export function getNextAction(engagement: any): string {
  if (isAwaitingTier1(engagement)) {
    return 'Complete Tier 1 Form';
  }
  if (isAwaitingTier2(engagement)) {
    return 'Complete Tier 2 Form';
  }
  if (hasCompletedTier2(engagement)) {
    return 'View Project Progress';
  }
  return 'View Project';
}
