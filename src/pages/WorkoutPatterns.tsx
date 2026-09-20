import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type CalendarAssignmentRow,
  type ClientRow,
  type NewWorkoutExerciseSetRow,
  type NewWorkoutProgramRow,
  type NewWorkoutTrainingDayRow,
  type WorkoutExerciseSetRow,
  type WorkoutExerciseIntensity,
  type WorkoutProgramRow,
  type WorkoutTrainingExerciseRow,
  type WorkoutTrainingDayRow,
} from "../lib/supabase";
import { useProfile } from "../context/ProfileContext";
import {
  getDraftStorageKey,
  readDraft,
  writeDraft,
} from "../lib/draftStorage";

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
  sets: (Omit<NewWorkoutExerciseSetRow, "exercise_id"> & {
    draftId: string;
  })[];
};

type ScheduledTrainingDay = {
  id: string;
  scheduledDate: string;
  note: string;
};

type WorkoutPageDraft = {
  selectedClientId: string;
  selectedProgramId: string;
  editingTrainingDayId: string | null;
  programTitle: string;
  programDescription: string;
  dayDate: string;
  dayTitle: string;
  dayContent: string;
  exerciseDrafts: WorkoutExerciseDraft[];
};

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

const metricNumberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const formatMetricNumber = (value: number) =>
  metricNumberFormatter.format(value);

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

const setPatternSearch = /\d+(?:[.,]\d+)?\s*(?:кг|kg)?\s*[xх×*]\s*\d+/i;

const normalizeWorkoutNumber = (value: string) =>
  Number(value.trim().replace(",", "."));

const stringifyWorkoutNumber = (value: number | null) =>
  value === null ? "" : String(value);

const createSetDraftFromValues = (
  weightKg: number | null,
  repetitions: number,
  notes = "",
): WorkoutSetDraft => ({
  id: createDraftId(),
  weightKg: stringifyWorkoutNumber(weightKg),
  repetitions: String(repetitions),
  intensity: "medium",
  notes,
});

const createRepeatedSetDrafts = (
  count: number,
  weightKg: number | null,
  repetitions: number,
  notes = "",
) =>
  Array.from({ length: Math.min(Math.max(Math.trunc(count), 1), 20) }, () =>
    createSetDraftFromValues(weightKg, repetitions, notes),
  );

const cleanWorkoutLine = (line: string) =>
  line
    .trim()
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^[A-Za-zА-Яа-я]\d+[.)]?\s+/, "")
    .trim();

const getTrailingSetNote = (segment: string, matchText: string) =>
  segment
    .slice(matchText.length)
    .replace(/^[\s,.;:—–-]+/, "")
    .trim();

const parseWorkoutSetSegment = (segment: string): WorkoutSetDraft[] => {
  const cleanSegment = segment.trim();

  if (!cleanSegment) {
    return [];
  }

  const tripleMatch = cleanSegment.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?\s*[xх×*]\s*(\d+)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)/i,
  );

  if (tripleMatch) {
    const firstValue = normalizeWorkoutNumber(tripleMatch[1]);
    const repetitions = Number(tripleMatch[2]);
    const thirdValue = normalizeWorkoutNumber(tripleMatch[3]);
    const trailingNote = getTrailingSetNote(cleanSegment, tripleMatch[0]);

    if (!Number.isFinite(firstValue) || !Number.isInteger(repetitions)) {
      return [];
    }

    if (firstValue <= 10 && thirdValue > 10 && Number.isInteger(firstValue)) {
      return createRepeatedSetDrafts(
        firstValue,
        thirdValue,
        repetitions,
        trailingNote,
      );
    }

    if (Number.isInteger(thirdValue)) {
      return createRepeatedSetDrafts(
        thirdValue,
        firstValue,
        repetitions,
        trailingNote,
      );
    }

    return [];
  }

  const setsRepsWeightMatch = cleanSegment.match(
    /^(\d+)\s*[xх×*]\s*(\d+)\s+(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?/i,
  );

  if (setsRepsWeightMatch) {
    const setCount = Number(setsRepsWeightMatch[1]);
    const repetitions = Number(setsRepsWeightMatch[2]);
    const weightKg = normalizeWorkoutNumber(setsRepsWeightMatch[3]);
    const trailingNote = getTrailingSetNote(
      cleanSegment,
      setsRepsWeightMatch[0],
    );

    if (
      Number.isInteger(setCount) &&
      Number.isInteger(repetitions) &&
      Number.isFinite(weightKg)
    ) {
      return createRepeatedSetDrafts(
        setCount,
        weightKg,
        repetitions,
        trailingNote,
      );
    }
  }

  const doubleMatch = cleanSegment.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?\s*[xх×*]\s*(\d+)/i,
  );

  if (!doubleMatch) {
    return [];
  }

  const firstValue = normalizeWorkoutNumber(doubleMatch[1]);
  const repetitions = Number(doubleMatch[2]);
  const trailingNote = getTrailingSetNote(cleanSegment, doubleMatch[0]);
  const hasWeightUnit = /\b(?:кг|kg)\b/i.test(cleanSegment);

  if (!Number.isFinite(firstValue) || !Number.isInteger(repetitions)) {
    return [];
  }

  if (firstValue <= 10 && !hasWeightUnit && Number.isInteger(firstValue)) {
    return createRepeatedSetDrafts(
      firstValue,
      null,
      repetitions,
      trailingNote,
    );
  }

  return [createSetDraftFromValues(firstValue, repetitions, trailingNote)];
};

