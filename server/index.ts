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

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Klaviyo route
  app.post("/api/klaviyo/contact", handleKlaviyoContact);

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

      if (!engagementId || !user_id) {
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

      // First verify the engagement belongs to the user
      const { data: engagement, error: fetchError } = await supabaseAdmin
        .from("engagements")
        .select("user_id")
        .eq("id", engagementId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching engagement:", fetchError);
        return res.status(500).json({
          error: "Failed to fetch engagement",
        });
      }

      if (!engagement) {
        return res.status(404).json({
          error: "Engagement not found",
        });
      }

      if (engagement.user_id !== user_id) {
        console.warn(
          "Unauthorized delete attempt for engagement:",
          engagementId,
        );
        return res.status(403).json({
          error: "Unauthorized - engagement does not belong to this user",
        });
      }

      // Delete all related data in correct order (respecting foreign keys)
      console.log("Starting engagement deletion for:", engagementId);

      const deleteFormProgress = await supabaseAdmin
        .from("form_progress")
        .delete()
        .eq("engagement_id", engagementId);

      const deleteStageCompletion = await supabaseAdmin
        .from("stage_completion")
        .delete()
        .eq("engagement_id", engagementId);

      const deleteDeliverables = await supabaseAdmin
        .from("deliverables")
        .delete()
        .eq("engagement_id", engagementId);

      // Finally delete the engagement
      const { error: deleteError } = await supabaseAdmin
        .from("engagements")
        .delete()
        .eq("id", engagementId);

      if (deleteError) {
        console.error("Error deleting engagement:", deleteError);
        return res.status(500).json({
          error: "Failed to delete engagement",
          message: deleteError.message,
        });
      }

      console.log("Engagement deleted successfully:", engagementId);

      return res.status(200).json({
        success: true,
        message: "Engagement deleted successfully",
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
