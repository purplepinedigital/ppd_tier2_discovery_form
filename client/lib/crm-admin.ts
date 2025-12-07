import { supabase, getAdminSupabase } from './supabase';

// ============================================================================
// Contact Management Functions
// ============================================================================

export interface ContactData {
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  industry?: string;
  phone?: string;
  status?: 'prospect' | 'active' | 'inactive' | 'completed';
}

export async function createContact(data: ContactData, userId: string) {
  const client = getAdminSupabase();
  return client.from('crm_contacts').insert({
    ...data,
    created_by: userId,
  });
}

export async function updateContact(id: string, data: Partial<ContactData>) {
  const client = getAdminSupabase();
  return client.from('crm_contacts').update(data).eq('id', id);
}

export async function deleteContact(id: string) {
  const client = getAdminSupabase();
  return client.from('crm_contacts').delete().eq('id', id);
}

export async function getContact(id: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_contacts')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export interface ContactFilters {
  status?: string;
  search?: string;
}

export async function getContacts(filters?: ContactFilters) {
  const client = getAdminSupabase();
  let query = client.from('crm_contacts').select('*');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`
    );
  }

  query = query.order('created_at', { ascending: false });
  return query;
}

// ============================================================================
// Engagement Management Functions
// ============================================================================

export interface EngagementData {
  contact_id: string;
  title: string;
  program?: string;
  budget?: number;
  assigned_to?: string;
  assigned_to_email?: string;
  status?: string;
}

export async function createEngagement(data: EngagementData, userId: string) {
  const client = getAdminSupabase();
  const { data: result, error } = await client.from('crm_engagements').insert({
    ...data,
    status: 'awaiting_tier1',
    created_by: userId,
    current_stage: 0,
  }).select().single();

  if (!error && result) {
    // Create stage progress records for all 8 stages (0-7)
    const stageRecords = [];
    for (let i = 0; i < 8; i++) {
      stageRecords.push({
        engagement_id: result.id,
        stage_number: i,
        status: 'pending',
      });
    }
    await client.from('crm_stage_progress').insert(stageRecords);

    // Get contact email for invitation
    const { data: contact } = await getContact(data.contact_id);
    if (contact?.email) {
      // Generate invitation
      const invitationResult = await generateInvitation(result.id, contact.email, userId);

      // Send invitation email
      if (!invitationResult.error && invitationResult.data?.token) {
        const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/crm/invite/${invitationResult.data.token}`;
        await sendInvitationEmailNotification(contact.email, contact.first_name || 'Client', data.title, inviteLink);
      }
    }

    // Log activity
    await logActivity('engagement_created', result.id, `Engagement "${data.title}" created`, userId);
  }

  return { data: result, error };
}

async function sendInvitationEmailNotification(email: string, clientName: string, projectName: string, inviteLink: string) {
  try {
    const response = await fetch('/api/send-invitation-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        clientName,
        projectName,
        inviteLink,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send invitation email:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending invitation email:', error);
  }
}

export async function updateEngagement(id: string, data: Partial<EngagementData>) {
  const client = getAdminSupabase();
  return client.from('crm_engagements').update(data).eq('id', id);
}

export async function deleteEngagement(id: string) {
  const client = getAdminSupabase();
  return client.from('crm_engagements').delete().eq('id', id);
}

export async function getEngagement(id: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_engagements')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export interface EngagementFilters {
  status?: string;
  contact_id?: string;
  search?: string;
}

export async function getEngagements(filters?: EngagementFilters) {
  const client = getAdminSupabase();
  let query = client.from('crm_engagements').select('*');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.contact_id) {
    query = query.eq('contact_id', filters.contact_id);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,client_email.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });
  return query;
}

export async function updateEngagementStatus(id: string, status: string, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_engagements')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await logActivity('status_changed', id, `Status changed to ${status}`, userId);
  }

  return { data, error };
}