const parseQuickWorkoutLine = (
  line: string,
): WorkoutExerciseDraft | null => {
  const cleanLine = cleanWorkoutLine(line);

  if (!cleanLine) {
    return null;
  }

  const [exercisePart, ...noteParts] = cleanLine.split("|");
  const patternIndex = exercisePart.search(setPatternSearch);

  if (patternIndex < 0) {
    return null;
  }

  const exerciseName = exercisePart
    .slice(0, patternIndex)
    .replace(/[\s:—–-]+$/, "")
    .trim();
  const setText = exercisePart.slice(patternIndex);
  const sets = setText
    .split(/[,;]+/)
    .flatMap(parseWorkoutSetSegment)
    .filter((set) => set.repetitions.trim());

  if (!exerciseName || sets.length === 0) {
    return null;
  }

  return {
    id: createDraftId(),
    exerciseName,
    notes: noteParts.join("|").trim(),
    sets,
  };
};

const parseQuickWorkoutText = (value: string): WorkoutExerciseDraft[] =>
  value
    .split(/\r?\n/)
    .map(parseQuickWorkoutLine)
    .filter((draft): draft is WorkoutExerciseDraft => Boolean(draft));

const formatDraftSetForText = (exerciseSet: WorkoutSetDraft) => {
  const weightText = exerciseSet.weightKg.trim();
  const repetitionsText = exerciseSet.repetitions.trim();
  const notesText = exerciseSet.notes.trim();
  const metricsText = weightText
    ? `${weightText}x${repetitionsText}`
    : repetitionsText;

  return notesText ? `${metricsText} ${notesText}` : metricsText;
};

const formatTrainingSetInline = (exerciseSet: WorkoutExerciseSet) => {
  const metricsText =
    exerciseSet.weightKg === null
      ? String(exerciseSet.repetitions)
      : `${formatMetricNumber(exerciseSet.weightKg)}х${
          exerciseSet.repetitions
        }`;
  const notesText = exerciseSet.notes.trim();

  return notesText ? `${metricsText} ${notesText}` : metricsText;
};

const formatTrainingExerciseInline = (
  exercise: WorkoutTrainingExercise,
) => {
  const setsText = exercise.sets.map(formatTrainingSetInline).join(" ");
  const notesText = exercise.notes.trim();

  return [exercise.exerciseName, setsText, notesText ? `| ${notesText}` : ""]
    .filter(Boolean)
    .join(" ");
};

const serializeExerciseDraftsToQuickText = (
  drafts: WorkoutExerciseDraft[],
) =>
  drafts
    .filter((draft) => draft.exerciseName.trim())
    .map((draft) => {
      const setsText = draft.sets.map(formatDraftSetForText).join(", ");
      const notesText = draft.notes.trim() ? ` | ${draft.notes.trim()}` : "";

      return `${draft.exerciseName.trim()} ${setsText}${notesText}`.trim();
    })
    .join("\n");

