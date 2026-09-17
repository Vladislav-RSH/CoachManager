import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import { ThemeProvider } from "./context/ThemeContext";
import LogoMark from "./components/LogoMark";
import InvitePage from "./pages/InvitePage";
import LegalPage from "./pages/LegalPage";

function AuthLoadingScreen({
  message = "Проверяем сессию...",
}: {
  message?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-5 text-center shadow-sm">
        <LogoMark alt="Tempo" className="mx-auto h-12 w-12" />
        <p className="mt-4 text-sm font-semibold text-[var(--text)]">
          {message}
        </p>
      </div>
    </main>
  );
}

function AppContent() {
  const { session, isLoading } = useAuth();
  const { isLoading: isProfileLoading } = useProfile();
  const location = useLocation();
  const isInviteRoute =
    location.pathname === "/invite" ||
    location.pathname.startsWith("/invite/");
  const isLegalRoute =
    location.pathname === "/legal" || location.pathname.startsWith("/legal/");

  if (isLegalRoute) {
    return <LegalPage />;
  }

  if (isInviteRoute) {
    return <InvitePage />;
  }

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return location.pathname === "/auth" ? (
      <AuthPage />
    ) : (
      <Navigate to="/auth" replace />
    );
  }

  if (isProfileLoading) {
    return <AuthLoadingScreen message="Загружаем профиль..." />;
  }

  if (location.pathname === "/auth") {
    return <Navigate to="/" replace />;
  }

  return <AppLayout />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <section className="app-shell min-h-screen font-sans text-[var(--text)]">
            <AppContent />
          </section>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
