import { useEffect, useMemo, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type CalendarAssignmentRow,
  type ClientRow,
  type NewCalendarAssignmentRow,
} from "../lib/supabase";
import { useProfile } from "../context/ProfileContext";
import {
  getDraftStorageKey,
  readDraft,
  removeDraft,
  writeDraft,
} from "../lib/draftStorage";

type CalendarClient = {
  id: string;
  firstName: string;
  secondName: string;
};

type CalendarAssignment = {
  id: string;
  clientId: string;
  scheduledDate: string;
  note: string;
  createdAt: string;
};

type CalendarAssignmentDraft = {
  selectedClientId: string;
  selectedDate: string;
  note: string;
};

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const padNumber = (value: number) => String(value).padStart(2, "0");

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (dateKey: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));

const getMonthRange = (date: Date) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
  };
};

const mapClientRow = (row: ClientRow): CalendarClient => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
});

const mapAssignmentRow = (
  row: CalendarAssignmentRow,
): CalendarAssignment => ({
  id: row.id,
  clientId: row.client_id,
  scheduledDate: row.scheduled_date,
  note: row.note ?? "",
  createdAt: row.created_at,
});

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Calendar() {
  const { profile } = useProfile();
  const isClient = profile?.role === "client";
  const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
  const assignmentDraftKey = getDraftStorageKey(
    profile?.id,
    "calendar-assignment",
  );
  const [initialAssignmentDraft] = useState(() =>
    readDraft<CalendarAssignmentDraft>(assignmentDraftKey, {
      selectedClientId: "",
      selectedDate: todayDateKey,
      note: "",
    }),
  );
  const initialSelectedDate =
    initialAssignmentDraft.selectedDate || todayDateKey;
  const [selectedMonth, setSelectedMonth] = useState(() =>
    parseDateKey(initialSelectedDate),
  );
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(
    initialAssignmentDraft.selectedClientId,
  );
  const [note, setNote] = useState(initialAssignmentDraft.note);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isClient) {
      return;
    }

    writeDraft<CalendarAssignmentDraft>(assignmentDraftKey, {
      selectedClientId,
      selectedDate,
      note,
    });
  }, [assignmentDraftKey, isClient, note, selectedClientId, selectedDate]);

  useEffect(() => {
    let isMounted = true;

    const loadCalendar = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { startDate, endDate } = getMonthRange(selectedMonth);
      const [clientsResponse, assignmentsResponse] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .order("first_name", { ascending: true })
          .order("second_name", { ascending: true }),
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
        setErrorMessage("Не удалось загрузить календарь из Supabase.");
        setClients([]);
        setAssignments([]);
      } else {
        const nextClients = ((clientsResponse.data ?? []) as ClientRow[]).map(
          mapClientRow,
        );

        setErrorMessage(null);
        setClients(nextClients);
        setAssignments(
          ((assignmentsResponse.data ?? []) as CalendarAssignmentRow[]).map(
            mapAssignmentRow,
          ),
        );
        setSelectedClientId((currentClientId) =>
          currentClientId &&
          nextClients.some((client) => client.id === currentClientId)
            ? currentClientId
            : nextClients[0]?.id ?? "",
        );
      }

      setIsLoading(false);
    };

    loadCalendar();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const clientsById = useMemo(
    () =>
      clients.reduce<Record<string, CalendarClient>>((accumulator, client) => {
        accumulator[client.id] = client;
        return accumulator;
      }, {}),
    [clients],
  );

  const assignmentsByDate = useMemo(
    () =>
      assignments.reduce<Record<string, CalendarAssignment[]>>(
        (accumulator, assignment) => {
          accumulator[assignment.scheduledDate] = [
            ...(accumulator[assignment.scheduledDate] ?? []),
            assignment,
          ];
          return accumulator;
        },
        {},
      ),
    [assignments],
  );

  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const calendarDate = new Date(year, month, index - leadingDays + 1);
      const dateKey = formatDateKey(calendarDate);

      return {
        dateKey,
        dayNumber: calendarDate.getDate(),
        isCurrentMonth: calendarDate.getMonth() === month,
        isToday: dateKey === todayDateKey,
      };
    });
  }, [selectedMonth, todayDateKey]);

  const selectedDayAssignments = assignmentsByDate[selectedDate] ?? [];
  const monthLabel = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(selectedMonth);

  const handleMonthChange = (direction: "previous" | "next") => {
    const nextMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + (direction === "next" ? 1 : -1),
      1,
    );

    setSelectedMonth(nextMonth);
    setSelectedDate(formatDateKey(nextMonth));
  };

  const handleDateChange = (dateKey: string) => {
    if (!dateKey) {
      return;
    }

    const nextDate = parseDateKey(dateKey);

    setSelectedDate(dateKey);
    setSelectedMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const handleCreateAssignment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    if (!selectedClientId) {
      setErrorMessage("Добавьте клиента и выберите его для назначения.");
      return;
    }

    const payload: NewCalendarAssignmentRow = {
      client_id: selectedClientId,
      scheduled_date: selectedDate,
      note: note.trim() || null,
    };

    setIsSaving(true);

    const { data, error } = await supabase
      .from("calendar_assignments")
      .insert(payload)
      .select()
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage(
        error?.code === "23505"
          ? "Этот клиент уже назначен на выбранный день."
          : "Не удалось назначить клиента на день.",
      );
      return;
    }

    setErrorMessage(null);
    setAssignments((currentAssignments) => [
      ...currentAssignments,
      mapAssignmentRow(data as CalendarAssignmentRow),
    ]);
    removeDraft(assignmentDraftKey);
    setNote("");
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase
      .from("calendar_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить назначение.");
      return;
    }

    setErrorMessage(null);
    setAssignments((currentAssignments) =>
      currentAssignments.filter((assignment) => assignment.id !== id),
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Расписание
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          {isClient ? "Мой календарь" : "Календарь"}
        </h1>
      </div>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold capitalize text-[var(--text)]">
                {monthLabel}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {isClient
                  ? `${assignments.length} моих назначений в этом месяце`
                  : `${assignments.length} назначений в этом месяце`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Предыдущий месяц"
                aria-label="Предыдущий месяц"
                onClick={() => handleMonthChange("previous")}
                className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                title="Следующий месяц"
                aria-label="Следующий месяц"
                onClick={() => handleMonthChange("next")}
                className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--text-muted)]">
            {weekDays.map((weekDay) => (
              <span key={weekDay} className="py-2">
                {weekDay}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayAssignments = assignmentsByDate[day.dateKey] ?? [];
              const isSelected = selectedDate === day.dateKey;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => handleDateChange(day.dateKey)}
                  className={[
                    "focus-ring flex min-h-20 flex-col items-start justify-between rounded-lg border p-2 text-left transition sm:min-h-24 sm:p-3",
                    isSelected
                      ? "border-[var(--accent)] bg-blue-50 text-[var(--accent)]"
                      : "border-[var(--border)] bg-white hover:border-[var(--accent)]",
                    isSelected
                      ? ""
                      : day.isCurrentMonth
                        ? "text-[var(--text)]"
                        : "text-[var(--text-muted)] opacity-60",
                  ].join(" ")}
                >
                  <span className="flex w-full items-center justify-between gap-1">
                    <span className="font-bold">{day.dayNumber}</span>
                    {day.isToday && (
                      <span className="h-2 w-2 rounded-full bg-[var(--warm)]" />
                    )}
                  </span>

                  {dayAssignments.length > 0 && (
                    <span className="mt-2 rounded-full bg-[var(--surface-tint)] px-2 py-1 text-xs font-semibold text-[var(--teal)]">
                      {dayAssignments.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          {!isClient && (
            <form
              onSubmit={handleCreateAssignment}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text)]">
                Назначить клиента
              </h2>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  День
                </span>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Клиент
                </span>
                <select
                  value={selectedClientId}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                  disabled={clients.length === 0}
                  className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                >
                  {clients.length === 0 ? (
                    <option value="">Нет клиентов</option>
                  ) : (
                    clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.firstName}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Заметка
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Например: силовая, контроль замеров..."
                  className="focus-ring min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving || clients.length === 0}
                className="focus-ring mt-5 min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Назначаем..." : "Назначить на день"}
              </button>
            </form>
          )}

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                Выбранный день
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--text)]">
                {formatDisplayDate(selectedDate)}
              </h2>
            </div>

            {isLoading ? (
              <p className="text-sm text-[var(--text-muted)]">
                Загружаем расписание...
              </p>
            ) : selectedDayAssignments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
                {isClient
                  ? "На этот день назначений пока нет."
                  : "На этот день клиенты пока не назначены."}
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedDayAssignments.map((assignment) => {
                  const client = clientsById[assignment.clientId];

                  return (
                    <li
                      key={assignment.id}
                      className="rounded-lg border border-[var(--border)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[var(--text)]">
                            {client ? client.firstName : "Клиент удален"}
                          </p>
                          {assignment.note && (
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {assignment.note}
                            </p>
                          )}
                        </div>

                        {!isClient && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="focus-ring shrink-0 rounded-lg border border-rose-100 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

export default Calendar;