export async function updateEngagementStage(id: string, stageNumber: number, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_engagements')
    .update({ current_stage: stageNumber, stage_started_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await logActivity(
      'stage_started',
      id,
      `Stage ${stageNumber} started`,
      userId
    );
  }

  return { data, error };
}

// ============================================================================
// Tier 1 Feedback Functions
// ============================================================================

export async function submitTier1Feedback(engagementId: string, feedback: string, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_engagements')
    .update({ tier1_feedback: feedback })
    .eq('id', engagementId)
    .select()
    .single();

  if (!error && data) {
    await logActivity('tier1_feedback_added', engagementId, 'Tier 1 feedback added', userId, true);
  }

  return { data, error };
}

// ============================================================================
// Tier 2 Feedback Functions
// ============================================================================

export async function submitTier2Feedback(engagementId: string, feedback: string, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_engagements')
    .update({ tier2_feedback: feedback })
    .eq('id', engagementId)
    .select()
    .single();

  if (!error && data) {
    await logActivity('tier2_feedback_added', engagementId, 'Tier 2 feedback added', userId, true);
  }

  return { data, error };
}

// ============================================================================
// Stage Progress Functions
// ============================================================================

export async function getStageProgress(engagementId: string, stageNumber?: number) {
  const client = getAdminSupabase();
  let query = client
    .from('crm_stage_progress')
    .select('*')
    .eq('engagement_id', engagementId);

  if (stageNumber !== undefined) {
    query = query.eq('stage_number', stageNumber);
  }

  return query;
}

export async function updateStageProgress(
  engagementId: string,
  stageNumber: number,
  status: string,
  notes: string,
  userId: string
) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_stage_progress')
    .update({
      status,
      notes,
      ...(status === 'in_progress' && { started_at: new Date().toISOString() }),
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
    })
    .eq('engagement_id', engagementId)
    .eq('stage_number', stageNumber)
    .select()
    .single();

  if (!error && data) {
    await logActivity(
      `stage_${status}`,
      engagementId,
      `Stage ${stageNumber} ${status}`,
      userId,
      true
    );
  }

  return { data, error };
}

export async function completeStage(
  engagementId: string,
  stageNumber: number,
  userId: string
) {
  return updateStageProgress(engagementId, stageNumber, 'completed', '', userId);
}

// ============================================================================
// Deliverables Functions
// ============================================================================

export interface DeliverableData {
  engagement_id: string;
  stage_number: number;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  visible_to_client?: boolean;
}

export async function uploadDeliverable(data: DeliverableData, userId: string) {
  const client = getAdminSupabase();
  const { data: result, error } = await client.from('crm_deliverables').insert({
    ...data,
    visible_to_client: data.visible_to_client ?? true,
    created_by: userId,
  }).select().single();

  if (!error && result) {
    await logActivity(
      'deliverable_added',
      data.engagement_id,
      `Deliverable "${data.title}" added to stage ${data.stage_number}`,
      userId,
      true
    );

    // Update deliverables count
    const { data: engagement } = await getEngagement(data.engagement_id);
    if (engagement) {
      const delivCount = await getDeliverablesCount(data.engagement_id);
      await client
        .from('crm_engagements')
        .update({ deliverables_count: delivCount })
        .eq('id', data.engagement_id);
    }
  }

  return { data: result, error };
}

export async function deleteDeliverable(id: string, userId: string) {
  const client = getAdminSupabase();
  const { data: deliverable } = await client
    .from('crm_deliverables')
    .select('engagement_id')
    .eq('id', id)
    .single();

  const { error } = await client.from('crm_deliverables').delete().eq('id', id);

  if (!error && deliverable) {
    await logActivity(
      'deliverable_removed',
      deliverable.engagement_id,
      'Deliverable removed',
      userId
    );
  }

  return { error };
}

export async function getDeliverables(engagementId: string, stageNumber?: number) {
  const client = getAdminSupabase();
  let query = client
    .from('crm_deliverables')
    .select('*')
    .eq('engagement_id', engagementId);

  if (stageNumber !== undefined) {
    query = query.eq('stage_number', stageNumber);
  }

  return query.order('created_at', { ascending: false });
}

export async function getDeliverablesCount(engagementId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_deliverables')
    .select('*', { count: 'exact', head: true })
    .eq('engagement_id', engagementId);

  return error ? 0 : (data?.length ?? 0);
}

// ============================================================================
// Internal Notes Functions
// ============================================================================

export async function addInternalNote(engagementId: string, content: string, userId: string, userEmail: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_internal_notes')
    .insert({
      engagement_id: engagementId,
      content,
      author_id: userId,
      author_email: userEmail,
    })
    .select()
    .single();

  if (!error && data) {
    await logActivity('note_added', engagementId, 'Internal note added', userId, false);
  }

  return { data, error };
}

