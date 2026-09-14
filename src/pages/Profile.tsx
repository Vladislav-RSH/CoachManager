function Profile() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Настройки
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Профиль тренера
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Управляйте данными профиля и настройками рабочего пространства.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-[var(--sidebar)] text-2xl font-bold text-white">
              ИФ
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Илья Ф.</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Персональный тренер
              </p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Профиль активен
              </span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <dt className="text-sm text-[var(--text-muted)]">Клиенты</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--text)]">24</dd>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <dt className="text-sm text-[var(--text-muted)]">В системе</dt>
              <dd className="mt-1 text-lg font-bold text-[var(--text)]">
                1 год
              </dd>
            </div>
          </dl>
        </div>

        <aside className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)] p-5 text-white shadow-sm">
          <p className="text-sm font-semibold text-slate-300">Ваш фокус</p>
          <p className="mt-3 text-2xl font-bold">24 клиента</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Стабильный ритм работы. На этой неделе лучше всего растет
            вовлеченность в планы питания.
          </p>
        </aside>
      </section>
    </section>
  );
}

export default Profile;
