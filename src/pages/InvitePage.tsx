import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LogoMark from "../components/LogoMark";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { WorkoutExerciseIntensity } from "../lib/supabase";

type ClientPortalClient = {
  id: string;
  firstName: string;
  secondName: string;
  birthDate: string | null;
  height: number | null;
  currentWeight: number | null;
  desiredWeight: number | null;
  goal: string;
};

type ClientPortalMeasurement = {
  id: string;
  measuredAt: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  bodyFatPercent: number | null;
  notes: string;
};

type ClientPortalCalendarAssignment = {
  id: string;
  scheduledDate: string;
  note: string;
};

type ClientPortalWorkoutSet = {
  id: string;
  setNumber: number;
  weightKg: number | null;
  repetitions: number;
  intensity: WorkoutExerciseIntensity;
  notes: string;
};

type ClientPortalWorkoutExercise = {
  id: string;
  exerciseName: string;
  orderIndex: number;
  notes: string;
  sets: ClientPortalWorkoutSet[];
};

type ClientPortalWorkoutDay = {
  id: string;
  trainingDate: string;
  title: string;
  content: string;
  exercises: ClientPortalWorkoutExercise[];
};

type ClientPortalWorkoutProgram = {
  id: string;
  title: string;
  description: string;
  trainingDays: ClientPortalWorkoutDay[];
};

type NutritionProgramStatus = "draft" | "active" | "archived";

type NutritionMealType = "breakfast" | "lunch" | "dinner" | "snack";

type ClientPortalNutritionItem = {
  id: string;
  foodName: string;
  amountG: number;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  orderIndex: number;
};

type ClientPortalNutritionMeal = {
  id: string;
  mealType: NutritionMealType;
  name: string;
  mealTime: string;
  orderIndex: number;
  notes: string;
  items: ClientPortalNutritionItem[];
};

type ClientPortalNutritionProgram = {
  id: string;
  title: string;
  description: string;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetFatG: number | null;
  targetCarbsG: number | null;
  status: NutritionProgramStatus;
  meals: ClientPortalNutritionMeal[];
};

type ClientPortalData = {
  client: ClientPortalClient;
  trainer: {
    fullName: string;
  };
  measurements: ClientPortalMeasurement[];
  calendarAssignments: ClientPortalCalendarAssignment[];
  workoutPrograms: ClientPortalWorkoutProgram[];
  nutritionPrograms: ClientPortalNutritionProgram[];
};

type PortalTab = "overview" | "calendar" | "workouts" | "nutrition";

const missingSupabaseMessage =
  "Supabase не настроен. Проверьте переменные окружения проекта.";

const intensityLabels: Record<WorkoutExerciseIntensity, string> = {
  low: "Легкая",
  medium: "Средняя",
  high: "Высокая",
};

const intensityClasses: Record<WorkoutExerciseIntensity, string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
};

const mealTypeLabels: Record<NutritionMealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

const statusLabels: Record<NutritionProgramStatus, string> = {
  draft: "Черновик",
  active: "Активный",
  archived: "Архив",
};

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : numberFormatter.format(value);

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (dateKey: string | null | undefined) => {
  if (!dateKey) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
};

const getSetVolume = (exerciseSet: ClientPortalWorkoutSet) =>
  exerciseSet.weightKg === null
    ? null
    : exerciseSet.weightKg * exerciseSet.repetitions;

const getMealTotals = (meal: ClientPortalNutritionMeal) =>
  meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + (item.calories ?? 0),
      proteinG: totals.proteinG + (item.proteinG ?? 0),
      fatG: totals.fatG + (item.fatG ?? 0),
      carbsG: totals.carbsG + (item.carbsG ?? 0),
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

