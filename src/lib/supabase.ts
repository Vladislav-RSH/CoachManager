import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "./userRoles";

export type ProfileRow = {
  id: string;
  full_name: string;
  role: UserRole | string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type NewProfileRow = Omit<ProfileRow, "created_at" | "updated_at">;

export type ClientRow = {
  id: string;
  trainer_id: string | null;
  client_user_id: string | null;
  first_name: string;
  second_name: string;
  birth_date: string | null;
  height: number | null;
  current_weight: number | null;
  desired_weight: number | null;
  goal: string | null;
  created_at: string;
};

export type NewClientRow = Omit<
  ClientRow,
  "id" | "created_at" | "trainer_id" | "client_user_id"
> & {
  trainer_id?: string;
  client_user_id?: string | null;
};

export type ClientInvitationRow = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  token: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type NewClientInvitationRow = Omit<
  ClientInvitationRow,
  "id" | "token" | "accepted_by" | "accepted_at" | "created_at"
> & {
  token?: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
};

export type ClientMeasurementRow = {
  id: string;
  client_id: string;
  measured_at: string;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  body_fat_percent: number | null;
  notes: string | null;
  created_at: string;
};

export type NewClientMeasurementRow = Omit<
  ClientMeasurementRow,
  "id" | "created_at"
>;

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

export type WorkoutProgramRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type NewWorkoutProgramRow = Omit<WorkoutProgramRow, "id" | "created_at">;

export type WorkoutTrainingDayRow = {
  id: string;
  program_id: string;
  training_date: string;
  title: string;
  content: string;
  created_at: string;
};

export type NewWorkoutTrainingDayRow = Omit<
  WorkoutTrainingDayRow,
  "id" | "created_at"
>;

export type WorkoutExerciseIntensity = "low" | "medium" | "high";

export type WorkoutTrainingExerciseRow = {
  id: string;
  training_day_id: string;
  exercise_name: string;
  order_index: number;
  notes: string | null;
  created_at: string;
};

export type NewWorkoutTrainingExerciseRow = Omit<
  WorkoutTrainingExerciseRow,
  "id" | "created_at"
>;

export type WorkoutExerciseSetRow = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  repetitions: number;
  intensity: WorkoutExerciseIntensity;
  notes: string | null;
  created_at: string;
};

export type NewWorkoutExerciseSetRow = Omit<
  WorkoutExerciseSetRow,
  "id" | "created_at"
>;

export type NutritionProgramStatus = "draft" | "active" | "archived";

export type NutritionProgramRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_fat_g: number | null;
  target_carbs_g: number | null;
  status: NutritionProgramStatus;
  created_at: string;
  updated_at: string;
};

export type NewNutritionProgramRow = Omit<
  NutritionProgramRow,
  "id" | "created_at" | "updated_at"
>;

export type NutritionMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack";

export type NutritionMealRow = {
  id: string;
  nutrition_program_id: string;
  meal_type: NutritionMealType;
  name: string;
  meal_time: string | null;
  order_index: number;
  notes: string | null;
  created_at: string;
};

export type NewNutritionMealRow = Omit<
  NutritionMealRow,
  "id" | "created_at"
>;

export type NutritionMealItemRow = {
  id: string;
  meal_id: string;
  food_name: string;
  amount_g: number;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  order_index: number;
  created_at: string;
};

export type NewNutritionMealItemRow = Omit<
  NutritionMealItemRow,
  "id" | "created_at"
>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
