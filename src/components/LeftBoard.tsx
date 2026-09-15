import { NavLink } from "react-router-dom";
import ClientsIcon from "../icons/ClientsIcon";
import AnalyticsIcon from "../icons/AnalyticsIcon";
import CalendarIcon from "../icons/CalendarIcon";
import WorkoutPatternsIcon from "../icons/WorkoutPatternsIcon";
import NutritionProgramIcon from "../icons/NutritionsProgrammIcon";
import HomeIcon from "../icons/HomeIcon";

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

const menuItems = [
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

function LeftBoard({ className = "", onClose, onNavigate }: LeftBoardProps) {
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
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-lg font-black text-[var(--sidebar)]">
          ИФ
        </div>
        <div className="min-w-0">
          <span className="block truncate font-semibold">Илья Ф.</span>
          <span className="text-sm text-slate-300">Тренер</span>
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

    </aside>
  );
}

export default LeftBoard;