export async function updateInternalNote(id: string, content: string) {
  const client = getAdminSupabase();
  return client.from('crm_internal_notes').update({ content }).eq('id', id);
}

export async function deleteInternalNote(id: string) {
  const client = getAdminSupabase();
  return client.from('crm_internal_notes').delete().eq('id', id);
}

export async function getInternalNotes(engagementId?: string) {
  const client = getAdminSupabase();
  let query = client.from('crm_internal_notes').select('*');

  if (engagementId) {
    query = query.eq('engagement_id', engagementId);
  }

  return query.order('created_at', { ascending: false });
}

// ============================================================================
// Invitation Functions
// ============================================================================

export async function generateInvitation(engagementId: string, email: string, userId: string) {
  const client = getAdminSupabase();
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiration

  const { data, error } = await client
    .from('crm_invitations')
    .insert({
      engagement_id: engagementId,
      email,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (!error && data) {
    await logActivity('invitation_sent', engagementId, `Invitation sent to ${email}`, userId);
  }

  return { data, error };
}

export async function getInvitationLink(token: string): Promise<string> {
  return `${window.location.origin}/crm/invite/${token}`;
}

export async function getEngagementInvitation(engagementId: string) {
  const client = getAdminSupabase();
  return client
    .from('crm_invitations')
    .select('*')
    .eq('engagement_id', engagementId)
    .eq('status', 'pending')
    .single();
}

export async function revokeInvitation(id: string, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_invitations')
    .update({ status: 'revoked' })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await logActivity('invitation_revoked', data.engagement_id, 'Invitation revoked', userId);
  }

  return { data, error };
}

export async function acceptInvitation(token: string, userId: string) {
  const client = getAdminSupabase();
  const { data, error } = await client
    .from('crm_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), created_user_id: userId })
    .eq('token', token)
    .eq('status', 'pending')
    .select()
    .single();

  if (!error && data) {
    // Update engagement with client user ID
    await client.from('crm_engagements').update({ client_user_id: userId }).eq('id', data.engagement_id);

    await logActivity('client_account_created', data.engagement_id, 'Client account created from invitation', userId, true);
  }

  return { data, error };
}

// ============================================================================
// Activity Logging Functions
// ============================================================================

export interface ActivityData {
  engagement_id: string;
  activity_type: string;
  description: string;
  created_by: string;
  created_by_email?: string;
  is_client_visible?: boolean;
}

export async function logActivity(
  activityType: string,
  engagementId: string,
  description: string,
  userId: string,
  isClientVisible: boolean = false,
  userEmail: string = ''
) {
  const client = getAdminSupabase();
  return client.from('crm_activity').insert({
    engagement_id: engagementId,
    activity_type: activityType,
    description,
    created_by: userId,
    created_by_email: userEmail,
    is_client_visible: isClientVisible,
  });
}

export async function getActivity(engagementId?: string, filters?: any) {
  const client = getAdminSupabase();
  let query = client.from('crm_activity').select('*');

  if (engagementId) {
    query = query.eq('engagement_id', engagementId);
  }

  if (filters?.activityType) {
    query = query.eq('activity_type', filters.activityType);
  }

  return query.order('created_at', { ascending: false });
}

export async function getEngagementActivity(engagementId: string) {
  return getActivity(engagementId);
}

// ============================================================================
// Dashboard Stats Functions
// ============================================================================

export async function getDashboardStats() {
  const client = getAdminSupabase();

  const [contactsResult, engagementsResult, tier1PendingResult, tier2PendingResult] = await Promise.all([
    client.from('crm_contacts').select('*', { count: 'exact', head: true }),
    client.from('crm_engagements').select('*', { count: 'exact', head: true }),
    client
      .from('crm_engagements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'awaiting_tier1'),
    client
      .from('crm_engagements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'awaiting_tier2'),
  ]);

  return {
    totalContacts: contactsResult.count ?? 0,
    totalEngagements: engagementsResult.count ?? 0,
    pendingTier1: tier1PendingResult.count ?? 0,
    pendingTier2: tier2PendingResult.count ?? 0,
  };
}

export async function getRecentActivity(limit: number = 10) {
  const client = getAdminSupabase();
  return client
    .from('crm_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}
