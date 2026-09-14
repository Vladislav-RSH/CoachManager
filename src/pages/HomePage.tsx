const stats = [
  { label: "Активные клиенты", value: "24", tone: "text-[var(--accent)]" },
  { label: "Тренировки сегодня", value: "5", tone: "text-[var(--teal)]" },
];

const schedule = [
  { time: "09:00", name: "Мария К.", type: "Силовая" },
  { time: "12:30", name: "Андрей П.", type: "Кардио" },
  { time: "18:00", name: "Ольга С.", type: "Замеры" },
];

function HomePage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Сегодня
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Главная
        </h1>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            <p className={`mt-3 text-3xl font-bold ${stat.tone}`}>
              {stat.value}
            </p>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-5">
        <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Ближайшие занятия
            </h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              3 события
            </span>
          </div>

          <div className="space-y-3">
            {schedule.map((item) => (
              <article
                key={`${item.time}-${item.name}`}
                className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
              >
                <time className="font-bold text-[var(--text)]">
                  {item.time}
                </time>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text)]">
                    {item.name}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.type}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[var(--surface-tint)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                  Запланировано
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default HomePage;
