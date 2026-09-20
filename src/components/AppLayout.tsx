import { useEffect, useState } from "react";

import Display from "./Display";
import Header from "./Header";
import LeftBoard from "./LeftBoard";

function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <section className="flex min-h-screen flex-col">
      <Header onMenuOpen={() => setIsMenuOpen(true)} />

      <section className="mx-auto grid w-full max-w-[1480px] flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[292px_minmax(0,1fr)] lg:gap-7 lg:px-8 lg:py-7">
        <div className="hidden lg:block">
          <LeftBoard className="sticky top-[92px]" />
        </div>

        <Display />
      </section>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="h-full w-[min(88vw,320px)] p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <LeftBoard
              className="h-full"
              onClose={() => setIsMenuOpen(false)}
              onNavigate={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default AppLayout;