const hasMeaningfulExerciseDraft = (draft: WorkoutExerciseDraft) => {
  const hasExerciseName = draft.exerciseName.trim().length > 0;
  const hasSetData = draft.sets.some(
    (set) =>
      set.weightKg.trim() ||
      set.notes.trim() ||
      (set.repetitions.trim() && set.repetitions.trim() !== "10"),
  );

  return hasExerciseName || hasSetData || draft.notes.trim().length > 0;
};

const normalizeWorkoutExerciseDrafts = (
  value: unknown,
): WorkoutExerciseDraft[] => {
  if (!Array.isArray(value)) {
    return [createExerciseDraft()];
  }

  if (value.length === 0) {
    return [];
  }

  return value
    .map((draftValue) => {
      const draft = draftValue as Partial<WorkoutExerciseDraft>;
      const sets =
        Array.isArray(draft.sets) && draft.sets.length > 0
          ? draft.sets
          : [createSetDraft()];

      return {
        id: typeof draft.id === "string" ? draft.id : createDraftId(),
        exerciseName:
          typeof draft.exerciseName === "string" ? draft.exerciseName : "",
        notes: typeof draft.notes === "string" ? draft.notes : "",
        sets: sets.map((setValue) => {
          const exerciseSet = setValue as Partial<WorkoutSetDraft>;
          const intensity = exerciseSet.intensity;

          return {
            id:
              typeof exerciseSet.id === "string"
                ? exerciseSet.id
                : createDraftId(),
            weightKg:
              typeof exerciseSet.weightKg === "string"
                ? exerciseSet.weightKg
                : "",
            repetitions:
              typeof exerciseSet.repetitions === "string"
                ? exerciseSet.repetitions
                : "10",
            intensity:
              intensity === "low" ||
              intensity === "medium" ||
              intensity === "high"
                ? intensity
                : "medium",
            notes:
              typeof exerciseSet.notes === "string" ? exerciseSet.notes : "",
          };
        }),
      };
    })
    .filter(hasMeaningfulExerciseDraft);
};

