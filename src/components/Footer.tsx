function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-white/70">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-2 px-4 py-5 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>CoachManager</span>
        <span>Кабинет для контроля клиентов, занятий и прогресса</span>
      </div>
    </footer>
  );
}

export default Footer;