const getPlanTotals = (program: ClientPortalNutritionProgram) =>
  program.meals.reduce(
    (totals, meal) => {
      const mealTotals = getMealTotals(meal);

      return {
        calories: totals.calories + mealTotals.calories,
        proteinG: totals.proteinG + mealTotals.proteinG,
        fatG: totals.fatG + mealTotals.fatG,
        carbsG: totals.carbsG + mealTotals.carbsG,
      };
    },
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

const getInviteErrorMessage = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invitation not found")) {
    return "Ссылка приглашения не найдена или больше недействительна.";
  }

  if (normalizedMessage.includes("invitation expired")) {
    return "Срок действия ссылки истек. Попросите тренера создать новую ссылку.";
  }

  if (normalizedMessage.includes("client is not linked")) {
    return "Ссылка не привязана к карточке клиента. Попросите тренера создать ссылку из карточки клиента.";
  }

  return "Не удалось открыть клиентский доступ. Попробуйте еще раз или попросите тренера создать новую ссылку.";
};

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-5 text-sm text-[var(--text-muted)]">
      {text}
    </p>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-[var(--text)]">
        {formatNumber(value)}
        {value !== null && value !== undefined && (
          <span className="ml-1 text-sm font-semibold text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClientPortal = async () => {
      if (!token) {
        setErrorMessage("Откройте полную ссылку приглашения от тренера.");
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase.rpc("get_client_portal", {
        p_token: token,
      });

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setErrorMessage(getInviteErrorMessage(error?.message ?? ""));
        setPortalData(null);
      } else {
        setErrorMessage(null);
        setPortalData(data as ClientPortalData);
      }

      setIsLoading(false);
    };

    loadClientPortal();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const upcomingAssignments = useMemo(() => {
    if (!portalData) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return portalData.calendarAssignments.filter(
      (assignment) => parseDateKey(assignment.scheduledDate) >= today,
    );
  }, [portalData]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5 text-center shadow-sm">
          <LogoMark alt="Tempo" className="mx-auto h-12 w-12" />
          <p className="mt-4 text-sm font-semibold text-[var(--text)]">
            Открываем клиентский доступ...
          </p>
        </section>
      </main>
    );
  }

  if (errorMessage || !portalData) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <section className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-xl sm:p-8">
          <LogoMark alt="Tempo" className="mx-auto h-14 w-14" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--text)]">
            Доступ не открыт
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {errorMessage}
          </p>
          <Link
            to="/auth"
            className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)]"
          >
            Перейти ко входу тренера
          </Link>
        </section>
      </main>
    );
  }

  const { client } = portalData;
  const latestMeasurement = portalData.measurements[0];
  const tabs: { value: PortalTab; label: string }[] = [
    { value: "overview", label: "Профиль" },
    { value: "calendar", label: "Расписание" },
    { value: "workouts", label: "Тренировки" },
    { value: "nutrition", label: "Питание" },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <LogoMark alt="Tempo" className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                  Клиентский доступ
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-[var(--text)] sm:text-3xl">
                  {client.firstName} {client.secondName}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Тренер: {portalData.trainer.fullName || "Tempo"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 lg:max-w-md">
              Это персональная ссылка доступа. Не пересылайте её другим людям:
              по ней видны расписание, программы, питание и замеры.
            </div>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-soft)] p-1 sm:flex">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  "focus-ring min-h-10 rounded-md px-3 py-2 text-sm font-semibold transition sm:min-w-32",
                  activeTab === tab.value
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === "overview" && (
          <section className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Рост" value={client.height} unit="см" />
              <MetricCard
                label="Текущий вес"
                value={client.currentWeight}
                unit="кг"
              />
              <MetricCard
                label="Желаемый вес"
                value={client.desiredWeight}
                unit="кг"
              />
              <MetricCard
                label="Процент жира"
                value={latestMeasurement?.bodyFatPercent}
                unit="%"
              />
            </div>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[var(--text)]">Профиль</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--surface-soft)] p-4">
                  <dt className="font-semibold text-[var(--text-muted)]">
                    Дата рождения
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--text)]">
                    {formatDisplayDate(client.birthDate)}
                  </dd>
                </div>
                <div className="rounded-lg bg-[var(--surface-soft)] p-4">
                  <dt className="font-semibold text-[var(--text-muted)]">
                    Цель
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--text)]">
                    {client.goal || "Пока не указана"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-[var(--text)]">
                  Замеры
                </h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {portalData.measurements.length}
                </span>
              </div>

              {portalData.measurements.length === 0 ? (
                <div className="mt-4">
                  <EmptyState text="Тренер пока не добавил замеры." />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {portalData.measurements.map((measurement) => (
                    <article
                      key={measurement.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                    >
                      <p className="font-bold text-[var(--text)]">
                        {formatDisplayDate(measurement.measuredAt)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <MetricCard
                          label="Вес"
                          value={measurement.weightKg}
                          unit="кг"
                        />
                        <MetricCard
                          label="Талия"
                          value={measurement.waistCm}
                          unit="см"
                        />
                        <MetricCard
                          label="Бедра"
                          value={measurement.hipsCm}
                          unit="см"
                        />
                        <MetricCard
                          label="Жир"
                          value={measurement.bodyFatPercent}
                          unit="%"
                        />
                      </div>
                      {measurement.notes && (
                        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                          {measurement.notes}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === "calendar" && (
          <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]">
                Расписание тренировок
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {upcomingAssignments.length} впереди
              </span>
            </div>

            {portalData.calendarAssignments.length === 0 ? (
              <div className="mt-4">
                <EmptyState text="В расписании пока нет назначений." />
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {portalData.calendarAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                  >
                    <p className="font-bold text-[var(--text)]">
                      {formatDisplayDate(assignment.scheduledDate)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {assignment.note || "Тренировка назначена"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "workouts" && (
          <section className="mt-6 space-y-4">
            {portalData.workoutPrograms.length === 0 ? (
              <EmptyState text="Тренер пока не добавил программу тренировок." />
            ) : (
              portalData.workoutPrograms.map((program) => (
                <article
                  key={program.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                >
                  <h2 className="text-xl font-bold text-[var(--text)]">
                    {program.title}
                  </h2>
                  {program.description && (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {program.description}
                    </p>
                  )}

                  {program.trainingDays.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState text="В этой программе пока нет тренировочных дней." />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {program.trainingDays.map((trainingDay) => (
                        <section
                          key={trainingDay.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                        >
                          <p className="text-sm font-semibold capitalize text-[var(--teal)]">
                            {formatDisplayDate(trainingDay.trainingDate)}
                          </p>
                          <h3 className="mt-1 font-bold text-[var(--text)]">
                            {trainingDay.title}
                          </h3>
                          {trainingDay.content && (
                            <p className="mt-3 whitespace-pre-line rounded-lg bg-white p-3 text-sm leading-6 text-[var(--text)]">
                              {trainingDay.content}
                            </p>
                          )}

                          <div className="mt-3 space-y-3">
                            {trainingDay.exercises.map((exercise) => (
                              <article
                                key={exercise.id}
                                className="rounded-lg bg-white p-4"
                              >
                                <h4 className="font-bold text-[var(--text)]">
                                  {exercise.exerciseName}
                                </h4>
                                {exercise.notes && (
                                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                    {exercise.notes}
                                  </p>
                                )}

                                <div className="mt-3 space-y-2">
                                  {exercise.sets.map((exerciseSet) => {
                                    const setVolume =
                                      getSetVolume(exerciseSet);

                                    return (
                                      <div
                                        key={exerciseSet.id}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                          <p className="font-semibold text-[var(--text)]">
                                            Подход {exerciseSet.setNumber}
                                          </p>
                                          <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${intensityClasses[exerciseSet.intensity]}`}
                                          >
                                            {
                                              intensityLabels[
                                                exerciseSet.intensity
                                              ]
                                            }
                                          </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                          <div>
                                            <p className="text-[var(--text-muted)]">
                                              Вес
                                            </p>
                                            <p className="font-bold">
                                              {formatNumber(
                                                exerciseSet.weightKg,
                                              )}{" "}
                                              кг
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[var(--text-muted)]">
                                              Повторы
                                            </p>
                                            <p className="font-bold">
                                              {exerciseSet.repetitions}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[var(--text-muted)]">
                                              Тоннаж
                                            </p>
                                            <p className="font-bold">
                                              {setVolume === null
                                                ? "—"
                                                : `${formatNumber(setVolume)} кг`}
                                            </p>
                                          </div>
                                        </div>
                                        {exerciseSet.notes && (
                                          <p className="mt-2 text-sm text-[var(--text-muted)]">
                                            {exerciseSet.notes}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "nutrition" && (
          <section className="mt-6 space-y-4">
            {portalData.nutritionPrograms.length === 0 ? (
              <EmptyState text="Тренер пока не добавил план питания." />
            ) : (
              portalData.nutritionPrograms.map((program) => {
                const totals = getPlanTotals(program);

                return (
                  <article
                    key={program.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {statusLabels[program.status]}
                        </span>
                        <h2 className="mt-3 text-xl font-bold text-[var(--text)]">
                          {program.title}
                        </h2>
                        {program.description && (
                          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                            {program.description}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-[var(--surface-tint)] px-4 py-3 text-sm font-semibold text-[var(--teal)]">
                        Итого: {formatNumber(totals.calories)} ккал
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <MetricCard
                        label="Калории"
                        value={totals.calories}
                        unit="ккал"
                      />
                      <MetricCard
                        label="Белки"
                        value={totals.proteinG}
                        unit="г"
                      />
                      <MetricCard label="Жиры" value={totals.fatG} unit="г" />
                      <MetricCard
                        label="Углеводы"
                        value={totals.carbsG}
                        unit="г"
                      />
                    </div>

                    {program.meals.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState text="В этом плане пока нет приемов пищи." />
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {program.meals.map((meal) => {
                          const mealTotals = getMealTotals(meal);

                          return (
                            <article
                              key={meal.id}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--accent)]">
                                    {mealTypeLabels[meal.mealType]}
                                  </span>
                                  <h3 className="mt-3 font-bold text-[var(--text)]">
                                    {meal.name}
                                  </h3>
                                  {meal.mealTime && (
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                                      {meal.mealTime}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">
                                  {formatNumber(mealTotals.calories)} ккал
                                </p>
                              </div>
                              {meal.notes && (
                                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                                  {meal.notes}
                                </p>
                              )}

                              {meal.items.length > 0 && (
                                <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
                                  <table className="w-full min-w-[620px] text-left text-sm">
                                    <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                      <tr>
                                        <th className="px-3 py-3 font-bold">
                                          Продукт
                                        </th>
                                        <th className="px-3 py-3 font-bold">
                                          Граммы
                                        </th>
                                        <th className="px-3 py-3 font-bold">
                                          Ккал
                                        </th>
                                        <th className="px-3 py-3 font-bold">
                                          Б
                                        </th>
                                        <th className="px-3 py-3 font-bold">
                                          Ж
                                        </th>
                                        <th className="px-3 py-3 font-bold">
                                          У
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                      {meal.items.map((item) => (
                                        <tr key={item.id}>
                                          <td className="px-3 py-3 font-semibold text-[var(--text)]">
                                            {item.foodName}
                                          </td>
                                          <td className="px-3 py-3 text-[var(--text-muted)]">
                                            {formatNumber(item.amountG)} г
                                          </td>
                                          <td className="px-3 py-3 text-[var(--text-muted)]">
                                            {formatNumber(item.calories)}
                                          </td>
                                          <td className="px-3 py-3 text-[var(--text-muted)]">
                                            {formatNumber(item.proteinG)}
                                          </td>
                                          <td className="px-3 py-3 text-[var(--text-muted)]">
                                            {formatNumber(item.fatG)}
                                          </td>
                                          <td className="px-3 py-3 text-[var(--text-muted)]">
                                            {formatNumber(item.carbsG)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default InvitePage;
