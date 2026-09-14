import { createClient } from "@supabase/supabase-js";

export type ClientRow = {
  id: string;
  first_name: string;
  second_name: string;
  birth_date: string | null;
  height: number | null;
  current_weight: number | null;
  desired_weight: number | null;
  goal: string | null;
  created_at: string;
};

export type NewClientRow = Omit<ClientRow, "id" | "created_at">;

export type CalendarAssignmentRow = {
  id: string;
  client_id: string;
  scheduled_date: string;
  note: string | null;
  created_at: string;
};

export type NewCalendarAssignmentRow = Omit<
  CalendarAssignmentRow,
  "id" | "created_at"
>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
