import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type CalendarAssignmentRow,
  type ClientRow,
  type NewWorkoutExerciseSetRow,
  type NewWorkoutProgramRow,
  type NewWorkoutTrainingExerciseRow,
  type NewWorkoutTrainingDayRow,
  type WorkoutExerciseSetRow,
  type WorkoutExerciseIntensity,
  type WorkoutProgramRow,
  type WorkoutTrainingExerciseRow,
  type WorkoutTrainingDayRow,
} from "../lib/supabase";

type WorkoutClient = {
  id: string;
  firstName: string;
  secondName: string;
};

type WorkoutProgram = {
  id: string;
  clientId: string;
  title: string;
  description: string;
};

type WorkoutTrainingDay = {
  id: string;
  programId: string;
  trainingDate: string;
  title: string;
  content: string;
  exercises: WorkoutTrainingExercise[];
};

type WorkoutTrainingExercise = {
  id: string;
  trainingDayId: string;
  exerciseName: string;
  orderIndex: number;
  notes: string;
  sets: WorkoutExerciseSet[];
};

type WorkoutExerciseSet = {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  repetitions: number;
  intensity: WorkoutExerciseIntensity;
  notes: string;
};

type WorkoutExerciseDraft = {
  id: string;
  exerciseName: string;
  notes: string;
  sets: WorkoutSetDraft[];
};

type WorkoutSetDraft = {
  id: string;
  weightKg: string;
  repetitions: string;
  intensity: WorkoutExerciseIntensity;
  notes: string;
};

type NormalizedExerciseDraft = {
  draftId: string;
  exerciseName: string;
  orderIndex: number;
  notes: string | null;
  sets: Omit<NewWorkoutExerciseSetRow, "exercise_id">[];
};

type ScheduledTrainingDay = {
  id: string;
  scheduledDate: string;
  note: string;
};

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const intensityLabels: Record<WorkoutExerciseIntensity, string> = {
  low: "Легкая",
  medium: "Средняя",
  high: "Высокая",
};

const intensityBadgeClasses: Record<WorkoutExerciseIntensity, string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
};

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

const metricNumberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const formatMetricNumber = (value: number) =>
  metricNumberFormatter.format(value);

const getSetVolume = (exerciseSet: WorkoutExerciseSet) =>
  exerciseSet.weightKg === null
    ? null
    : exerciseSet.weightKg * exerciseSet.repetitions;

const getExerciseVolume = (exercise: WorkoutTrainingExercise) =>
  exercise.sets.reduce((total, exerciseSet) => {
    const setVolume = getSetVolume(exerciseSet);

    return total + (setVolume ?? 0);
  }, 0);

const createDraftId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const mapClientRow = (row: ClientRow): WorkoutClient => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
});

const mapProgramRow = (row: WorkoutProgramRow): WorkoutProgram => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  description: row.description ?? "",
});

const mapTrainingDayRow = (
  row: WorkoutTrainingDayRow,
): WorkoutTrainingDay => ({
  id: row.id,
  programId: row.program_id,
  trainingDate: row.training_date,
  title: row.title,
  content: row.content,
  exercises: [],
});

const mapExerciseRow = (
  row: WorkoutTrainingExerciseRow,
): WorkoutTrainingExercise => ({
  id: row.id,
  trainingDayId: row.training_day_id,
  exerciseName: row.exercise_name,
  orderIndex: row.order_index,
  notes: row.notes ?? "",
  sets: [],
});

const mapSetRow = (row: WorkoutExerciseSetRow): WorkoutExerciseSet => ({
  id: row.id,
  exerciseId: row.exercise_id,
  setNumber: row.set_number,
  weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
  repetitions: row.repetitions,
  intensity: row.intensity,
  notes: row.notes ?? "",
});

const mapScheduledDayRow = (
  row: CalendarAssignmentRow,
): ScheduledTrainingDay => ({
  id: row.id,
  scheduledDate: row.scheduled_date,
  note: row.note ?? "",
});

const createSetDraft = (): WorkoutSetDraft => ({
  id: createDraftId(),
  weightKg: "",
  repetitions: "10",
  intensity: "medium",
  notes: "",
});

