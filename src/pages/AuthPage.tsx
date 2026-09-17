import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  buildLegalAcceptancesMetadata,
  getLegalDocument,
  getLegalDocumentPath,
  getRequiredLegalAcceptances,
} from "../lib/legal";

export type AuthMode = "login" | "register";

const inputClass =
  "focus-ring min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]";

const getAuthErrorMessage = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "Неверный email или пароль.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Пользователь с таким email уже зарегистрирован.";
  }

  if (normalizedMessage.includes("password should be at least")) {
    return "Пароль должен содержать минимум 6 символов.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Подтвердите email по ссылке из письма.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("429") ||
    normalizedMessage.includes("over email send rate limit")
  ) {
    return "Слишком много запросов на отправку письма. Подождите несколько минут и попробуйте еще раз.";
  }

  return "Не удалось выполнить запрос. Попробуйте еще раз.";
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [confirmationRedirectPath, setConfirmationRedirectPath] = useState("");
  const [confirmationCooldownSeconds, setConfirmationCooldownSeconds] =
    useState(0);
  const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState<
    Record<string, boolean>
  >({});

  const isRegistering = mode === "register";
  const registrationRole = "trainer";
  const legalRequirements = getRequiredLegalAcceptances(registrationRole);
  const hasAcceptedRequiredLegal = legalRequirements.every(
    (requirement) => acceptedLegalDocuments[requirement.documentKey],
  );

  useEffect(() => {
    if (confirmationCooldownSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConfirmationCooldownSeconds((currentValue) =>
        Math.max(0, currentValue - 1),
      );
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [confirmationCooldownSeconds]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmationEmail("");
    setConfirmationRedirectPath("");
    setConfirmationCooldownSeconds(0);
    setPassword("");
    setPasswordConfirmation("");
  };

  const handleResendConfirmation = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Supabase не настроен. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (!confirmationEmail) {
      setErrorMessage("Укажите email и повторите регистрацию.");
      return;
    }

    if (confirmationCooldownSeconds > 0) {
      return;
    }

    setErrorMessage(null);
    setIsResendingConfirmation(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${
          confirmationRedirectPath || "/auth"
        }`,
      },
    });

    setIsResendingConfirmation(false);
    setConfirmationCooldownSeconds(60);

    if (error) {
      setErrorMessage(getAuthErrorMessage(error.message));
      return;
    }

    setSuccessMessage(
      "Если аккаунт ожидает подтверждения, письмо отправлено повторно. Проверьте входящие и спам.",
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Supabase не настроен. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (isRegistering && !fullName.trim()) {
      setErrorMessage("Укажите имя, чтобы создать профиль.");
      return;
    }

    if (isRegistering && password !== passwordConfirmation) {
      setErrorMessage("Пароли не совпадают.");
      return;
    }

    if (isRegistering && !hasAcceptedRequiredLegal) {
      setErrorMessage("Примите обязательные юридические условия.");
      return;
    }

    setIsLoading(true);

    if (isRegistering) {
      const authRedirectPath = "/auth";
      const normalizedEmail = email.trim();
      const legalAcceptances = buildLegalAcceptancesMetadata(
        registrationRole,
        legalRequirements,
        window.navigator.userAgent,
      );
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${authRedirectPath}`,
          data: {
            full_name: fullName.trim(),
            role: registrationRole,
            legal_acceptances: legalAcceptances,
          },
        },
      });

      setIsLoading(false);

      if (error) {
        setErrorMessage(getAuthErrorMessage(error.message));
        return;
      }

      if (data.session) {
        navigate("/", { replace: true });
        return;
      }

      setConfirmationEmail(normalizedEmail);
      setConfirmationRedirectPath(authRedirectPath);
      setConfirmationCooldownSeconds(60);
      setSuccessMessage(
        "Если аккаунт создан и ожидает подтверждения, письмо отправлено. Проверьте входящие и спам. Если email уже подтверждался раньше, попробуйте войти или восстановить пароль.",
      );
      setMode("login");
      setPassword("");
      setPasswordConfirmation("");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(getAuthErrorMessage(error.message));
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-stretch overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-slate-900/10 sm:min-h-[calc(100vh-5rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="relative z-10">
            <LogoMark className="h-12 w-12 shadow-sm" />
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-teal-200">
              Tempo
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">
              Ваш рабочий кабинет Tempo в одном месте.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Клиенты, календарь, тренировочные программы, питание и аналитика
              в рабочем пространстве, которое всегда под рукой.
            </p>
          </div>

          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full border-[32px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 rounded-full border-[18px] border-teal-300/10" />
        </section>

        <section className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-11 w-11 shadow-sm" />
            <div>
              <p className="font-semibold text-[var(--text)]">Tempo</p>
              <p className="text-sm text-[var(--text-muted)]">
                Кабинет Tempo
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              {isRegistering ? "Новый аккаунт" : "С возвращением"}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[var(--text)]">
              {isRegistering ? "Создайте профиль тренера" : "Войдите в кабинет"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              {isRegistering
                ? "Заполните данные, чтобы вести клиентов и программы."
                : "Введите данные, чтобы продолжить работу с Tempo."}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 rounded-lg bg-[var(--surface-soft)] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "focus-ring min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition",
                !isRegistering
                  ? "bg-white text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={[
                "focus-ring min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition",
                isRegistering
                  ? "bg-white text-[var(--text)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              Регистрация
            </button>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium leading-5 text-rose-800">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium leading-5 text-emerald-800">
              <p>{successMessage}</p>
              {confirmationEmail && (
                <button
                  type="button"
                  onClick={() => void handleResendConfirmation()}
                  disabled={
                    isResendingConfirmation || confirmationCooldownSeconds > 0
                  }
                  className="focus-ring mt-3 min-h-9 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResendingConfirmation
                    ? "Отправляем..."
                    : confirmationCooldownSeconds > 0
                      ? `Повторно через ${confirmationCooldownSeconds} сек.`
                      : "Отправить письмо еще раз"}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            {isRegistering && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                    Имя и фамилия
                  </span>
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Например, Илья Федоров"
                    className={inputClass}
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Пароль
              </span>
              <input
                required
                type="password"
                minLength={6}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
                className={inputClass}
              />
            </label>

            {isRegistering && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Повторите пароль
                </span>
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  placeholder="Повторите пароль"
                  className={inputClass}
                />
              </label>
            )}

            {isRegistering && (
              <fieldset className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <legend className="px-1 text-sm font-semibold text-[var(--text)]">
                  Юридические условия
                </legend>
                <div className="mt-3 grid gap-3">
                  {legalRequirements.map((requirement) => {
                    const document = getLegalDocument(requirement.documentKey);

                    return (
                      <label
                        key={requirement.documentKey}
                        className="flex cursor-pointer gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                      >
                        <input
                          type="checkbox"
                          checked={
                            acceptedLegalDocuments[requirement.documentKey] ??
                            false
                          }
                          onChange={(event) =>
                            setAcceptedLegalDocuments((currentValue) => ({
                              ...currentValue,
                              [requirement.documentKey]:
                                event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold leading-5 text-[var(--text)]">
                            {requirement.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                            {requirement.description}{" "}
                            <Link
                              to={getLegalDocumentPath(
                                requirement.documentKey,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
                            >
                              {document?.title ?? "Документ"}
                            </Link>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <button
              type="submit"
              disabled={
                isLoading || (isRegistering && !hasAcceptedRequiredLegal)
              }
              className="focus-ring mt-2 min-h-12 rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Подождите..."
                : isRegistering
                  ? "Создать аккаунт"
                  : "Войти"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            {isRegistering ? "Уже есть аккаунт?" : "Еще нет аккаунта?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isRegistering ? "login" : "register")}
              className="font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              {isRegistering ? "Войти" : "Зарегистрироваться"}
            </button>
          </p>

          <Link
            to="/"
            className="mt-5 text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Tempo
          </Link>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
