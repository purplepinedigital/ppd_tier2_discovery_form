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
  // First check if progress exists
  const { data: existingProgress } = await supabase
    .from("form_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("engagement_id", engagementId)
    .single();

  if (existingProgress) {
    // Update existing record
    const { error } = await supabase
      .from("form_progress")
      .update({
        responses,
        current_question_index: currentQuestionIndex,
        active_section_index: activeSectionIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("engagement_id", engagementId);

    if (error) {
      console.error("Error updating form progress:", error);
      throw error;
    }
  } else {
    // Insert new record
    const { error } = await supabase.from("form_progress").insert({
      user_id: userId,
      engagement_id: engagementId,
      responses,
      current_question_index: currentQuestionIndex,
      active_section_index: activeSectionIndex,
    });

    if (error) {
      console.error("Error inserting form progress:", error);
      throw error;
    }
  }
}

export async function loadFormProgress(
  userId: string,
  engagementId: string,
): Promise<FormProgress | null> {
  const { data, error } = await supabase
    .from("form_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("engagement_id", engagementId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error loading form progress:", error);
    throw error;
  }

  return data;
}
