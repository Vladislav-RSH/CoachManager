type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
};

function PagePlaceholder({
  eyebrow,
  title,
  description,
  items,
}: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <article
            key={item}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--surface-tint)] text-sm font-bold text-[var(--teal)]">
              {index + 1}
            </span>
            <p className="mt-4 text-sm font-semibold leading-6 text-[var(--text)]">
              {item}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-8 text-center">
        <h2 className="text-lg font-bold text-[var(--text)]">
          Раздел готов к наполнению
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Визуальная оболочка уже адаптирована под desktop, планшеты и телефоны.
        </p>
      </section>
    </section>
  );
}

export default PagePlaceholder;
