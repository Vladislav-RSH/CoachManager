import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { supabase } from "../lib/supabase";
import { legalOperator } from "../lib/legal";
import { userRoleLabels } from "../lib/userRoles";

const inputClass =
  "focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 text-[var(--text)] outline-none transition focus:border-[var(--accent)]";

const getInitials = (fullName: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "Т";
};

const formatDate = (dateValue: string | undefined) => {
  if (!dateValue) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
};

const getUserMetadataString = (
  value: unknown,
  fallback: string,
): string => (typeof value === "string" ? value : fallback);

function Profile() {
  const { user } = useAuth();
  const {
    profile,
    isLoading: isProfileLoading,
    isSaving,
    errorMessage: profileErrorMessage,
    updateProfile,
  } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const fallbackName = getUserMetadataString(
    user?.user_metadata?.full_name,
    user?.email?.split("@")[0] || "Пользователь",
  );
  const displayName = profile?.fullName || fullName || fallbackName;
  const roleLabel = profile ? userRoleLabels[profile.role] : "Аккаунт";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!profile) {
        setFullName(fallbackName);
        return;
      }

      setFullName(profile.fullName);
      setPhone(profile.phone);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fallbackName, profile]);

  useEffect(() => {
    let isMounted = true;

    const loadClientCount = async () => {
      if (!supabase) {
        return;
      }

      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true });

      if (isMounted) {
        setClientCount(count ?? 0);
      }
    };

    loadClientCount();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const isSaved = await updateProfile({
      fullName,
      phone,
    });

    if (isSaved) {
      setSuccessMessage("Профиль сохранен.");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordError("Новый пароль должен содержать минимум 6 символов.");
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setPasswordError("Пароли не совпадают.");
      return;
    }

    if (!supabase) {
      setPasswordError("Нет подключения к Supabase.");
      return;
    }

    setIsPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsPasswordSaving(false);

    if (error) {
      setPasswordError("Не удалось изменить пароль. Попробуйте еще раз.");
      return;
    }

    setNewPassword("");
    setPasswordConfirmation("");
    setPasswordMessage("Пароль успешно изменен.");
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Настройки
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          {profile?.role === "client" ? "Профиль клиента" : "Профиль тренера"}
        </h1>
      </div>

      {profileErrorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          {profileErrorMessage}
        </section>
      )}

      <section>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-[var(--sidebar)] text-2xl font-bold text-white">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-[var(--text)]">
                {displayName}
              </h2>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {roleLabel}
              </span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <dt className="text-sm text-[var(--text-muted)]">
                {profile?.role === "client" ? "Тип аккаунта" : "Клиенты"}
              </dt>
              <dd className="mt-1 text-lg font-bold text-[var(--text)]">
                {profile?.role === "client"
                  ? roleLabel
                  : clientCount === null
                    ? "..."
                    : clientCount}
              </dd>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <dt className="text-sm text-[var(--text-muted)]">Email</dt>
              <dd className="mt-1 truncate text-sm font-bold text-[var(--text)]">
                {user?.email || "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <dt className="text-sm text-[var(--text-muted)]">В системе</dt>
              <dd className="mt-1 text-sm font-bold text-[var(--text)]">
                {formatDate(profile?.createdAt || user?.created_at)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]">
        <form
          onSubmit={handleProfileSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">
              Данные профиля
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Имя и фамилия
              </span>
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isProfileLoading}
                className={inputClass}
              />
            </label>

            <label className="block min-w-0 sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Телефон
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 (___) ___-__-__"
                disabled={isProfileLoading}
                className={inputClass}
              />
            </label>
          </div>

          {successMessage && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving || isProfileLoading}
            className="focus-ring mt-5 min-h-11 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-[var(--text)]">
            Безопасность
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Измените пароль для входа в рабочий кабинет.
          </p>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              Новый пароль
            </span>
            <input
              required
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Минимум 6 символов"
              className={inputClass}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              Повторите пароль
            </span>
            <input
              required
              type="password"
              minLength={6}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Повторите новый пароль"
              className={inputClass}
            />
          </label>

          {passwordError && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {passwordError}
            </p>
          )}

          {passwordMessage && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {passwordMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPasswordSaving}
            className="focus-ring mt-5 min-h-11 rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPasswordSaving ? "Изменяем..." : "Изменить пароль"}
          </button>
        </form>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--text)]">
          Персональные данные
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Вы можете запросить копию, исправление, ограничение обработки или
          удаление своих данных. Для безопасности запрос обрабатывается вручную
          после проверки аккаунта.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`mailto:${legalOperator.privacyEmail}?subject=${encodeURIComponent(
              "Запрос по персональным данным Tempo",
            )}`}
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Запросить действие с данными
          </a>
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
          >
            Политика обработки данных
          </a>
        </div>
      </section>
    </section>
  );
}

export default Profile;
