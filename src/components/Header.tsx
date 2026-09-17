import { useMemo } from "react";
import type { ReactElement } from "react";
import { useProfile } from "../context/ProfileContext";
import { useTheme, type ThemeMode } from "../context/ThemeContext";
import LogoMark from "./LogoMark";

type HeaderProps = {
  onMenuOpen: () => void;
};

type ThemeOption = {
  value: ThemeMode;
  label: string;
  Icon: () => ReactElement;
};

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 4V2m0 20v-2M4.9 4.9 3.5 3.5m17 17-1.4-1.4M4 12H2m20 0h-2M4.9 19.1l-1.4 1.4m17-17-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M20 14.4A7.9 7.9 0 0 1 9.6 4a8 8 0 1 0 10.4 10.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M7 3v3M17 3v3M4 9h16M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const themeOptions: ThemeOption[] = [
  { value: "light", label: "Светлая", Icon: SunIcon },
  { value: "dark", label: "Темная", Icon: MoonIcon },
];

function Header({ onMenuOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { profile } = useProfile();
  const accountLabel =
    profile?.role === "client" ? "Кабинет клиента" : "Кабинет тренера";
  const currentDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)] shadow-sm shadow-slate-900/5">
      <div className="relative mx-auto flex min-h-[76px] w-full max-w-[1480px] items-center gap-3 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-72 bg-gradient-to-r from-[var(--surface-tint)] to-transparent opacity-80 sm:block" />
        <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent" />

        <button
          type="button"
          title="Открыть меню"
          aria-label="Открыть меню"
          onClick={onMenuOpen}
          className="focus-ring relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="relative flex min-w-0 flex-1 items-center gap-3">
          <LogoMark className="h-12 w-12 shadow-sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-bold text-[var(--text)]">
                Tempo
              </p>
              <span className="hidden rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-xs font-bold text-[var(--teal)] sm:inline-flex">
                {accountLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text-muted)] md:flex">
          <CalendarIcon />
          <span className="capitalize">{currentDateLabel}</span>
        </div>

        <div
          className="relative grid grid-cols-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-1"
          aria-label="Выбор темы"
        >
          {themeOptions.map(({ value, label, Icon }) => {
            const isActive = theme === value;

            return (
              <button
                key={value}
                type="button"
                title={label}
                aria-pressed={isActive}
                onClick={() => setTheme(value)}
                className={[
                  "focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-semibold transition sm:px-3",
                  isActive
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                <Icon />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default Header;
