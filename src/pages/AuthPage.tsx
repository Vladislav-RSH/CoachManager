import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthMode = "login" | "register";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isRegistering = mode === "register";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword("");
    setPasswordConfirmation("");
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
      setErrorMessage("Укажите имя, чтобы создать профиль тренера.");
      return;
    }

    if (isRegistering && password !== passwordConfirmation) {
      setErrorMessage("Пароли не совпадают.");
      return;
    }

    setIsLoading(true);

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName.trim(),
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

      setSuccessMessage(
        "Аккаунт создан. Проверьте почту и перейдите по ссылке для подтверждения email.",
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
              Ваш кабинет тренера в одном месте.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Клиенты, календарь, тренировочные программы, питание и аналитика
              в рабочем пространстве, которое всегда под рукой.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 text-sm text-slate-300">
            {["Безопасный вход через Supabase Auth", "Профиль тренера с персональными настройками", "Доступ к рабочим данным только после входа"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-teal-200">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ),
            )}
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
                Кабинет тренера
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
                ? "Заполните данные, чтобы начать работу с клиентами."
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
              {successMessage}
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

            <button
              type="submit"
              disabled={isLoading}
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
