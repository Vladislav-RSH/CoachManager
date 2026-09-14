import { useEffect, useMemo, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type CalendarAssignmentRow,
  type ClientRow,
} from "../lib/supabase";

type HomeClient = {
  id: string;
  firstName: string;
  secondName: string;
};

type HomeAssignment = {
  id: string;
  clientId: string;
  scheduledDate: string;
  note: string;
};

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const padNumber = (value: number) => String(value).padStart(2, "0");

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}`;

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const formatScheduleDate = (dateKey: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(parseDateKey(dateKey));

const mapClientRow = (row: ClientRow): HomeClient => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
});

const mapAssignmentRow = (row: CalendarAssignmentRow): HomeAssignment => ({
  id: row.id,
  clientId: row.client_id,
  scheduledDate: row.scheduled_date,
  note: row.note ?? "",
});

function HomePage() {
  const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
  const [clients, setClients] = useState<HomeClient[]>([]);
  const [assignments, setAssignments] = useState<HomeAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const startDate = formatDateKey(today);
      const endDate = formatDateKey(addDays(today, 14));

      const [clientsResponse, assignmentsResponse] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("calendar_assignments")
          .select("*")
          .gte("scheduled_date", startDate)
          .lte("scheduled_date", endDate)
          .order("scheduled_date", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      if (clientsResponse.error || assignmentsResponse.error) {
        setErrorMessage("Не удалось загрузить данные главной из Supabase.");
        setClients([]);
        setAssignments([]);
      } else {
        setErrorMessage(null);
        setClients(((clientsResponse.data ?? []) as ClientRow[]).map(mapClientRow));
        setAssignments(
          ((assignmentsResponse.data ?? []) as CalendarAssignmentRow[]).map(
            mapAssignmentRow,
          ),
        );
      }

      setIsLoading(false);
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const clientsById = useMemo(
    () =>
      clients.reduce<Record<string, HomeClient>>((accumulator, client) => {
        accumulator[client.id] = client;
        return accumulator;
      }, {}),
    [clients],
  );

  const todayAssignments = assignments.filter(
    (assignment) => assignment.scheduledDate === todayDateKey,
  );

  const stats = [
    {
      label: "Активные клиенты",
      value: isLoading ? "..." : String(clients.length),
      tone: "text-[var(--accent)]",
    },
    {
      label: "Назначений сегодня",
      value: isLoading ? "..." : String(todayAssignments.length),
      tone: "text-[var(--teal)]",
    },
  ];

  const upcomingAssignments = assignments.slice(0, 5);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Сегодня
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Главная
        </h1>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            <p className={`mt-3 text-3xl font-bold ${stat.tone}`}>
              {stat.value}
            </p>
          </li>
        ))}
      </ul>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      <div className="grid grid-cols-1 gap-5">
        <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Ближайшие назначения
            </h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              {isLoading
                ? "Загрузка"
                : `${upcomingAssignments.length} событий`}
            </span>
          </div>

          {isLoading ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
              Загружаем календарь...
            </p>
          ) : upcomingAssignments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
              На ближайшие две недели назначений пока нет.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => {
                const client = clientsById[assignment.clientId];

                return (
                  <article
                    key={assignment.id}
                    className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <time className="font-bold capitalize text-[var(--text)]">
                      {formatScheduleDate(assignment.scheduledDate)}
                    </time>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text)]">
                        {client
                          ? `${client.firstName} ${client.secondName}`
                          : "Клиент удален"}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {assignment.note || "Без заметки"}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-[var(--surface-tint)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                      Запланировано
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default HomePage;