const mapTrainingDayToExerciseDrafts = (
  trainingDay: WorkoutTrainingDay,
): WorkoutExerciseDraft[] =>
  trainingDay.exercises.length === 0
    ? []
    : trainingDay.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseName: exercise.exerciseName,
        notes: exercise.notes,
        sets:
          exercise.sets.length === 0
            ? [createSetDraft()]
            : exercise.sets.map((exerciseSet) => ({
                id: exerciseSet.id,
                weightKg:
                  exerciseSet.weightKg === null
                    ? ""
                    : String(exerciseSet.weightKg),
                repetitions: String(exerciseSet.repetitions),
                intensity: exerciseSet.intensity,
                notes: exerciseSet.notes,
              })),
      }));

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
  const { profile } = useProfile();
  const isClient = profile?.role === "client";
  const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
  const workoutDraftKey = getDraftStorageKey(profile?.id, "workout-patterns");
  const [initialWorkoutDraft] = useState(() =>
    readDraft<WorkoutPageDraft>(workoutDraftKey, {
      selectedClientId: "",
      selectedProgramId: "",
      editingTrainingDayId: null,
      programTitle: "",
      programDescription: "",
      dayDate: todayDateKey,
      dayTitle: "",
      dayContent: "",
      exerciseDrafts: [],
    }),
  );
  const [clients, setClients] = useState<WorkoutClient[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [trainingDays, setTrainingDays] = useState<WorkoutTrainingDay[]>([]);
  const [scheduledDays, setScheduledDays] = useState<ScheduledTrainingDay[]>(
    [],
  );
  const [selectedClientId, setSelectedClientId] = useState(
    initialWorkoutDraft.selectedClientId,
  );
  const [selectedProgramId, setSelectedProgramId] = useState(
    initialWorkoutDraft.selectedProgramId,
  );
  const [editingTrainingDayId, setEditingTrainingDayId] = useState<
    string | null
  >(initialWorkoutDraft.editingTrainingDayId);
  const [programTitle, setProgramTitle] = useState(
    initialWorkoutDraft.programTitle,
  );
  const [programDescription, setProgramDescription] = useState(
    initialWorkoutDraft.programDescription,
  );
  const [dayDate, setDayDate] = useState(
    initialWorkoutDraft.dayDate || todayDateKey,
  );
  const [dayTitle, setDayTitle] = useState(initialWorkoutDraft.dayTitle);
  const [dayContent, setDayContent] = useState(initialWorkoutDraft.dayContent);
  const [exerciseDrafts, setExerciseDrafts] = useState<WorkoutExerciseDraft[]>(
    () => normalizeWorkoutExerciseDrafts(initialWorkoutDraft.exerciseDrafts),
  );
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isProgramDataLoading, setIsProgramDataLoading] = useState(false);
  const [isProgramSaving, setIsProgramSaving] = useState(false);
  const [isDaySaving, setIsDaySaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isClient) {
      return;
    }

    writeDraft<WorkoutPageDraft>(workoutDraftKey, {
      selectedClientId,
      selectedProgramId,
      editingTrainingDayId,
      programTitle,
      programDescription,
      dayDate,
      dayTitle,
      dayContent,
      exerciseDrafts,
    });
  }, [
    dayContent,
    dayDate,
    dayTitle,
    exerciseDrafts,
    editingTrainingDayId,
    isClient,
    programDescription,
    programTitle,
    selectedClientId,
    selectedProgramId,
    workoutDraftKey,
  ]);

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
  const editingTrainingDay = trainingDays.find(
    (trainingDay) => trainingDay.id === editingTrainingDayId,
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

  const handleSelectProgram = (programId: string) => {
    if (programId !== selectedProgramId) {
      resetTrainingDayForm();
    }

    setSelectedProgramId(programId);
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
      currentDrafts.filter((draft) => draft.id !== id),
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

  const handleSetCountChange = (exerciseId: string, nextCountValue: string) => {
    const nextCount = Number(nextCountValue);

    if (!Number.isInteger(nextCount) || nextCount < 1 || nextCount > 20) {
      return;
    }

    setExerciseDrafts((currentDrafts) =>
      currentDrafts.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const currentSets = exercise.sets;

        if (nextCount === currentSets.length) {
          return exercise;
        }

        if (nextCount < currentSets.length) {
          return {
            ...exercise,
            sets: currentSets.slice(0, nextCount),
          };
        }

        return {
          ...exercise,
          sets: [
            ...currentSets,
            ...Array.from(
              { length: nextCount - currentSets.length },
              createSetDraft,
            ),
          ],
        };
      }),
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

  const handleQuickWorkoutTextChange = (value: string) => {
    setDayContent(value);
    setExerciseDrafts(parseQuickWorkoutText(value));
  };

  const getSourceTrainingDayForCopy = () =>
    [...trainingDays]
      .filter((trainingDay) => trainingDay.id !== editingTrainingDayId)
      .sort((firstDay, secondDay) =>
        secondDay.trainingDate.localeCompare(firstDay.trainingDate),
      )[0];

  const handleUsePreviousTrainingDay = () => {
    const sourceTrainingDay = getSourceTrainingDayForCopy();

    if (!sourceTrainingDay) {
      return;
    }

    const sourceDrafts = mapTrainingDayToExerciseDrafts(sourceTrainingDay);
    const sourceContent =
      sourceTrainingDay.content.trim() ||
      serializeExerciseDraftsToQuickText(sourceDrafts);

    setDayTitle(sourceTrainingDay.title);
    setDayContent(sourceContent);
    setExerciseDrafts(sourceDrafts);
  };

  const handleClearTrainingDayForm = () => {
    setDayTitle("");
    setDayContent("");
    setExerciseDrafts([]);
    setErrorMessage(null);
  };

  const buildExercisePayloads = (): NormalizedExerciseDraft[] | null => {
    const meaningfulDrafts = exerciseDrafts.filter(hasMeaningfulExerciseDraft);

    const normalizedDrafts = meaningfulDrafts.map((draft, exerciseIndex) => ({
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
        draftId: set.id,
        set_number: setIndex + 1,
        weight_kg: weightKg,
        repetitions,
        intensity: set.intensity,
        notes: set.notes.trim() || null,
      })),
    }));
  };

  const saveTrainingDayExercises = async (
    trainingDayId: string,
    normalizedExercises: NormalizedExerciseDraft[],
    previousTrainingDay?: WorkoutTrainingDay,
  ): Promise<WorkoutTrainingExercise[] | null> => {
    const supabaseClient = supabase;

    if (!supabaseClient) {
      setErrorMessage(missingSupabaseMessage);
      return null;
    }

    const previousExercisesById = new Map(
      (previousTrainingDay?.exercises ?? []).map((exercise) => [
        exercise.id,
        exercise,
      ]),
    );
    const keptExerciseIds = new Set(
      normalizedExercises
        .filter((exercise) => previousExercisesById.has(exercise.draftId))
        .map((exercise) => exercise.draftId),
    );
    const removedExerciseIds = (previousTrainingDay?.exercises ?? [])
      .filter((exercise) => !keptExerciseIds.has(exercise.id))
      .map((exercise) => exercise.id);

    if (removedExerciseIds.length > 0) {
      const { error } = await supabaseClient
        .from("workout_training_exercises")
        .delete()
        .in("id", removedExerciseIds);

      if (error) {
        setErrorMessage("Не удалось удалить убранные упражнения.");
        return null;
      }
    }

    const savedExercises: WorkoutTrainingExercise[] = [];

    for (const exercise of normalizedExercises) {
      const previousExercise = previousExercisesById.get(exercise.draftId);
      const exercisePayload = {
        training_day_id: trainingDayId,
        exercise_name: exercise.exerciseName,
        order_index: exercise.orderIndex,
        notes: exercise.notes,
      };
      const exerciseResponse = previousExercise
        ? await supabaseClient
            .from("workout_training_exercises")
            .update(exercisePayload)
            .eq("id", previousExercise.id)
            .select()
            .single()
        : await supabaseClient
            .from("workout_training_exercises")
            .insert(exercisePayload)
            .select()
            .single();

      if (exerciseResponse.error || !exerciseResponse.data) {
        setErrorMessage("Не удалось сохранить упражнения тренировки.");
        return null;
      }

      const savedExercise = mapExerciseRow(
        exerciseResponse.data as WorkoutTrainingExerciseRow,
      );
      const previousSetsById = new Map(
        (previousExercise?.sets ?? []).map((exerciseSet) => [
          exerciseSet.id,
          exerciseSet,
        ]),
      );
      const keptSetIds = new Set(
        exercise.sets
          .filter((exerciseSet) => previousSetsById.has(exerciseSet.draftId))
          .map((exerciseSet) => exerciseSet.draftId),
      );
      const removedSetIds = (previousExercise?.sets ?? [])
        .filter((exerciseSet) => !keptSetIds.has(exerciseSet.id))
        .map((exerciseSet) => exerciseSet.id);

      if (removedSetIds.length > 0) {
        const { error } = await supabaseClient
          .from("workout_exercise_sets")
          .delete()
          .in("id", removedSetIds);

        if (error) {
          setErrorMessage("Не удалось удалить убранные подходы.");
          return null;
        }
      }

      const savedSets: WorkoutExerciseSet[] = [];

      for (const exerciseSet of exercise.sets) {
        const { draftId: setDraftId, ...setPayload } = exerciseSet;
        const previousSet = previousSetsById.get(setDraftId);
        const setResponse = previousSet
          ? await supabaseClient
              .from("workout_exercise_sets")
              .update(setPayload)
              .eq("id", previousSet.id)
              .select()
              .single()
          : await supabaseClient
              .from("workout_exercise_sets")
              .insert({
                ...setPayload,
                exercise_id: savedExercise.id,
              })
              .select()
              .single();

        if (setResponse.error || !setResponse.data) {
          setErrorMessage("Не удалось сохранить подходы тренировки.");
          return null;
        }

        savedSets.push(mapSetRow(setResponse.data as WorkoutExerciseSetRow));
      }

      savedExercises.push({
        ...savedExercise,
        sets: savedSets.sort(
          (firstSet, secondSet) => firstSet.setNumber - secondSet.setNumber,
        ),
      });
    }

    return savedExercises;
  };

  const resetTrainingDayForm = () => {
    setEditingTrainingDayId(null);
    setDayTitle("");
    setDayContent("");
    setExerciseDrafts([]);
  };

  const handleEditTrainingDay = (trainingDay: WorkoutTrainingDay) => {
    const nextExerciseDrafts = mapTrainingDayToExerciseDrafts(trainingDay);
    const nextDayContent =
      trainingDay.content.trim() ||
      serializeExerciseDraftsToQuickText(nextExerciseDrafts);

    setEditingTrainingDayId(trainingDay.id);
    setDayDate(trainingDay.trainingDate);
    setDayTitle(trainingDay.title);
    setDayContent(nextDayContent);
    setExerciseDrafts(nextExerciseDrafts);
    setErrorMessage(null);

    window.setTimeout(() => {
      document
        .getElementById("workout-day-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSaveTrainingDay = async (event: FormEvent<HTMLFormElement>) => {
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

    const resolvedContent =
      dayContent.trim() || serializeExerciseDraftsToQuickText(exerciseDrafts);

    if (!resolvedContent && normalizedExercises.length === 0) {
      setErrorMessage("Добавьте текст тренировки или упражнение.");
      return;
    }

    const payload: NewWorkoutTrainingDayRow = {
      program_id: selectedProgramId,
      training_date: dayDate,
      title: dayTitle.trim() || "Тренировка",
      content: resolvedContent,
    };

    if (editingTrainingDayId && !editingTrainingDay) {
      setErrorMessage("Редактируемый тренировочный день не найден.");
      return;
    }

    const supabaseClient = supabase;

    setIsDaySaving(true);

    if (editingTrainingDayId) {
      const { data, error } = await supabaseClient
        .from("workout_training_days")
        .update(payload)
        .eq("id", editingTrainingDayId)
        .select()
        .single();

      if (error || !data) {
        setIsDaySaving(false);
        setErrorMessage(
          error?.code === "23505"
            ? "В этой программе уже есть план на выбранный день."
            : "Не удалось обновить тренировочный день. Проверьте, что в Supabase применена миграция 015_allow_workout_training_day_updates.sql.",
        );
        return;
      }

      const updatedTrainingDay = mapTrainingDayRow(
        data as WorkoutTrainingDayRow,
      );
      const savedExercises = await saveTrainingDayExercises(
        updatedTrainingDay.id,
        normalizedExercises,
        editingTrainingDay,
      );

      if (!savedExercises) {
        setIsDaySaving(false);
        return;
      }

      const nextTrainingDay: WorkoutTrainingDay = {
        ...updatedTrainingDay,
        exercises: savedExercises,
      };

      setErrorMessage(null);
      setIsDaySaving(false);
      setTrainingDays((currentDays) =>
        currentDays
          .map((trainingDay) =>
            trainingDay.id === nextTrainingDay.id
              ? nextTrainingDay
              : trainingDay,
          )
          .sort((firstDay, secondDay) =>
            firstDay.trainingDate.localeCompare(secondDay.trainingDate),
          ),
      );
      resetTrainingDayForm();
      return;
    }

    const { data, error } = await supabaseClient
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
    const savedExercises = await saveTrainingDayExercises(
      createdTrainingDay.id,
      normalizedExercises,
    );

    if (!savedExercises) {
      await supabaseClient
        .from("workout_training_days")
        .delete()
        .eq("id", createdTrainingDay.id);

      setIsDaySaving(false);
      return;
    }

    setErrorMessage(null);
    setIsDaySaving(false);
    setTrainingDays((currentDays) =>
      [
        ...currentDays,
        {
          ...createdTrainingDay,
          exercises: savedExercises,
        },
      ].sort((firstDay, secondDay) =>
        firstDay.trainingDate.localeCompare(secondDay.trainingDate),
      ),
    );
    resetTrainingDayForm();
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

    if (editingTrainingDayId === id) {
      resetTrainingDayForm();
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Тренировки
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          {isClient ? "Мои тренировки" : "Программы тренировок"}
        </h1>
      </div>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        {isClient ? (
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Профиль клиента
            </p>
            <p className="mt-1 font-bold text-[var(--text)]">
              {selectedClient
                ? selectedClient.firstName
                : "Аккаунт пока не привязан к карточке клиента"}
            </p>
          </div>
        ) : (
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
                    {client.firstName}
                  </option>
                ))
              )}
            </select>
          </label>
        )}

        {isClientsLoading && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {isClient ? "Загружаем профиль..." : "Загружаем клиентов..."}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5">
          {!isClient && (
            <form
              onSubmit={handleCreateProgram}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text)]">
                Новая программа
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {selectedClient
                  ? `Для клиента ${selectedClient.firstName}`
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
          )}

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text)]">
              {isClient ? "Мои программы" : "Программы клиента"}
            </h2>

            {isProgramDataLoading ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Загружаем программы...
              </p>
            ) : programs.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
                {isClient
                  ? "Тренер пока не добавил программы тренировок."
                  : "У выбранного клиента пока нет программ тренировок."}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {programs.map((program) => (
                  <li key={program.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProgram(program.id)}
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

              {selectedProgram && !isClient && (
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
              {isClient
                ? "Ближайшие дни"
                : editingTrainingDay
                  ? "Редактирование тренировочного дня"
                  : "План на тренировочный день"}
            </h2>
            {editingTrainingDay && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Сейчас редактируется день: {editingTrainingDay.title}
              </p>
            )}

            {scheduledDays.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">
                  {isClient
                    ? "Ближайшие дни из календаря"
                    : "Ближайшие дни клиента из календаря"}
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

            {!isClient && (
            <form
              id="workout-day-form"
              onSubmit={handleSaveTrainingDay}
              className="mt-5 grid gap-4"
            >
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
                    value={dayTitle}
                    onChange={(event) => setDayTitle(event.target.value)}
                    placeholder="Например: День ног"
                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <div className="block">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="block text-sm font-semibold text-[var(--text)]">
                    План тренировки
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUsePreviousTrainingDay}
                      disabled={!getSourceTrainingDayForCopy()}
                      className="focus-ring min-h-9 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Вставить прошлую
                    </button>
                    <button
                      type="button"
                      onClick={handleClearTrainingDayForm}
                      className="focus-ring min-h-9 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
                <textarea
                  value={dayContent}
                  onChange={(event) =>
                    handleQuickWorkoutTextChange(event.target.value)
                  }
                  placeholder={`Жим лежа 60x10, 65x8, 70x6 | пауза внизу
Тяга верхнего блока 45x12x3
Жим гантелей сидя 3x10 22кг
Планка 3x60 сек`}
                  className="focus-ring min-h-64 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-sm leading-6 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-white/70 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-[var(--text)]">
                    Разобранный план
                  </h3>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">
                    {exerciseDrafts.length}
                  </span>
                </div>

                {exerciseDrafts.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--text-muted)]">
                    В плане пока нет распознанных упражнений.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    {exerciseDrafts.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="grid gap-2 px-3 py-3 lg:grid-cols-[minmax(140px,1fr)_minmax(180px,1.2fr)_minmax(120px,1fr)] lg:items-center"
                      >
                        <p className="min-w-0 truncate font-semibold text-[var(--text)]">
                          {exercise.exerciseName || "Без названия"}
                        </p>
                        <p className="min-w-0 text-sm text-[var(--text)]">
                          {exercise.sets.map(formatDraftSetForText).join(", ")}
                        </p>
                        <p className="min-w-0 text-sm text-[var(--text-muted)]">
                          {exercise.notes || "Без примечания"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <details className="rounded-lg border border-[var(--border)] bg-white/70">
                <summary className="cursor-pointer px-3 py-3 font-bold text-[var(--text)] marker:text-[var(--accent)]">
                  Точная правка
                </summary>
                <div className="flex flex-col gap-3 border-b border-[var(--border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text)]">
                      Подходы и веса
                    </h3>
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

                <div className="min-w-0">
                  <div className="min-w-0">
                    <div className="hidden grid-cols-[minmax(120px,1.35fr)_72px_72px_80px_minmax(120px,1fr)_92px] gap-2 bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] lg:grid">
                      <span>Упражнение</span>
                      <span>Вес</span>
                      <span>Подх.</span>
                      <span>Повт.</span>
                      <span>Примечания</span>
                      <span />
                    </div>

                    <div className="divide-y divide-[var(--border)]">
                      {exerciseDrafts.map((exercise, index) =>
                        exercise.sets.map((exerciseSet, setIndex) => {
                          const isFirstSet = setIndex === 0;

                          return (
                            <div
                              key={`${exercise.id}-${exerciseSet.id}`}
                              className="grid min-w-0 grid-cols-2 gap-2 px-3 py-2 lg:grid-cols-[minmax(120px,1.35fr)_72px_72px_80px_minmax(120px,1fr)_92px] lg:items-center"
                            >
                              {isFirstSet ? (
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
                                  placeholder={`Упражнение ${index + 1}`}
                                  aria-label="Название упражнения"
                                  className="focus-ring col-span-2 min-h-10 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] lg:col-span-1"
                                />
                              ) : (
                                <div className="col-span-2 flex min-h-10 min-w-0 items-center rounded-lg bg-[var(--surface-soft)] px-3 text-sm font-semibold text-[var(--text-muted)] lg:col-span-1">
                                  Подход {setIndex + 1}
                                </div>
                              )}

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
                                aria-label="Вес"
                                className="focus-ring min-h-10 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                              />

                              {isFirstSet ? (
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  step="1"
                                  value={exercise.sets.length}
                                  onChange={(event) =>
                                    handleSetCountChange(
                                      exercise.id,
                                      event.target.value,
                                    )
                                  }
                                  aria-label="Количество подходов"
                                  className="focus-ring min-h-10 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                />
                              ) : (
                                <div className="flex min-h-10 min-w-0 items-center rounded-lg bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-muted)]">
                                  {setIndex + 1}/{exercise.sets.length}
                                </div>
                              )}

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
                                aria-label="Повторения"
                                className="focus-ring min-h-10 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                              />

                              <input
                                type="text"
                                value={
                                  isFirstSet
                                    ? exercise.notes
                                    : exerciseSet.notes
                                }
                                onChange={(event) =>
                                  isFirstSet
                                    ? handleExerciseDraftChange(
                                        exercise.id,
                                        "notes",
                                        event.target.value,
                                      )
                                    : handleSetDraftChange(
                                        exercise.id,
                                        exerciseSet.id,
                                        "notes",
                                        event.target.value,
                                      )
                                }
                                placeholder={
                                  isFirstSet
                                    ? "Техника, темп..."
                                    : "Заметка к подходу"
                                }
                                aria-label="Примечания"
                                className="focus-ring col-span-2 min-h-10 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] lg:col-span-1"
                              />

                              <div className="col-span-2 flex min-w-0 gap-2 lg:col-span-1">
                                {isFirstSet ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddSetDraft(exercise.id)
                                      }
                                      title="Добавить подход"
                                      aria-label="Добавить подход"
                                      className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                    >
                                      <PlusIcon />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveExerciseDraft(exercise.id)
                                      }
                                      title="Удалить упражнение"
                                      aria-label="Удалить упражнение"
                                      className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-xl font-semibold leading-none text-rose-600 transition hover:bg-rose-50"
                                    >
                                      ×
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSetDraft(
                                        exercise.id,
                                        exerciseSet.id,
                                      )
                                    }
                                    title="Удалить подход"
                                    aria-label="Удалить подход"
                                    className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-xl font-semibold leading-none text-rose-600 transition hover:bg-rose-50"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }),
                      )}
                    </div>
                  </div>
                </div>
              </details>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isDaySaving || !selectedProgramId}
                  className="focus-ring min-h-11 w-full rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                >
                  {isDaySaving
                    ? editingTrainingDay
                      ? "Сохраняем..."
                      : "Добавляем..."
                    : editingTrainingDay
                      ? "Сохранить день"
                      : "Добавить тренировочный день"}
                </button>
                {editingTrainingDay && (
                  <button
                    type="button"
                    onClick={resetTrainingDayForm}
                    disabled={isDaySaving}
                    className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                  >
                    Отменить редактирование
                  </button>
                )}
              </div>
            </form>
            )}
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
                    className={[
                      "rounded-lg border p-4 transition",
                      editingTrainingDayId === trainingDay.id
                        ? "border-[var(--accent)] bg-blue-50/60"
                        : "border-[var(--border)]",
                    ].join(" ")}
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

                      {!isClient && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditTrainingDay(trainingDay)}
                            className="focus-ring min-h-10 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTrainingDay(trainingDay.id)
                            }
                            className="focus-ring min-h-10 rounded-lg border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Удалить
                          </button>
                        </div>
                      )}
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
                        trainingDay.exercises.map((exercise) => (
                          <article
                            key={exercise.id}
                            className="rounded-lg bg-[var(--surface-soft)] px-4 py-3"
                          >
                            <p className="text-sm font-semibold leading-6 text-[var(--text)] sm:text-base">
                              {formatTrainingExerciseInline(exercise)}
                            </p>
                          </article>
                        ))
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
