import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

const getSupabaseInstance = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase URL and anonymous key are required. Please check your environment variables.",
      );
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop: string | symbol) {
    return (getSupabaseInstance() as any)[prop];
  },
}) as SupabaseClient;

export interface FormProgress {
  id?: string;
  user_id: string;
  engagement_id: string;
  responses: string[];
  current_question_index: number;
  active_section_index: number;
  updated_at?: string;
}

export async function saveFormProgress(
  userId: string,
  engagementId: string,
  responses: string[],
  currentQuestionIndex: number,
  activeSectionIndex: number,
): Promise<void> {
  try {
    // First check if progress exists
    let existingProgress;
    try {
      const result = await supabase
        .from("form_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("engagement_id", engagementId)
        .maybeSingle();

      if (result.error && result.error.code !== "PGRST116") {
        console.error("Error checking form progress:", {
          code: result.error.code,
          message: result.error.message,
          status: result.error.status,
          hint: result.error.hint,
          details: result.error.details,
        });
      }
      existingProgress = result.data;
    } catch (fetchErr: any) {
      console.error("Network error checking form progress:", {
        message: fetchErr?.message,
        name: fetchErr?.name,
      });
      // Don't re-throw to prevent blocking the form
      return;
    }

    if (existingProgress) {
      // Update existing record
      try {
        const result = await supabase
          .from("form_progress")
          .update({
            responses,
            current_question_index: currentQuestionIndex,
            active_section_index: activeSectionIndex,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("engagement_id", engagementId);

        if (result.error) {
          console.error("Error updating form progress:", {
            code: result.error.code,
            message: result.error.message,
            status: result.error.status,
            hint: result.error.hint,
            details: result.error.details,
          });
        }
      } catch (fetchErr: any) {
        console.error("Network error updating form progress:", {
          message: fetchErr?.message,
          name: fetchErr?.name,
        });
      }
    } else {
      // Insert new record
      try {
        const result = await supabase
          .from("form_progress")
          .insert({
            user_id: userId,
            engagement_id: engagementId,
            responses,
            current_question_index: currentQuestionIndex,
            active_section_index: activeSectionIndex,
          });

        if (result.error) {
          console.error("Error inserting form progress:", {
            code: result.error.code,
            message: result.error.message,
            status: result.error.status,
            hint: result.error.hint,
            details: result.error.details,
          });
        }
      } catch (fetchErr: any) {
        console.error("Network error inserting form progress:", {
          message: fetchErr?.message,
          name: fetchErr?.name,
        });
      }
    }
  } catch (err: any) {
    const errorDetails = {
      message: err?.message || "Unknown error",
      code: err?.code,
      status: err?.status,
      hint: err?.hint,
      details: err?.details,
    };
    console.error("Exception saving form progress:", errorDetails);
    console.debug("Full error:", err);
    // Don't re-throw to prevent blocking the form
  }
}

export async function loadFormProgress(
  userId: string,
  engagementId: string,
): Promise<FormProgress | null> {
  try {
    const { data, error } = await supabase
      .from("form_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("engagement_id", engagementId)
      .maybeSingle();

    if (error) {
      console.error("Error loading form progress:", {
        code: error.code,
        message: error.message,
        status: error.status,
        hint: error.hint,
        details: error.details,
      });
      // Return null for "not found" errors, throw others
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data || null;
  } catch (err: any) {
    const errorDetails = {
      message: err?.message || "Unknown error",
      code: err?.code,
      status: err?.status,
      hint: err?.hint,
      details: err?.details,
    };
    console.error("Exception loading form progress:", errorDetails);
    console.debug("Full error:", err);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
}
