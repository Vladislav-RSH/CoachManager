import { NavLink } from "react-router-dom";
import ClientsIcon from "../icons/ClientsIcon";
import AnalyticsIcon from "../icons/AnalyticsIcon";
import CalendarIcon from "../icons/CalendarIcon";
import ChatsIcon from "../icons/ChatsIcon";
import WorkoutPatternsIcon from "../icons/WorkoutPatternsIcon";
import NutritionProgramIcon from "../icons/NutritionsProgrammIcon";
import HomeIcon from "../icons/HomeIcon";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-all",
    isActive
      ? "bg-[#202b36] text-white shadow-[inset_0_0_0_1px_#2f3b48]"
      : "text-[#a8b5c3] hover:bg-[#202b36] hover:text-white",
  ].join(" ");

const menuItems = [
  { to: "/", label: "Главная", Icon: HomeIcon},
  { to: "/clients", label: "Клиенты", Icon: ClientsIcon },
  { to: "/analytics", label: "Аналитика", Icon: AnalyticsIcon },
  { to: "/calendar", label: "Календарь", Icon: CalendarIcon },
  { to: "/chats", label: "Чаты", Icon: ChatsIcon },
  { to: "/workoutpatterns", label: "Программы тренировок", Icon: WorkoutPatternsIcon },
  { to: "/nutritionprograms", label: "Планы питания", Icon: NutritionProgramIcon },
];

function LeftBoard() {
  return (
    <aside className="ml-10 mt-10 flex w-[320px] shrink-0 flex-col gap-5 rounded-2xl border border-[#2f3b48] bg-[#242f3d] p-6 text-white">
      <NavLink
        to="/profile"
        end
        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-[#202b36]"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#17212b] text-lg font-black text-white">
          ИФ
        </div>
        <div className="flex flex-col">
          <span>Илья Ф.</span>
          <span className="text-sm italic text-[#a8b5c3]">Тренер</span>
        </div>
      </NavLink>

      <nav className="flex flex-col gap-2">
        {menuItems.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end className={navItemClass}>
            <span className="text-current">
              <Icon />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default LeftBoard;