import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { ThemeProvider } from "./context/ThemeContext";
import LogoMark from "./components/LogoMark";

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-5 text-center shadow-sm">
        <LogoMark alt="Tempo" className="mx-auto h-12 w-12" />
        <p className="mt-4 text-sm font-semibold text-[var(--text)]">
          Проверяем сессию...
        </p>
      </div>
    </main>
  );
}

function AppContent() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

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
