import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-4 py-5 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Tempo</span>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <Link to="/legal/privacy" className="hover:text-[var(--text)]">
            Политика данных
          </Link>
          <Link to="/legal/terms" className="hover:text-[var(--text)]">
            Соглашение
          </Link>
          <Link
            to="/legal/personal-data-consent"
            className="hover:text-[var(--text)]"
          >
            Согласие на ПД
          </Link>
          <Link
            to="/legal/health-data-consent"
            className="hover:text-[var(--text)]"
          >
            Данные здоровья
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
