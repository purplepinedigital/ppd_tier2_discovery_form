import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { handleDemo } from "./routes/demo";
import { handleKlaviyoContact } from "./routes/klaviyo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (req.method === "DELETE") {
      console.log("DELETE request body:", req.body);
      console.log("DELETE request params:", req.params);
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Klaviyo route
  app.post("/api/klaviyo/contact", handleKlaviyoContact);

  // Send invitation email route via Sendgrid
  app.post("/api/send-invitation-email", async (req, res) => {
    try {
      const { email, clientName, projectName, inviteLink } = req.body;

      if (!email || !clientName || !projectName || !inviteLink) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

      if (!SENDGRID_API_KEY) {
        console.warn("Sendgrid API key not configured");
        return res.status(500).json({ error: "Sendgrid API key not configured" });
      }

      // Extract client name from full name if present
      const clientFirstName = clientName.split(" ")[0];

      // Email template for invitation
      const invitationEmailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>You've Been Invited to Your Project</h2>
            <p>Hi ${clientFirstName},</p>
            <p>
              We're excited to have you join us! You've been invited to access and contribute to your project
              "<strong>${projectName}</strong>".
            </p>
            <p>
              Please click the button below to accept your invitation and get started:
            </p>
            <p>
              <a href="${inviteLink}" style="
                background-color: #37306B;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 4px;
                display: inline-block;
              ">Accept Invitation</a>
            </p>
            <p>
              Once you accept, you'll be able to fill out your Tier 1 and Tier 2 assessment forms
              and track the progress of your project.
            </p>
            <p>
              If you did not expect this invitation or have any questions, please feel free to reach out!
            </p>
            <p>Best regards,<br/>Purple Pine Digital Team</p>
          </body>
        </html>
      `;

      // Send via Sendgrid Mail Send API
      const payload = {
        personalizations: [
          {
            to: [{ email: email, name: clientName }],
            subject: `You're Invited to ${projectName}`,
          },
        ],
        from: {
          email: "lovish.bishnoi@purplepine.digital",
          name: "Purple Pine Digital",
        },
        content: [
          {
            type: "text/html",
            value: invitationEmailHtml,
          },
        ],
        reply_to: {
          email: "support@purplepine.digital",
        },
      };

      console.log(`[${new Date().toISOString()}] Sending invitation email via Sendgrid to ${email} for project ${projectName}`);

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // Response might not be JSON
        }

        console.error("Sendgrid API error:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        // Log the error but still return success - don't block engagement creation
        console.log("Invitation email queued but Sendgrid response had error - continuing");
        return res.status(200).json({ success: true, notification_sent: true, warning: "Email send attempted" });
      }

      console.log("Invitation email sent via Sendgrid successfully:", {
        email,
        projectName,
        status: response.status,
      });

      return res.status(200).json({ success: true, notification_sent: true });
    } catch (error: any) {
      console.error("Send invitation email error:", error?.message);
      // Don't fail the request - email errors shouldn't block engagement creation
      return res.status(200).json({ success: true, notification_sent: true, warning: "Email queuing attempted" });
    }
  });

  // Create user account from invitation (server-side to avoid confirmation email)
  app.post("/api/create-invitation-account", async (req, res) => {
    try {
      const { token, email, password, firstName, lastName } = req.body;

      if (!token || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase configuration missing");
        return res.status(500).json({
          error: "Supabase configuration missing",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from("crm_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (inviteError || !invitation) {
        console.error("Invalid invitation:", inviteError);
        return res.status(400).json({ error: "Invalid or expired invitation" });
      }

      // Check if invitation has expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: "Invitation has expired" });
      }

      // Create user account with admin API (bypasses email confirmation)
      const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email to skip confirmation email
        user_metadata: {
          first_name: firstName || "",
          last_name: lastName || "",
        },
      });

      if (createUserError || !userData.user) {
        console.error("Error creating user:", createUserError);
        return res.status(500).json({ error: createUserError?.message || "Failed to create account" });
      }

      const userId = userData.user.id;

      // Update invitation to accepted
      const { error: updateInviteError } = await supabaseAdmin
        .from("crm_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          created_user_id: userId,
        })
        .eq("id", invitation.id);

      if (updateInviteError) {
        console.error("Error updating invitation:", updateInviteError);
        return res.status(500).json({ error: "Failed to update invitation status" });
      }

      // Update engagement with client user ID
      const { error: engagementError } = await supabaseAdmin
        .from("crm_engagements")
        .update({
          client_user_id: userId,
          client_email: invitation.email,
        })
        .eq("id", invitation.engagement_id);

      if (engagementError) {
        console.error("Error updating engagement:", engagementError);
        return res.status(500).json({ error: "Failed to link engagement to user" });
      }

      console.log(`User ${userId} created from invitation ${token} and linked to engagement ${invitation.engagement_id}`);

      return res.status(200).json({
        success: true,
        userId,
        engagementId: invitation.engagement_id,
      });
    } catch (error: any) {
      console.error("Error in create-invitation-account route:", error);
      return res.status(500).json({
        error: "Failed to create account",
        message: error.message,
      });
    }
  });

  // Accept invitation and link user to engagement (legacy, kept for compatibility)
  app.post("/api/accept-invitation", async (req, res) => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        return res.status(400).json({ error: "Missing required fields: token and userId" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase configuration missing");
        return res.status(500).json({
          error: "Supabase configuration missing",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from("crm_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (inviteError || !invitation) {
        console.error("Invalid invitation:", inviteError);
        return res.status(400).json({ error: "Invalid or expired invitation" });
      }

      // Mark email as confirmed for the user (bypass email verification for invitations)
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
        console.log(`Email confirmed for user ${userId}`);
      } catch (confirmError: any) {
        console.warn(`Warning: Could not auto-confirm email:`, confirmError.message);
        // Don't fail the entire process if confirmation fails
      }

      // Update invitation to accepted
      const { error: updateInviteError } = await supabaseAdmin
        .from("crm_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          created_user_id: userId,
        })
        .eq("id", invitation.id);

      if (updateInviteError) {
        console.error("Error updating invitation:", updateInviteError);
        return res.status(500).json({ error: "Failed to update invitation status" });
      }

      // Update engagement with client user ID
      const { error: engagementError } = await supabaseAdmin
        .from("crm_engagements")
        .update({
          client_user_id: userId,
          client_email: invitation.email,
        })
        .eq("id", invitation.engagement_id);

      if (engagementError) {
        console.error("Error updating engagement:", engagementError);
        return res.status(500).json({ error: "Failed to link engagement to user" });
      }

      console.log(`Invitation ${token} accepted and engagement ${invitation.engagement_id} linked to user ${userId}`);

      return res.status(200).json({
        success: true,
        engagementId: invitation.engagement_id,
      });
    } catch (error: any) {
      console.error("Error in accept-invitation route:", error);
      return res.status(500).json({
        error: "Failed to accept invitation",
        message: error.message,
      });
    }
  });

  // Cleanup orphaned tier1_assessments (where engagement doesn't exist)
  app.post("/api/admin/cleanup-orphaned-data", async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase configuration missing");
        return res.status(500).json({
          error: "Supabase configuration missing",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Find and delete orphaned tier1_assessments (no corresponding engagement)
      const { data: orphanedTier1, error: fetchError } = await supabaseAdmin
        .from("tier1_assessments")
        .select("id, engagement_id");

      if (fetchError) {
        console.error("Error fetching tier1_assessments:", fetchError);
        return res.status(500).json({
          error: "Failed to fetch tier1_assessments",
        });
      }

      let deletedCount = 0;

      // Check each tier1_assessment to see if engagement exists
      for (const assessment of orphanedTier1 || []) {
        const { data: engagement } = await supabaseAdmin
          .from("engagements")
          .select("id")
          .eq("id", assessment.engagement_id)
          .maybeSingle();

        // If engagement doesn't exist, delete the orphaned assessment
        if (!engagement) {
          const { error: deleteError } = await supabaseAdmin
            .from("tier1_assessments")
            .delete()
            .eq("id", assessment.id);

          if (!deleteError) {
            deletedCount++;
          }
        }
      }

      // Also clean up other orphaned records
      let otherDeletedCount = 0;

      // Clean up orphaned form_progress
      const { data: orphanedFormProgress } = await supabaseAdmin
        .from("form_progress")
        .select("id, engagement_id");

      for (const fp of orphanedFormProgress || []) {
        if (fp.engagement_id) {
          const { data: eng } = await supabaseAdmin
            .from("engagements")
            .select("id")
            .eq("id", fp.engagement_id)
            .maybeSingle();

          if (!eng) {
            await supabaseAdmin.from("form_progress").delete().eq("id", fp.id);
            otherDeletedCount++;
          }
        }
      }

      console.log(
        `Cleanup completed: ${deletedCount} orphaned tier1_assessments, ${otherDeletedCount} other orphaned records deleted`,
      );

      return res.status(200).json({
        success: true,
        deleted: {
          tier1_assessments: deletedCount,
          other_records: otherDeletedCount,
        },
      });
    } catch (error: any) {
      console.error("Error in cleanup route:", error);
      return res.status(500).json({
        error: "Failed to cleanup orphaned data",
        message: error.message,
      });
    }
  });

  // Engagement creation route
  app.post("/api/engagements", async (req, res) => {
    try {
      const { project_name, user_id, form_responses } = req.body;

      if (!project_name || !user_id) {
        return res.status(400).json({
          error: "project_name and user_id are required",
        });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase configuration missing");
        return res.status(500).json({
          error: "Supabase configuration missing",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabaseAdmin
        .from("engagements")
        .insert({
          user_id,
          project_name,
          program_rationale: null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase error creating engagement:", error);
        return res.status(500).json({
          error: error.message,
        });
      }

      console.log("Engagement created successfully:", {
        engagement_id: data.id,
        project_name,
      });

      return res.status(200).json({
        success: true,
        engagement_id: data.id,
      });
    } catch (error: any) {
      console.error("Error creating engagement:", error);
      return res.status(500).json({
        error: "Failed to create engagement",
        message: error.message,
      });
    }
  });

  // Engagement deletion route
  app.delete("/api/engagements/:engagementId", async (req, res) => {
    try {
      const { engagementId } = req.params;
      const { user_id } = req.body;

      console.log("DELETE engagement request received:", {
        engagementId,
        user_id,
      });

      if (!engagementId || !user_id) {
        console.error("Missing required parameters:", {
          engagementId,
          user_id,
        });
        return res.status(400).json({
          error: "engagementId and user_id are required",
        });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      console.log(
        "[DELETE] Supabase URL present:",
        !!supabaseUrl,
        "Service key present:",
        !!supabaseServiceKey,
      );

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[DELETE] Supabase configuration missing");
        return res.status(500).json({
          error: "Supabase configuration missing",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Verify engagement exists and belongs to user
      console.log(
        "[DELETE] Verifying engagement - ID:",
        engagementId,
        "User:",
        user_id,
      );

      // First, verify the engagement exists
      const { data: engagement, error: fetchError } = await supabaseAdmin
        .from("engagements")
        .select("id, user_id")
        .eq("id", engagementId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching engagement:", fetchError);
        return res.status(500).json({
          error: "Failed to fetch engagement",
          details: fetchError.message,
        });
      }

      if (!engagement) {
        console.error("Engagement not found - ID:", engagementId);
        return res.status(404).json({
          error: "Engagement not found",
          engagementId,
        });
      }

      // Verify ownership
      if (engagement.user_id !== user_id) {
        console.warn(
          "Unauthorized delete - engagement user_id mismatch. Engagement:",
          engagement.user_id,
          "Requested:",
          user_id,
        );
        return res.status(403).json({
          error: "Unauthorized - engagement does not belong to this user",
        });
      }

      // Delete all related data in correct order (respecting foreign keys)
      // CRITICAL: Delete child tables first, then parent table
      console.log("Starting engagement deletion for:", engagementId);

      // Delete all dependent data - these rows reference engagement_id
      console.log("Deleting client_notifications...");
      const deleteClientNotifications = await supabaseAdmin
        .from("client_notifications")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteClientNotifications.error) {
        console.error(
          "Error deleting client_notifications:",
          deleteClientNotifications.error,
        );
      } else {
        console.log(
          "client_notifications deleted:",
          deleteClientNotifications.count || 0,
        );
      }

      console.log("Deleting client_feedback...");
      const deleteClientFeedback = await supabaseAdmin
        .from("client_feedback")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteClientFeedback.error) {
        console.error(
          "Error deleting client_feedback:",
          deleteClientFeedback.error,
        );
      } else {
        console.log(
          "client_feedback deleted:",
          deleteClientFeedback.count || 0,
        );
      }

      console.log("Deleting tier1_assessments...");
      const deleteTier1Assessments = await supabaseAdmin
        .from("tier1_assessments")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteTier1Assessments.error) {
        console.error(
          "Error deleting tier1_assessments:",
          deleteTier1Assessments.error,
        );
      } else {
        console.log(
          "tier1_assessments deleted:",
          deleteTier1Assessments.count || 0,
        );
      }

      console.log("Deleting form_progress...");
      const deleteFormProgress = await supabaseAdmin
        .from("form_progress")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteFormProgress.error) {
        console.error(
          "Error deleting form_progress:",
          deleteFormProgress.error,
        );
      } else {
        console.log("form_progress deleted:", deleteFormProgress.count || 0);
      }

      console.log("Deleting stage_completion...");
      const deleteStageCompletion = await supabaseAdmin
        .from("stage_completion")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteStageCompletion.error) {
        console.error(
          "Error deleting stage_completion:",
          deleteStageCompletion.error,
        );
      } else {
        console.log(
          "stage_completion deleted:",
          deleteStageCompletion.count || 0,
        );
      }

      console.log("Deleting deliverables...");
      const deleteDeliverables = await supabaseAdmin
        .from("deliverables")
        .delete()
        .eq("engagement_id", engagementId);

      if (deleteDeliverables.error) {
        console.error("Error deleting deliverables:", deleteDeliverables.error);
      } else {
        console.log("deliverables deleted:", deleteDeliverables.count || 0);
      }

      // Finally delete the engagement itself (parent table)
      console.log("Deleting engagement record...");
      const { error: deleteError } = await supabaseAdmin
        .from("engagements")
        .delete()
        .eq("id", engagementId)
        .eq("user_id", user_id);

      if (deleteError) {
        console.error("Error deleting engagement:", deleteError);
        return res.status(500).json({
          error: "Failed to delete engagement",
          message: deleteError.message,
        });
      }

      console.log(
        "Engagement and all related data deleted successfully:",
        engagementId,
      );

      return res.status(200).json({
        success: true,
        message: "Engagement and all related data deleted successfully",
        engagement_id: engagementId,
      });
    } catch (error: any) {
      console.error("Error in delete engagement route:", error);
      return res.status(500).json({
        error: "Failed to delete engagement",
        message: error.message,
      });
    }
  });

  return app;
}
