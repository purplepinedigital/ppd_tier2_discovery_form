import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
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

export const supabase = {
  auth: { getSession: () => getSupabase().auth.getSession(), onAuthStateChange: (...args: any[]) => getSupabase().auth.onAuthStateChange(...args) },
  from: (table: string) => getSupabase().from(table),
} as any;

export interface FormProgress {
  id?: string;
  user_id: string;
  responses: string[];
  current_question_index: number;
  active_section_index: number;
  updated_at?: string;
}

export async function saveFormProgress(
  userId: string,
  responses: string[],
  currentQuestionIndex: number,
  activeSectionIndex: number,
): Promise<void> {
  const { error } = await supabase.from("form_progress").upsert(
    {
      user_id: userId,
      responses,
      current_question_index: currentQuestionIndex,
      active_section_index: activeSectionIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Error saving form progress:", error);
    throw error;
  }
}

export async function loadFormProgress(
  userId: string,
): Promise<FormProgress | null> {
  const { data, error } = await supabase
    .from("form_progress")
    .select("*")
    .eq("user_id", userId)
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
