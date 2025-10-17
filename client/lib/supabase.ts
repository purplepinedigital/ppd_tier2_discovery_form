import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getRedirectUrl(path: string = "/"): string {
  if (typeof window === "undefined") {
    return path;
  }

  // Use the current origin to ensure it works in all environments
  // (localhost, staging, production)
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
}

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
