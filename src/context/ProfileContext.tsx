/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  isSupabaseConfigured,
  supabase,
  type NewProfileRow,
  type ProfileRow,
} from "../lib/supabase";
import {
  defaultUserRole,
  normalizeUserRole,
  type UserRole,
} from "../lib/userRoles";

export type CoachProfile = {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
};

type ProfileContextValue = {
  profile: CoachProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  updateProfile: (values: {
    fullName: string;
    phone: string;
  }) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

type ProfileProviderProps = {
  children: ReactNode;
};

const mapProfileRow = (row: ProfileRow): CoachProfile => ({
  id: row.id,
  fullName: row.full_name,
  role: normalizeUserRole(row.role),
  phone: row.phone ?? "",
  bio: row.bio ?? "",
  avatarUrl: row.avatar_url ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createFallbackProfile = (
  userId: string,
  metadata: Record<string, unknown>,
): CoachProfile => {
  const now = new Date().toISOString();
  const metadataName =
    typeof metadata.full_name === "string" ? metadata.full_name : "";
  const metadataRole = normalizeUserRole(metadata.role);

  return {
    id: userId,
    fullName: metadataName,
    role: metadataRole,
    phone: "",
    bio: "",
    avatarUrl: "",
    createdAt: now,
    updatedAt: now,
  };
};

export function ProfileProvider({ children }: ProfileProviderProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const fallbackProfile = createFallbackProfile(
      user.id,
      user.user_metadata ?? {},
    );
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setProfile(fallbackProfile);
      setIsLoading(false);
      setErrorMessage("Добавьте переменные Supabase в .env.local.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setProfile(fallbackProfile);
      setErrorMessage(
        "Профиль еще не синхронизирован. Примените миграцию профилей в Supabase.",
      );
    } else {
      setProfile(data ? mapProfileRow(data as ProfileRow) : fallbackProfile);
      setErrorMessage(null);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (values: {
      fullName: string;
      phone: string;
    }) => {
      const supabaseClient = supabase;

      if (!user || !isSupabaseConfigured || !supabaseClient) {
        setErrorMessage("Нет подключения к Supabase.");
        return false;
      }

      if (!values.fullName.trim()) {
        setErrorMessage("Укажите имя тренера.");
        return false;
      }

      setIsSaving(true);
      const payload: NewProfileRow = {
        id: user.id,
        full_name: values.fullName.trim(),
        role: profile?.role || defaultUserRole,
        phone: values.phone.trim() || null,
        bio: profile?.bio || null,
        avatar_url: profile?.avatarUrl || null,
      };

      const { data, error } = await supabaseClient
        .from("profiles")
        .upsert(payload)
        .select()
        .single();

      if (error || !data) {
        setIsSaving(false);
        setErrorMessage(
          "Не удалось сохранить профиль. Проверьте миграцию и права доступа.",
        );
        return false;
      }

      setProfile(mapProfileRow(data as ProfileRow));
      setErrorMessage(null);
      setIsSaving(false);

      await supabaseClient.auth.updateUser({
        data: {
          full_name: values.fullName.trim(),
          role: payload.role,
        },
      });

      return true;
    },
    [profile?.avatarUrl, profile?.bio, profile?.role, user],
  );

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isSaving,
      errorMessage,
      updateProfile,
      refreshProfile,
    }),
    [
      errorMessage,
      isLoading,
      isSaving,
      profile,
      refreshProfile,
      updateProfile,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }

  return context;
}