const createExerciseDraft = (): WorkoutExerciseDraft => ({
  id: createDraftId(),
  exerciseName: "",
  notes: "",
  sets: [createSetDraft()],
});

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function WorkoutPatterns() {
  const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
  const [clients, setClients] = useState<WorkoutClient[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [trainingDays, setTrainingDays] = useState<WorkoutTrainingDay[]>([]);
  const [scheduledDays, setScheduledDays] = useState<ScheduledTrainingDay[]>(
    [],
  );
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [dayDate, setDayDate] = useState(todayDateKey);
  const [dayTitle, setDayTitle] = useState("");
  const [dayContent, setDayContent] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<WorkoutExerciseDraft[]>(
    () => [createExerciseDraft()],
  );
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isProgramDataLoading, setIsProgramDataLoading] = useState(false);
  const [isProgramSaving, setIsProgramSaving] = useState(false);
  const [isDaySaving, setIsDaySaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsClientsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("first_name", { ascending: true })
        .order("second_name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не удалось загрузить клиентов из Supabase.");
        setClients([]);
      } else {
        const nextClients = ((data ?? []) as ClientRow[]).map(mapClientRow);

        setErrorMessage(null);
        setClients(nextClients);
        setSelectedClientId((currentClientId) =>
          currentClientId &&
          nextClients.some((client) => client.id === currentClientId)
            ? currentClientId
            : nextClients[0]?.id ?? "",
        );
      }

      setIsClientsLoading(false);
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadClientWorkoutData = async () => {
      if (!selectedClientId) {
        setPrograms([]);
        setTrainingDays([]);
        setScheduledDays([]);
        setSelectedProgramId("");
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        return;
      }

      setIsProgramDataLoading(true);

      const [programsResponse, scheduledDaysResponse] = await Promise.all([
        supabase
          .from("workout_programs")
          .select("*")
          .eq("client_id", selectedClientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("calendar_assignments")
          .select("*")
          .eq("client_id", selectedClientId)
          .gte("scheduled_date", todayDateKey)
          .order("scheduled_date", { ascending: true })
          .limit(12),
      ]);

      if (!isMounted) {
        return;
      }

      if (programsResponse.error || scheduledDaysResponse.error) {
        setErrorMessage("Не удалось загрузить программы тренировок.");
        setPrograms([]);
        setScheduledDays([]);
      } else {
        const nextPrograms = (
          (programsResponse.data ?? []) as WorkoutProgramRow[]
        ).map(mapProgramRow);

        setErrorMessage(null);
        setPrograms(nextPrograms);
        setScheduledDays(
          ((scheduledDaysResponse.data ?? []) as CalendarAssignmentRow[]).map(
            mapScheduledDayRow,
          ),
        );
        setSelectedProgramId((currentProgramId) =>
          currentProgramId &&
          nextPrograms.some((program) => program.id === currentProgramId)
            ? currentProgramId
            : nextPrograms[0]?.id ?? "",
        );
      }

      setIsProgramDataLoading(false);
    };

    loadClientWorkoutData();

    return () => {
      isMounted = false;
    };
  }, [selectedClientId, todayDateKey]);

  useEffect(() => {
    let isMounted = true;

    const loadTrainingDays = async () => {
      if (!selectedProgramId) {
        setTrainingDays([]);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        return;
      }

      const { data, error } = await supabase
        .from("workout_training_days")
        .select("*")
        .eq("program_id", selectedProgramId)
        .order("training_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не удалось загрузить тренировочные дни программы.");
        setTrainingDays([]);
      } else {
        const dayRows = (data ?? []) as WorkoutTrainingDayRow[];

        if (dayRows.length === 0) {
          setErrorMessage(null);
          setTrainingDays([]);
          return;
        }

        const { data: exerciseData, error: exerciseError } = await supabase
          .from("workout_training_exercises")
          .select("*")
          .in(
            "training_day_id",
            dayRows.map((row) => row.id),
          )
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        if (!isMounted) {
          return;
        }

        if (exerciseError) {
          setErrorMessage("Не удалось загрузить упражнения программы.");
          setTrainingDays(dayRows.map(mapTrainingDayRow));
          return;
        }

        const exerciseRows = (exerciseData ?? []) as WorkoutTrainingExerciseRow[];

        if (exerciseRows.length === 0) {
          setErrorMessage(null);
          setTrainingDays(dayRows.map(mapTrainingDayRow));
          return;
        }

        const { data: setData, error: setError } = await supabase
          .from("workout_exercise_sets")
          .select("*")
          .in(
            "exercise_id",
            exerciseRows.map((row) => row.id),
          )
          .order("set_number", { ascending: true })
          .order("created_at", { ascending: true });

        if (!isMounted) {
          return;
        }

        if (setError) {
          setErrorMessage("Не удалось загрузить подходы программы.");
          setTrainingDays(
            dayRows.map((row) => ({
              ...mapTrainingDayRow(row),
              exercises: exerciseRows
                .filter((exercise) => exercise.training_day_id === row.id)
                .map(mapExerciseRow),
            })),
          );
          return;
        }

        const setsByExerciseId = (
          (setData ?? []) as WorkoutExerciseSetRow[]
        ).reduce<Map<string, WorkoutExerciseSet[]>>((accumulator, row) => {
          const exerciseSet = mapSetRow(row);
          const currentSets = accumulator.get(exerciseSet.exerciseId) ?? [];

          accumulator.set(exerciseSet.exerciseId, [
            ...currentSets,
            exerciseSet,
          ]);

          return accumulator;
        }, new Map());

        const exercisesByDayId = exerciseRows.reduce<
          Map<string, WorkoutTrainingExercise[]>
        >((accumulator, row) => {
          const exercise = mapExerciseRow(row);
          const currentExercises = accumulator.get(exercise.trainingDayId) ?? [];

          accumulator.set(exercise.trainingDayId, [
            ...currentExercises,
            {
              ...exercise,
              sets: setsByExerciseId.get(exercise.id) ?? [],
            },
          ]);

          return accumulator;
        }, new Map());

        setErrorMessage(null);
        setTrainingDays(
          dayRows.map((row) => ({
            ...mapTrainingDayRow(row),
            exercises: exercisesByDayId.get(row.id) ?? [],
          })),
        );
      }
    };

    loadTrainingDays();

    return () => {
      isMounted = false;
    };
  }, [selectedProgramId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedProgram = programs.find(
    (program) => program.id === selectedProgramId,
  );

  const handleCreateProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    if (!selectedClientId) {
      setErrorMessage("Сначала выберите клиента.");
      return;
    }

    const payload: NewWorkoutProgramRow = {
      client_id: selectedClientId,
      title: programTitle.trim(),
      description: programDescription.trim() || null,
    };

    setIsProgramSaving(true);

    const { data, error } = await supabase
      .from("workout_programs")
      .insert(payload)
      .select()
      .single();

    setIsProgramSaving(false);

    if (error || !data) {
      setErrorMessage("Не удалось создать программу тренировок.");
      return;
    }

    const createdProgram = mapProgramRow(data as WorkoutProgramRow);

    setErrorMessage(null);
    setPrograms((currentPrograms) => [createdProgram, ...currentPrograms]);
    setSelectedProgramId(createdProgram.id);
    setProgramTitle("");
    setProgramDescription("");
  };

  const handleDeleteProgram = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase
      .from("workout_programs")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить программу тренировок.");
      return;
    }

    setErrorMessage(null);
    setPrograms((currentPrograms) =>
      currentPrograms.filter((program) => program.id !== id),
    );

    if (selectedProgramId === id) {
      const nextSelectedProgram = programs.find((program) => program.id !== id);
      setSelectedProgramId(nextSelectedProgram?.id ?? "");
    }
  };

  const handleExerciseDraftChange = (
    id: string,
    field: "exerciseName" | "notes",
    value: string,
  ) => {
    setExerciseDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const handleAddExerciseDraft = () => {
    setExerciseDrafts((currentDrafts) => [
      ...currentDrafts,
      createExerciseDraft(),
    ]);
  };

  const handleRemoveExerciseDraft = (id: string) => {
    setExerciseDrafts((currentDrafts) =>
      currentDrafts.length === 1
        ? currentDrafts
        : currentDrafts.filter((draft) => draft.id !== id),
    );
  };

  const handleAddSetDraft = (exerciseId: string) => {
    setExerciseDrafts((currentDrafts) =>
      currentDrafts.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [...exercise.sets, createSetDraft()],
            }
          : exercise,
      ),
    );
  };

  const handleRemoveSetDraft = (exerciseId: string, setId: string) => {
    setExerciseDrafts((currentDrafts) =>
      currentDrafts.map((exercise) =>
        exercise.id === exerciseId && exercise.sets.length > 1
          ? {
              ...exercise,
              sets: exercise.sets.filter((set) => set.id !== setId),
            }
          : exercise,
      ),
    );
  };

  const handleSetDraftChange = (
    exerciseId: string,
    setId: string,
    field: keyof Omit<WorkoutSetDraft, "id">,
    value: string,
  ) => {
    setExerciseDrafts((currentDrafts) =>
      currentDrafts.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  const buildExercisePayloads = (): NormalizedExerciseDraft[] | null => {
    const normalizedDrafts = exerciseDrafts.map((draft, exerciseIndex) => ({
      draft,
      exerciseIndex,
      sets: draft.sets.map((set, setIndex) => {
        const weightText = set.weightKg.trim().replace(",", ".");
        const weightKg = weightText === "" ? null : Number(weightText);
        const repetitions = Number(set.repetitions);

        return {
          repetitions,
          set,
          setIndex,
          weightKg,
        };
      }),
    }));

    const hasInvalidExercise = normalizedDrafts.some(
      ({ draft, sets }) =>
        !draft.exerciseName.trim() ||
        sets.some(
          ({ repetitions, weightKg }) =>
            (weightKg !== null &&
              (!Number.isFinite(weightKg) || weightKg < 0)) ||
            !Number.isInteger(repetitions) ||
            repetitions <= 0,
        ),
    );

    if (hasInvalidExercise) {
      setErrorMessage(
        "Проверьте подходы: название упражнения и повторы обязательны, вес не может быть отрицательным.",
      );
      return null;
    }

    return normalizedDrafts.map(({ draft, exerciseIndex, sets }) => ({
      draftId: draft.id,
      exerciseName: draft.exerciseName.trim(),
      orderIndex: exerciseIndex,
      notes: draft.notes.trim() || null,
      sets: sets.map(({ repetitions, set, setIndex, weightKg }) => ({
        set_number: setIndex + 1,
        weight_kg: weightKg,
        repetitions,
        intensity: set.intensity,
        notes: set.notes.trim() || null,
      })),
    }));
  };

  const handleCreateTrainingDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    if (!selectedProgramId) {
      setErrorMessage("Сначала создайте или выберите программу.");
      return;
    }

    const normalizedExercises = buildExercisePayloads();

    if (!normalizedExercises) {
      return;
    }

    const payload: NewWorkoutTrainingDayRow = {
      program_id: selectedProgramId,
      training_date: dayDate,
      title: dayTitle.trim(),
      content: dayContent.trim(),
    };

    setIsDaySaving(true);

    const { data, error } = await supabase
      .from("workout_training_days")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      setIsDaySaving(false);
      setErrorMessage(
        error?.code === "23505"
          ? "В этой программе уже есть план на выбранный день."
          : "Не удалось добавить тренировочный день.",
      );
      return;
    }

    const createdTrainingDay = mapTrainingDayRow(data as WorkoutTrainingDayRow);
    const exercisePayloads: NewWorkoutTrainingExerciseRow[] =
      normalizedExercises.map((exercise) => ({
        training_day_id: createdTrainingDay.id,
        exercise_name: exercise.exerciseName,
        order_index: exercise.orderIndex,
        notes: exercise.notes,
      }));

    const { data: exerciseData, error: exerciseError } = await supabase
      .from("workout_training_exercises")
      .insert(exercisePayloads)
      .select();

    if (exerciseError || !exerciseData) {
      await supabase
        .from("workout_training_days")
        .delete()
        .eq("id", createdTrainingDay.id);

      setIsDaySaving(false);
      setErrorMessage("Не удалось сохранить упражнения тренировки.");
      return;
    }

    const exerciseRows = exerciseData as WorkoutTrainingExerciseRow[];
    const exerciseRowsByOrderIndex = new Map(
      exerciseRows.map((exercise) => [exercise.order_index, exercise]),
    );
    const setPayloads: NewWorkoutExerciseSetRow[] = normalizedExercises.flatMap(
      (exercise) => {
        const exerciseRow = exerciseRowsByOrderIndex.get(exercise.orderIndex);

        if (!exerciseRow) {
          return [];
        }

        return exercise.sets.map((exerciseSet) => ({
          ...exerciseSet,
          exercise_id: exerciseRow.id,
        }));
      },
    );
    const expectedSetCount = normalizedExercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    );

    if (setPayloads.length !== expectedSetCount) {
      await supabase
        .from("workout_training_days")
        .delete()
        .eq("id", createdTrainingDay.id);

      setIsDaySaving(false);
      setErrorMessage("Не удалось связать подходы с упражнениями.");
      return;
    }

    const { data: setData, error: setError } = await supabase
      .from("workout_exercise_sets")
      .insert(setPayloads)
      .select();

    if (setError || !setData) {
      await supabase
        .from("workout_training_days")
        .delete()
        .eq("id", createdTrainingDay.id);

      setIsDaySaving(false);
      setErrorMessage("Не удалось сохранить подходы тренировки.");
      return;
    }

    const setsByExerciseId = ((setData ?? []) as WorkoutExerciseSetRow[]).reduce<
      Map<string, WorkoutExerciseSet[]>
    >((accumulator, row) => {
      const exerciseSet = mapSetRow(row);
      const currentSets = accumulator.get(exerciseSet.exerciseId) ?? [];

      accumulator.set(exerciseSet.exerciseId, [...currentSets, exerciseSet]);

      return accumulator;
    }, new Map());

    const createdExercises = exerciseRows.map((exerciseRow) => ({
      ...mapExerciseRow(exerciseRow),
      sets: setsByExerciseId.get(exerciseRow.id) ?? [],
    }));

    setErrorMessage(null);
    setIsDaySaving(false);
    setTrainingDays((currentDays) =>
      [
        ...currentDays,
        {
          ...createdTrainingDay,
          exercises: createdExercises,
        },
      ].sort((firstDay, secondDay) =>
        firstDay.trainingDate.localeCompare(secondDay.trainingDate),
      ),
    );
    setDayTitle("");
    setDayContent("");
    setExerciseDrafts([createExerciseDraft()]);
  };

  const handleDeleteTrainingDay = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase
      .from("workout_training_days")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить тренировочный день.");
      return;
    }

    setErrorMessage(null);
    setTrainingDays((currentDays) =>
      currentDays.filter((trainingDay) => trainingDay.id !== id),
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Тренировки
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Программы тренировок
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Создавайте программы под конкретного клиента и расписывайте план для
          каждого отдельного тренировочного дня.
        </p>
      </div>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <label className="block max-w-xl">
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
                  {client.firstName} {client.secondName}
                </option>
              ))
            )}
          </select>
        </label>

        {isClientsLoading && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Загружаем клиентов...
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5">
          <form
            onSubmit={handleCreateProgram}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-[var(--text)]">
              Новая программа
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {selectedClient
                ? `Для клиента ${selectedClient.firstName} ${selectedClient.secondName}`
                : "Выберите клиента, чтобы создать программу."}
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Название
              </span>
              <input
                type="text"
                required
                value={programTitle}
                onChange={(event) => setProgramTitle(event.target.value)}
                placeholder="Например: Силовой блок на 4 недели"
                className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Описание
              </span>
              <textarea
                value={programDescription}
                onChange={(event) => setProgramDescription(event.target.value)}
                placeholder="Цель программы, ограничения, общий фокус..."
                className="focus-ring min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <button
              type="submit"
              disabled={isProgramSaving || !selectedClientId}
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon />
              {isProgramSaving ? "Создаем..." : "Создать программу"}
            </button>
          </form>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Программы клиента
            </h2>

            {isProgramDataLoading ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Загружаем программы...
              </p>
            ) : programs.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
                У выбранного клиента пока нет программ тренировок.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {programs.map((program) => (
                  <li key={program.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedProgramId(program.id)}
                      className={[
                        "focus-ring w-full rounded-lg border p-4 text-left transition",
                        selectedProgramId === program.id
                          ? "border-[var(--accent)] bg-blue-50"
                          : "border-[var(--border)] hover:border-[var(--accent)]",
                      ].join(" ")}
                    >
                      <span className="block font-bold text-[var(--text)]">
                        {program.title}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--text-muted)]">
                        {program.description || "Без описания"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  Выбранная программа
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
                  {selectedProgram?.title ?? "Программа не выбрана"}
                </h2>
                {selectedProgram?.description && (
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {selectedProgram.description}
                  </p>
                )}
              </div>

              {selectedProgram && (
                <button
                  type="button"
                  onClick={() => handleDeleteProgram(selectedProgram.id)}
                  className="focus-ring min-h-10 rounded-lg border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Удалить программу
                </button>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text)]">
              План на тренировочный день
            </h2>

            {scheduledDays.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">
                  Ближайшие дни клиента из календаря
                </p>
                <div className="flex flex-wrap gap-2">
                  {scheduledDays.map((scheduledDay) => (
                    <button
                      key={scheduledDay.id}
                      type="button"
                      onClick={() => setDayDate(scheduledDay.scheduledDate)}
                      className="focus-ring rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {formatDisplayDate(scheduledDay.scheduledDate)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateTrainingDay} className="mt-5 grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="block min-w-0">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                    Дата тренировки
                  </span>
                  <input
                    type="date"
                    required
                    value={dayDate}
                    onChange={(event) => setDayDate(event.target.value)}
                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                    Название дня
                  </span>
                  <input
                    type="text"
                    required
                    value={dayTitle}
                    onChange={(event) => setDayTitle(event.target.value)}
                    placeholder="Например: День ног"
                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Общие заметки к дню
                </span>
                <textarea
                  value={dayContent}
                  onChange={(event) => setDayContent(event.target.value)}
                  placeholder="Разминка, техника, ограничения, отдых..."
                  className="focus-ring min-h-28 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <div className="rounded-lg border border-[var(--border)] bg-white/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text)]">
                      Силовые метрики
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Вес, подходы, повторы и интенсивность сохраняются отдельно
                      для аналитики.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExerciseDraft}
                    className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <PlusIcon />
                    Упражнение
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {exerciseDrafts.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-bold text-[var(--text)]">
                          Упражнение {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseDraft(exercise.id)}
                          disabled={exerciseDrafts.length === 1}
                          className="focus-ring min-h-9 rounded-lg border border-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Название
                          </span>
                          <input
                            type="text"
                            required
                            value={exercise.exerciseName}
                            onChange={(event) =>
                              handleExerciseDraftChange(
                                exercise.id,
                                "exerciseName",
                                event.target.value,
                              )
                            }
                            placeholder="Жим лежа"
                            className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                          />
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Заметка к упражнению
                          </span>
                          <input
                            type="text"
                            value={exercise.notes}
                            onChange={(event) =>
                              handleExerciseDraftChange(
                                exercise.id,
                                "notes",
                                event.target.value,
                              )
                            }
                            placeholder="Техника, темп, ограничение..."
                            className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                          />
                        </label>
                      </div>

                      <div className="mt-4 rounded-lg border border-[var(--border)] bg-white/70 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold text-[var(--text)]">
                            Подходы
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAddSetDraft(exercise.id)}
                            className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            <PlusIcon />
                            Подход
                          </button>
                        </div>

                        <div className="mt-3 space-y-3">
                          {exercise.sets.map((exerciseSet, setIndex) => (
                            <div
                              key={exerciseSet.id}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                            >
                              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-[var(--text)]">
                                  Подход {setIndex + 1}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveSetDraft(
                                      exercise.id,
                                      exerciseSet.id,
                                    )
                                  }
                                  disabled={exercise.sets.length === 1}
                                  className="focus-ring min-h-9 rounded-lg border border-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Удалить подход
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(80px,0.7fr)_minmax(80px,0.7fr)_minmax(130px,0.9fr)_minmax(160px,1.2fr)]">
                                <label className="block min-w-0">
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                    Вес, кг
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={exerciseSet.weightKg}
                                    onChange={(event) =>
                                      handleSetDraftChange(
                                        exercise.id,
                                        exerciseSet.id,
                                        "weightKg",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="60"
                                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                  />
                                </label>

                                <label className="block min-w-0">
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                    Повторы
                                  </span>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    step="1"
                                    value={exerciseSet.repetitions}
                                    onChange={(event) =>
                                      handleSetDraftChange(
                                        exercise.id,
                                        exerciseSet.id,
                                        "repetitions",
                                        event.target.value,
                                      )
                                    }
                                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                  />
                                </label>

                                <label className="block min-w-0">
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                    Интенсивность
                                  </span>
                                  <select
                                    value={exerciseSet.intensity}
                                    onChange={(event) =>
                                      handleSetDraftChange(
                                        exercise.id,
                                        exerciseSet.id,
                                        "intensity",
                                        event.target
                                          .value as WorkoutExerciseIntensity,
                                      )
                                    }
                                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                  >
                                    <option value="low">Легкая</option>
                                    <option value="medium">Средняя</option>
                                    <option value="high">Высокая</option>
                                  </select>
                                </label>

                                <label className="block min-w-0">
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                    Заметка
                                  </span>
                                  <input
                                    type="text"
                                    value={exerciseSet.notes}
                                    onChange={(event) =>
                                      handleSetDraftChange(
                                        exercise.id,
                                        exerciseSet.id,
                                        "notes",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="RIR, темп..."
                                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isDaySaving || !selectedProgramId}
                className="focus-ring min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {isDaySaving ? "Добавляем..." : "Добавить тренировочный день"}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--text)]">
                Дни программы
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {trainingDays.length}
              </span>
            </div>

            {trainingDays.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
                У выбранной программы пока нет расписанных тренировочных дней.
              </p>
            ) : (
              <ul className="space-y-3">
                {trainingDays.map((trainingDay) => (
                  <li
                    key={trainingDay.id}
                    className="rounded-lg border border-[var(--border)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-[var(--teal)]">
                          {formatDisplayDate(trainingDay.trainingDate)}
                        </p>
                        <h3 className="mt-1 font-bold text-[var(--text)]">
                          {trainingDay.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTrainingDay(trainingDay.id)}
                        className="focus-ring min-h-10 rounded-lg border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Удалить
                      </button>
                    </div>

                    {trainingDay.content && (
                      <p className="mt-3 whitespace-pre-line rounded-lg bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--text)]">
                        {trainingDay.content}
                      </p>
                    )}

                    <div className="mt-3 space-y-2">
                      {trainingDay.exercises.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-3 text-sm text-[var(--text-muted)]">
                          Для этого дня пока нет отдельных силовых метрик.
                        </p>
                      ) : (
                        trainingDay.exercises.map((exercise) => {
                          const exerciseVolume = getExerciseVolume(exercise);

                          return (
                            <article
                              key={exercise.id}
                              className="rounded-lg bg-[var(--surface-soft)] p-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h4 className="font-bold text-[var(--text)]">
                                    {exercise.exerciseName}
                                  </h4>
                                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    Подходов: {exercise.sets.length}
                                  </p>
                                </div>

                                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                                  Объем:{" "}
                                  {exerciseVolume > 0
                                    ? `${formatMetricNumber(exerciseVolume)} кг`
                                    : "не указан"}
                                </span>
                              </div>

                              {exercise.notes && (
                                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                                  {exercise.notes}
                                </p>
                              )}

                              <div className="mt-3 space-y-2">
                                {exercise.sets.length === 0 ? (
                                  <p className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-3 text-sm text-[var(--text-muted)]">
                                    У упражнения пока нет подходов.
                                  </p>
                                ) : (
                                  exercise.sets.map((exerciseSet) => {
                                    const setVolume =
                                      getSetVolume(exerciseSet);

                                    return (
                                      <div
                                        key={exerciseSet.id}
                                        className="rounded-lg bg-white p-3"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                          <p className="font-semibold text-[var(--text)]">
                                            Подход {exerciseSet.setNumber}
                                          </p>
                                          <span
                                            className={[
                                              "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                                              intensityBadgeClasses[
                                                exerciseSet.intensity
                                              ],
                                            ].join(" ")}
                                          >
                                            {
                                              intensityLabels[
                                                exerciseSet.intensity
                                              ]
                                            }
                                          </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                          <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                              Вес
                                            </p>
                                            <p className="mt-1 font-bold text-[var(--text)]">
                                              {exerciseSet.weightKg === null
                                                ? "Не указан"
                                                : `${formatMetricNumber(
                                                    exerciseSet.weightKg,
                                                  )} кг`}
                                            </p>
                                          </div>

                                          <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                              Повторы
                                            </p>
                                            <p className="mt-1 font-bold text-[var(--text)]">
                                              {exerciseSet.repetitions}
                                            </p>
                                          </div>

                                          <div className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                              Объем
                                            </p>
                                            <p className="mt-1 font-bold text-[var(--text)]">
                                              {setVolume === null
                                                ? "Не указан"
                                                : `${formatMetricNumber(
                                                    setVolume,
                                                  )} кг`}
                                            </p>
                                          </div>
                                        </div>

                                        {exerciseSet.notes && (
                                          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                                            {exerciseSet.notes}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </section>
  );
}

export default WorkoutPatterns;
