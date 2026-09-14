type HeaderProps = {
  onMenuOpen: () => void;
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m20 20-4.2-4.2M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Header({ onMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          title="Открыть меню"
          aria-label="Открыть меню"
          onClick={onMenuOpen}
          className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--sidebar)] text-sm font-black text-white shadow-sm">
            CM
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--text)]">
              CoachManager
            </p>
            <p className="hidden text-sm text-[var(--text-muted)] sm:block">
              Рабочий кабинет тренера
            </p>
          </div>
        </div>

        <label className="relative hidden w-full max-w-sm items-center md:flex">
          <span className="pointer-events-none absolute left-3 text-[var(--text-muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Поиск клиента или занятия"
            className="focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] pl-10 pr-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <div className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Онлайн
        </div>
      </div>
    </header>
  );
}

export default Header;
