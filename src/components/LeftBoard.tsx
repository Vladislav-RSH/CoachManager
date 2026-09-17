import { NavLink } from "react-router-dom";
import ClientsIcon from "../icons/ClientsIcon";
import AnalyticsIcon from "../icons/AnalyticsIcon";
import CalendarIcon from "../icons/CalendarIcon";
import WorkoutPatternsIcon from "../icons/WorkoutPatternsIcon";
import NutritionProgramIcon from "../icons/NutritionsProgrammIcon";
import HomeIcon from "../icons/HomeIcon";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { supabase } from "../lib/supabase";
import { userRoleLabels } from "../lib/userRoles";

type LeftBoardProps = {
  className?: string;
  onClose?: () => void;
  onNavigate?: () => void;
};

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-all",
    isActive
      ? "bg-[var(--accent)] text-white shadow-sm"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");

const trainerMenuItems = [
  { to: "/", label: "Главная", Icon: HomeIcon },
  { to: "/clients", label: "Клиенты", Icon: ClientsIcon },
  { to: "/analytics", label: "Аналитика", Icon: AnalyticsIcon },
  { to: "/calendar", label: "Календарь", Icon: CalendarIcon },
  {
    to: "/workoutpatterns",
    label: "Программы тренировок",
    Icon: WorkoutPatternsIcon,
  },
  { to: "/nutritionprograms", label: "Планы питания", Icon: NutritionProgramIcon },
];

const clientMenuItems = [
  { to: "/", label: "Главная", Icon: HomeIcon },
  { to: "/calendar", label: "Мой календарь", Icon: CalendarIcon },
  {
    to: "/workoutpatterns",
    label: "Тренировки",
    Icon: WorkoutPatternsIcon,
  },
  { to: "/nutritionprograms", label: "Питание", Icon: NutritionProgramIcon },
  { to: "/analytics", label: "Моя аналитика", Icon: AnalyticsIcon },
];

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14M11 12h8m0 0-3-3m3 3-3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const getInitials = (fullName: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "Т";
};

function LeftBoard({ className = "", onClose, onNavigate }: LeftBoardProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const role = profile?.role ?? "trainer";
  const menuItems = role === "client" ? clientMenuItems : trainerMenuItems;
  const displayName =
    profile?.fullName.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    userRoleLabels[role];

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    onClose?.();
  };

  return (
    <aside
      className={`flex w-full shrink-0 flex-col rounded-lg border border-white/10 bg-[var(--sidebar)] p-4 text-white shadow-xl shadow-slate-950/10 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <span className="text-sm font-semibold text-slate-300">Навигация</span>
        {onClose && (
          <button
            type="button"
            title="Закрыть меню"
            aria-label="Закрыть меню"
            onClick={onClose}
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <NavLink
        to="/profile"
        end
        onClick={onNavigate}
        className="mb-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 transition-all hover:bg-white/10"
      >
        <div className="brand-mark grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-lg font-black text-[var(--sidebar)]">
          {getInitials(displayName)}
        </div>
        <div className="min-w-0">
          <span className="block truncate font-semibold">{displayName}</span>
          <span className="block truncate text-sm text-slate-300">
            {userRoleLabels[role]}
          </span>
        </div>
      </NavLink>

      <nav className="flex flex-1 flex-col gap-1">
        {menuItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={navItemClass}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.08] text-current transition group-hover:bg-white/[0.12]">
              <Icon />
            </span>
            <span className="min-w-0 leading-snug">{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        title="Выйти из аккаунта"
        className="focus-ring mt-4 inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.08]">
          <SignOutIcon />
        </span>
        Выйти
      </button>
    </aside>
  );
}

export default LeftBoard;
