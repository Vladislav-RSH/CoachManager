import { Link, useLocation } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import { legalDocuments, legalOperator } from "../lib/legal";

const getDocumentBySlug = (slug: string | undefined) =>
  legalDocuments.find((document) => document.slug === slug) ??
  legalDocuments[0];

function LegalPage() {
  const location = useLocation();
  const slug = location.pathname.split("/").filter(Boolean)[1];
  const document = getDocumentBySlug(slug);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link to="/auth" className="flex items-center gap-3">
            <LogoMark alt="Tempo" className="h-11 w-11" />
            <div>
              <p className="font-bold text-[var(--text)]">Tempo</p>
              <p className="text-sm text-[var(--text-muted)]">
                Юридические документы
              </p>
            </div>
          </Link>
          <Link
            to="/auth"
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Вернуться ко входу
          </Link>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm lg:sticky lg:top-5 lg:self-start">
            <nav className="grid gap-1">
              {legalDocuments.map((legalDocument) => {
                const isActive = legalDocument.key === document.key;

                return (
                  <Link
                    key={legalDocument.key}
                    to={`/legal/${legalDocument.slug}`}
                    className={[
                      "rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                      isActive
                        ? "bg-[var(--surface-tint)] text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]",
                    ].join(" ")}
                  >
                    {legalDocument.title}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Версия {document.version}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {document.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Действует с {document.effectiveDate}. {document.summary}
            </p>

            <section className="mt-6 rounded-lg bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text)]">Оператор</p>
              <p className="mt-1">{legalOperator.operatorName}</p>
              <p>{legalOperator.operatorDetails}</p>
              <p>Сайт: {legalOperator.siteDomain}</p>
              <p>Поддержка: {legalOperator.supportEmail}</p>
              <p>Контакт по данным: {legalOperator.privacyEmail}</p>
            </section>

            <div className="mt-8 space-y-7">
              {document.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-lg font-bold text-[var(--text)]">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-muted)]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

export default LegalPage;
