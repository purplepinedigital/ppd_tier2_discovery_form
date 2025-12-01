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
            await supabaseAdmin
              .from("form_progress")
              .delete()
              .eq("id", fp.id);
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
        console.error("Missing required parameters:", { engagementId, user_id });
        return res.status(400).json({
          error: "engagementId and user_id are required",
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

      // First verify the engagement exists
      console.log("Fetching engagement with ID:", engagementId);
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
        console.error(
          "Engagement not found with ID:",
          engagementId,
          "Attempting to fetch all engagements to debug..."
        );

        // Debug: Try to fetch without filter
        const { data: allEngagements, error: debugError } =
          await supabaseAdmin.from("engagements").select("id, user_id").limit(5);

        console.error("Debug - All engagements count:", allEngagements?.length);
        if (allEngagements?.length) {
          console.error(
            "Sample engagement ID:",
            allEngagements[0].id,
            "Type:",
            typeof allEngagements[0].id
          );
          console.error(
            "Looking for ID:",
            engagementId,
            "Type:",
            typeof engagementId
          );
        }

        return res.status(404).json({
          error: "Engagement not found",
          engagementId,
        });
      }

      if (engagement.user_id !== user_id) {
        console.warn(
          "Unauthorized delete attempt for engagement:",
          engagementId,
          "Expected user_id:",
          engagement.user_id,
          "Got:",
          user_id
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
          deleteClientNotifications.count || 0
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
        console.log("client_feedback deleted:", deleteClientFeedback.count || 0);
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
          deleteTier1Assessments.count || 0
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
        console.log("stage_completion deleted:", deleteStageCompletion.count || 0);
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
