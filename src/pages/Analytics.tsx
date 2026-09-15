import { useEffect, useMemo, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type ClientMeasurementRow,
  type ClientRow,
  type WorkoutExerciseIntensity,
  type WorkoutExerciseSetRow,
  type WorkoutProgramRow,
  type WorkoutTrainingDayRow,
  type WorkoutTrainingExerciseRow,
} from "../lib/supabase";

type BodyMetricKey =
  | "weightKg"
  | "chestCm"
  | "waistCm"
  | "hipsCm"
  | "armCm"
  | "thighCm"
  | "bodyFatPercent"
  | "fatMassKg";

type StrengthMetricKey =
  | "tonnageKg"
  | "maxWeightKg"
  | "repetitions";

type TonnagePeriod = "workout" | "week" | "month";

type BodyMetric = {
  key: BodyMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  lowerIsBetter?: boolean;
};

type StrengthMetric = {
  key: StrengthMetricKey;
  label: string;
  unit: string;
  color: string;
};

type AnalyticsClient = {
  id: string;
  name: string;
  height: number | null;
  currentWeight: number | null;
  desiredWeight: number | null;
  goal: string;
};

type AnalyticsMeasurement = {
  id: string;
  clientId: string;
  measuredAt: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  bodyFatPercent: number | null;
};

type AnalyticsStrengthSet = {
  id: string;
  clientId: string;
  trainingDayId: string;
  trainingDate: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  repetitions: number;
  intensity: WorkoutExerciseIntensity;
  notes: string;
  tonnageKg: number | null;
};

type TrendPoint = {
  date: string;
  value: number;
};

const bodyMetrics: BodyMetric[] = [
  {
    key: "weightKg",
    label: "Вес",
    shortLabel: "Вес",
    unit: "кг",
    color: "#2563eb",
    lowerIsBetter: true,
  },
  {
    key: "chestCm",
    label: "Грудь",
    shortLabel: "Грудь",
    unit: "см",
    color: "#0f766e",
  },
  {
    key: "waistCm",
    label: "Талия",
    shortLabel: "Талия",
    unit: "см",
    color: "#f97316",
    lowerIsBetter: true,
  },
  {
    key: "hipsCm",
    label: "Бедра",
    shortLabel: "Бедра",
    unit: "см",
    color: "#7c3aed",
  },
  {
    key: "armCm",
    label: "Рука",
    shortLabel: "Рука",
    unit: "см",
    color: "#db2777",
  },
  {
    key: "thighCm",
    label: "Бедро",
    shortLabel: "Бедро",
    unit: "см",
    color: "#0891b2",
  },
  {
    key: "bodyFatPercent",
    label: "Процент жира",
    shortLabel: "Жир",
    unit: "%",
    color: "#dc2626",
    lowerIsBetter: true,
  },
  {
    key: "fatMassKg",
    label: "Жировая масса",
    shortLabel: "Жировая масса",
    unit: "кг",
    color: "#b45309",
    lowerIsBetter: true,
  },
];

const strengthMetrics: StrengthMetric[] = [
  {
    key: "tonnageKg",
    label: "Тоннаж",
    unit: "кг",
    color: "#2563eb",
  },
  {
    key: "maxWeightKg",
    label: "Максимальный вес",
    unit: "кг",
    color: "#f97316",
  },
  {
    key: "repetitions",
    label: "Повторы",
    unit: "раз",
    color: "#0f766e",
  },
];

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

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

const formatNumber = (value: number | null) =>
  value === null ? "—" : numberFormatter.format(value);

const formatDate = (dateValue: string) =>
  fullDateFormatter.format(new Date(`${dateValue}T00:00:00`));

const formatShortDate = (dateValue: string) =>
  dateFormatter.format(new Date(`${dateValue}T00:00:00`));

const dateToKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const getTonnagePeriodRange = (
  dateValue: string,
  period: TonnagePeriod,
) => {
  const date = new Date(`${dateValue}T00:00:00`);

  if (period === "workout") {
    return { start: dateValue, end: dateValue };
  }

  if (period === "week") {
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(date);
    start.setDate(date.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start: dateToKey(start), end: dateToKey(end) };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return { start: dateToKey(start), end: dateToKey(end) };
};

const formatTonnagePeriodRange = (
  dateValue: string,
  period: TonnagePeriod,
) => {
  const range = getTonnagePeriodRange(dateValue, period);

  if (period === "workout") {
    return formatDate(dateValue);
  }

  if (period === "month") {
    return monthYearFormatter.format(new Date(`${range.start}T00:00:00`));
  }

  return `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`;
};

const mapClientRow = (row: ClientRow): AnalyticsClient => ({
  id: row.id,
  name: `${row.first_name} ${row.second_name}`,
  height: row.height === null ? null : Number(row.height),
  currentWeight:
    row.current_weight === null ? null : Number(row.current_weight),
  desiredWeight:
    row.desired_weight === null ? null : Number(row.desired_weight),
  goal: row.goal ?? "",
});

const mapMeasurementRow = (
  row: ClientMeasurementRow,
): AnalyticsMeasurement => ({
  id: row.id,
  clientId: row.client_id,
  measuredAt: row.measured_at,
  weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
  chestCm: row.chest_cm === null ? null : Number(row.chest_cm),
  waistCm: row.waist_cm === null ? null : Number(row.waist_cm),
  hipsCm: row.hips_cm === null ? null : Number(row.hips_cm),
  armCm: row.arm_cm === null ? null : Number(row.arm_cm),
  thighCm: row.thigh_cm === null ? null : Number(row.thigh_cm),
  bodyFatPercent:
    row.body_fat_percent === null ? null : Number(row.body_fat_percent),
});

const getBodyMetricValue = (
  measurement: AnalyticsMeasurement,
  metricKey: BodyMetricKey,
) => {
  if (metricKey === "fatMassKg") {
    if (measurement.weightKg === null || measurement.bodyFatPercent === null) {
      return null;
    }

    return (measurement.weightKg * measurement.bodyFatPercent) / 100;
  }

  switch (metricKey) {
    case "weightKg":
      return measurement.weightKg;
    case "chestCm":
      return measurement.chestCm;
    case "waistCm":
      return measurement.waistCm;
    case "hipsCm":
      return measurement.hipsCm;
    case "armCm":
      return measurement.armCm;
    case "thighCm":
      return measurement.thighCm;
    case "bodyFatPercent":
      return measurement.bodyFatPercent;
  }
};

const getStrengthMetricValue = (
  rows: AnalyticsStrengthSet[],
  metricKey: StrengthMetricKey,
) => {
  if (metricKey === "tonnageKg") {
    const weightedRows = rows.filter((row) => row.tonnageKg !== null);

    return weightedRows.length > 0
      ? weightedRows.reduce((total, row) => total + (row.tonnageKg ?? 0), 0)
      : null;
  }

  if (metricKey === "maxWeightKg") {
    const weights = rows
      .map((row) => row.weightKg)
      .filter((value): value is number => value !== null);

    return weights.length > 0 ? Math.max(...weights) : null;
  }

  if (metricKey === "repetitions") {
    return rows.reduce((total, row) => total + row.repetitions, 0);
  }

  return null;
};

const getTonnageForPeriod = (
  rows: AnalyticsStrengthSet[],
  dateValue: string,
  period: TonnagePeriod,
) => {
  if (!dateValue) {
    return null;
  }

  const range = getTonnagePeriodRange(dateValue, period);
  const periodRows = rows.filter(
    (row) => row.trainingDate >= range.start && row.trainingDate <= range.end,
  );

  return getStrengthMetricValue(periodRows, "tonnageKg");
};

const getChangeLabel = (change: number | null, metric: BodyMetric) => {
  if (change === null) {
    return "Недостаточно данных";
  }

  const normalizedChange = metric.lowerIsBetter ? -change : change;

  if (Math.abs(change) < 0.01) {
    return "Без изменений";
  }

  return normalizedChange > 0 ? "Положительная динамика" : "Нужно внимание";
};

function ChartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 19V5m0 14h16M7 15l3-4 3 2 4-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type TrendChartProps = {
  id: string;
  points: TrendPoint[];
  color: string;
  unit: string;
  label: string;
  emptyText: string;
};

function TrendChart({
  id,
  points,
  color,
  unit,
  label,
  emptyText,
}: TrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-sm text-[var(--text-muted)]">
        {emptyText}
      </div>
    );
  }

  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadding = { top: 24, right: 24, bottom: 42, left: 52 };
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
  const chartMin = minValue - range * 0.15;
  const chartMax = maxValue + range * 0.15;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const xStep = points.length === 1 ? 0 : plotWidth / (points.length - 1);
  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? chartPadding.left + plotWidth / 2
        : chartPadding.left + index * xStep;
    const y =
      chartPadding.top +
      ((chartMax - point.value) / (chartMax - chartMin)) * plotHeight;

    return { ...point, x, y };
  });
  const linePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const areaPoints = [
    `${chartPoints[0].x},${chartHeight - chartPadding.bottom}`,
    ...chartPoints.map((point) => `${point.x},${point.y}`),
    `${chartPoints.at(-1)?.x ?? chartPoints[0].x},${
      chartHeight - chartPadding.bottom
    }`,
  ].join(" ");
  const gridValues = [
    chartMax,
    chartMin + (chartMax - chartMin) / 2,
    chartMin,
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label={`Динамика: ${label}`}
        className="h-auto min-w-[680px] w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
      >
        <defs>
          <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((gridValue, index) => {
          const y =
            chartPadding.top +
            ((chartMax - gridValue) / (chartMax - chartMin)) * plotHeight;

          return (
            <g key={`${gridValue}-${index}`}>
              <line
                x1={chartPadding.left}
                x2={chartWidth - chartPadding.right}
                y1={y}
                y2={y}
                stroke="#d9e1ea"
                strokeDasharray="4 5"
              />
              <text
                x={chartPadding.left - 10}
                y={y + 4}
                fill="#667085"
                fontSize="12"
                textAnchor="end"
              >
                {formatNumber(gridValue)}
              </text>
            </g>
          );
        })}

        <polygon fill={`url(#${id}-area)`} points={areaPoints} />
        <polyline
          fill="none"
          points={linePoints}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {chartPoints.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            <circle
              cx={point.x}
              cy={point.y}
              fill="white"
              r="5"
              stroke={color}
              strokeWidth="3"
            />
            <text
              x={point.x}
              y={chartHeight - 15}
              fill="#667085"
              fontSize="11"
              textAnchor="middle"
            >
              {formatShortDate(point.date)}
            </text>
          </g>
        ))}
      </svg>
      <p className="sr-only">
        {label}, единица измерения: {unit}.
      </p>
    </div>
  );
}

function Analytics() {
  const [clients, setClients] = useState<AnalyticsClient[]>([]);
  const [measurements, setMeasurements] = useState<AnalyticsMeasurement[]>([]);
  const [strengthSets, setStrengthSets] = useState<AnalyticsStrengthSet[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBodyMetricKey, setSelectedBodyMetricKey] =
    useState<BodyMetricKey>("weightKg");
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [selectedStrengthMetricKey, setSelectedStrengthMetricKey] =
    useState<StrengthMetricKey>("tonnageKg");
  const [selectedTrainingDate, setSelectedTrainingDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [strengthErrorMessage, setStrengthErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      const [clientsResponse, measurementsResponse, programsResponse] =
        await Promise.all([
          supabase.from("clients").select("*").order("first_name"),
          supabase
            .from("client_measurements")
            .select("*")
            .order("measured_at", { ascending: true }),
          supabase.from("workout_programs").select("*"),
        ]);

      if (!isMounted) {
        return;
      }

      if (clientsResponse.error || measurementsResponse.error) {
        setErrorMessage(
          "Не удалось загрузить данные аналитики. Проверьте миграцию 006_create_client_measurements.sql.",
        );
        setClients([]);
        setMeasurements([]);
      } else {
        const nextClients = ((clientsResponse.data ?? []) as ClientRow[]).map(
          mapClientRow,
        );
        const nextMeasurements = (
          (measurementsResponse.data ?? []) as ClientMeasurementRow[]
        ).map(mapMeasurementRow);

        setClients(nextClients);
        setMeasurements(nextMeasurements);
        setSelectedClientId((currentClientId) =>
          currentClientId &&
          nextClients.some((client) => client.id === currentClientId)
            ? currentClientId
            : nextClients[0]?.id ?? "",
        );
        setErrorMessage(null);
      }

      if (programsResponse.error) {
        setStrengthErrorMessage(
          "Силовые метрики недоступны. Выполните миграции 003, 004 и 005 для программ тренировок.",
        );
        setStrengthSets([]);
        setIsLoading(false);
        return;
      }

      const programRows = (programsResponse.data ?? []) as WorkoutProgramRow[];

      if (programRows.length === 0) {
        setStrengthSets([]);
        setStrengthErrorMessage(null);
        setIsLoading(false);
        return;
      }

      const { data: trainingDayData, error: trainingDayError } = await supabase
        .from("workout_training_days")
        .select("*")
        .in(
          "program_id",
          programRows.map((program) => program.id),
        );

      if (!isMounted) {
        return;
      }

      if (trainingDayError) {
        setStrengthErrorMessage(
          "Не удалось загрузить тренировочные дни для силовой аналитики.",
        );
        setStrengthSets([]);
        setIsLoading(false);
        return;
      }

      const trainingDayRows = (trainingDayData ?? []) as WorkoutTrainingDayRow[];

      if (trainingDayRows.length === 0) {
        setStrengthSets([]);
        setStrengthErrorMessage(null);
        setIsLoading(false);
        return;
      }

      const { data: exerciseData, error: exerciseError } = await supabase
        .from("workout_training_exercises")
        .select("*")
        .in(
          "training_day_id",
          trainingDayRows.map((day) => day.id),
        );

      if (!isMounted) {
        return;
      }

      if (exerciseError) {
        setStrengthErrorMessage(
          "Не удалось загрузить упражнения для силовой аналитики.",
        );
        setStrengthSets([]);
        setIsLoading(false);
        return;
      }

      const exerciseRows = (exerciseData ?? []) as WorkoutTrainingExerciseRow[];

      if (exerciseRows.length === 0) {
        setStrengthSets([]);
        setStrengthErrorMessage(null);
        setIsLoading(false);
        return;
      }

      const { data: setData, error: setError } = await supabase
        .from("workout_exercise_sets")
        .select("*")
        .in(
          "exercise_id",
          exerciseRows.map((exercise) => exercise.id),
        )
        .order("set_number", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (setError) {
        setStrengthErrorMessage(
          "Не удалось загрузить подходы для силовой аналитики. Выполните миграцию 005_create_workout_exercise_sets.sql.",
        );
        setStrengthSets([]);
        setIsLoading(false);
        return;
      }

      const clientsByProgramId = new Map(
        programRows.map((program) => [program.id, program.client_id]),
      );
      const daysById = new Map(
        trainingDayRows.map((day) => [day.id, day]),
      );
      const exercisesById = new Map(
        exerciseRows.map((exercise) => [exercise.id, exercise]),
      );

      const nextStrengthSets = ((setData ?? []) as WorkoutExerciseSetRow[])
        .map((setRow): AnalyticsStrengthSet | null => {
          const exercise = exercisesById.get(setRow.exercise_id);

          if (!exercise) {
            return null;
          }

          const trainingDay = daysById.get(exercise.training_day_id);

          if (!trainingDay) {
            return null;
          }

          return {
            id: setRow.id,
            clientId: clientsByProgramId.get(trainingDay.program_id) ?? "",
            trainingDayId: trainingDay.id,
            trainingDate: trainingDay.training_date,
            exerciseId: exercise.id,
            exerciseName: exercise.exercise_name,
            setNumber: setRow.set_number,
            weightKg: setRow.weight_kg === null ? null : Number(setRow.weight_kg),
            repetitions: setRow.repetitions,
            intensity: setRow.intensity,
            notes: setRow.notes ?? "",
            tonnageKg:
              setRow.weight_kg === null
                ? null
                : Number(setRow.weight_kg) * setRow.repetitions,
          };
        })
        .filter((setRow): setRow is AnalyticsStrengthSet => setRow !== null);

      setStrengthSets(nextStrengthSets);
      setStrengthErrorMessage(null);
      setIsLoading(false);
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedClientMeasurements = useMemo(
    () =>
      measurements.filter(
        (measurement) => measurement.clientId === selectedClientId,
      ),
    [measurements, selectedClientId],
  );
  const selectedClientStrengthSets = useMemo(
    () =>
      strengthSets.filter((setRow) => setRow.clientId === selectedClientId),
    [selectedClientId, strengthSets],
  );
  const latestMeasurements = useMemo(() => {
    const latestByClient = new Map<string, AnalyticsMeasurement>();

    measurements.forEach((measurement) => {
      const currentLatest = latestByClient.get(measurement.clientId);

      if (
        !currentLatest ||
        measurement.measuredAt > currentLatest.measuredAt
      ) {
        latestByClient.set(measurement.clientId, measurement);
      }
    });

    return latestByClient;
  }, [measurements]);
  const selectedBodyMetric =
    bodyMetrics.find((metric) => metric.key === selectedBodyMetricKey) ??
    bodyMetrics[0];
  const bodyMetricPoints = selectedClientMeasurements
    .map((measurement) => {
      const value = getBodyMetricValue(measurement, selectedBodyMetric.key);

      return value === null
        ? null
        : { date: measurement.measuredAt, value };
    })
    .filter((point): point is TrendPoint => point !== null);
  const firstBodyValue = bodyMetricPoints[0]?.value ?? null;
  const latestBodyValue = bodyMetricPoints.at(-1)?.value ?? null;
  const bodyChange =
    firstBodyValue !== null && latestBodyValue !== null
      ? latestBodyValue - firstBodyValue
      : null;
  const selectedBodyLatest =
    selectedClientMeasurements.at(-1) ?? null;
  const exerciseNames = useMemo(
    () =>
      [...new Set(selectedClientStrengthSets.map((setRow) => setRow.exerciseName))]
        .sort((firstName, secondName) => firstName.localeCompare(secondName)),
    [selectedClientStrengthSets],
  );
  const activeExerciseName = exerciseNames.includes(selectedExerciseName)
    ? selectedExerciseName
    : exerciseNames[0] ?? "";
  const selectedExerciseSets = selectedClientStrengthSets.filter(
    (setRow) => setRow.exerciseName === activeExerciseName,
  );
  const trainingDates = useMemo(
    () =>
      [...new Set(selectedExerciseSets.map((setRow) => setRow.trainingDate))].sort(
        (firstDate, secondDate) => secondDate.localeCompare(firstDate),
      ),
    [selectedExerciseSets],
  );
  const activeTrainingDate = trainingDates.includes(selectedTrainingDate)
    ? selectedTrainingDate
    : trainingDates[0] ?? "";
  const selectedStrengthMetric =
    strengthMetrics.find(
      (metric) => metric.key === selectedStrengthMetricKey,
    ) ?? strengthMetrics[0];
  const strengthMetricPoints = [...new Set(
    selectedExerciseSets.map((setRow) => setRow.trainingDate),
  )]
    .sort()
    .map((date) => ({
      date,
      value: getStrengthMetricValue(
        selectedExerciseSets.filter((setRow) => setRow.trainingDate === date),
        selectedStrengthMetric.key,
      ),
    }))
    .filter((point): point is TrendPoint => point.value !== null);
  const selectedExerciseWeights = selectedExerciseSets
    .map((setRow) => setRow.weightKg)
    .filter((value): value is number => value !== null);
  const selectedExerciseMaxWeight =
    selectedExerciseWeights.length > 0
      ? Math.max(...selectedExerciseWeights)
      : null;
  const selectedWorkoutTonnage = getTonnageForPeriod(
    selectedExerciseSets,
    activeTrainingDate,
    "workout",
  );
  const selectedWeekTonnage = getTonnageForPeriod(
    selectedExerciseSets,
    activeTrainingDate,
    "week",
  );
  const selectedMonthTonnage = getTonnageForPeriod(
    selectedExerciseSets,
    activeTrainingDate,
    "month",
  );
  const tonnageCards = [
    {
      key: "workout",
      label: "Тоннаж тренировки",
      periodLabel: activeTrainingDate
        ? formatTonnagePeriodRange(activeTrainingDate, "workout")
        : "Выберите тренировку",
      value: selectedWorkoutTonnage,
    },
    {
      key: "week",
      label: "Тоннаж недели",
      periodLabel: activeTrainingDate
        ? formatTonnagePeriodRange(activeTrainingDate, "week")
        : "Выберите тренировку",
      value: selectedWeekTonnage,
    },
    {
      key: "month",
      label: "Тоннаж месяца",
      periodLabel: activeTrainingDate
        ? formatTonnagePeriodRange(activeTrainingDate, "month")
        : "Выберите тренировку",
      value: selectedMonthTonnage,
    },
  ];
  const clientsWithMeasurements = clients.filter((client) =>
    measurements.some((measurement) => measurement.clientId === client.id),
  ).length;
  const trainingDaysCount = new Set(
    strengthSets
      .filter((setRow) => setRow.clientId === selectedClientId)
      .map((setRow) => setRow.trainingDayId),
  ).size;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Динамика
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Аналитика клиентов
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Отслеживайте замеры тела и силовые показатели по упражнениям и
          периодам.
        </p>
      </div>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      {strengthErrorMessage && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-900">
          {strengthErrorMessage}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Клиенты</p>
          <p className="mt-2 text-3xl font-bold text-[var(--text)]">
            {isLoading ? "..." : clients.length}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {clientsWithMeasurements} с замерами
          </p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Замеры тела</p>
          <p className="mt-2 text-3xl font-bold text-[var(--teal)]">
            {isLoading ? "..." : measurements.length}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            записей по датам
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 sm:max-w-md sm:flex-1">
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
                    {client.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <ChartIcon />
            {selectedClient
              ? `${selectedClient.name}: ${selectedClientMeasurements.length} замеров, ${trainingDaysCount} тренировочных дней`
              : "Выберите клиента"}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Профиль клиента
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Базовые показатели из карточки клиента
          </p>
        </div>

        {selectedClient ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Рост</p>
              <p className="mt-2 text-xl font-bold text-[var(--text)]">
                {formatNumber(selectedClient.height)} см
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Текущий вес</p>
              <p className="mt-2 text-xl font-bold text-[var(--text)]">
                {formatNumber(selectedClient.currentWeight)} кг
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Желаемый вес</p>
              <p className="mt-2 text-xl font-bold text-[var(--text)]">
                {formatNumber(selectedClient.desiredWeight)} кг
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Цель</p>
              <p className="mt-2 font-semibold text-[var(--text)]">
                {selectedClient.goal || "Не указана"}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
            Выберите клиента, чтобы увидеть профиль.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Замеры тела
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Все доступные антропометрические показатели выбранного клиента
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {bodyMetrics.map((metric) => {
            const values = selectedClientMeasurements
              .map((measurement) => getBodyMetricValue(measurement, metric.key))
              .filter((value): value is number => value !== null);

            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => setSelectedBodyMetricKey(metric.key)}
                className={[
                  "focus-ring rounded-lg border p-4 text-left transition",
                  selectedBodyMetric.key === metric.key
                    ? "border-[var(--accent)] bg-blue-50 shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]",
                ].join(" ")}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[var(--text)]">
                    {metric.label}
                  </span>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                </span>
                <span className="mt-3 block text-2xl font-bold text-[var(--text)]">
                  {formatNumber(values.at(-1) ?? null)}
                  <span className="ml-1 text-sm font-semibold text-[var(--text-muted)]">
                    {metric.unit}
                  </span>
                </span>
                <span className="mt-2 block text-xs text-[var(--text-muted)]">
                  {values.length} значений
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                Динамика замеров
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
                {selectedBodyMetric.label}
              </h2>
            </div>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text-muted)]">
              {selectedBodyMetric.unit}
            </span>
          </div>

          <div className="mt-5">
            <TrendChart
              id="body-metric"
              points={bodyMetricPoints}
              color={selectedBodyMetric.color}
              unit={selectedBodyMetric.unit}
              label={selectedBodyMetric.label}
              emptyText="Для выбранного показателя пока нет замеров."
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Первый замер
              </p>
              <p className="mt-1 font-bold text-[var(--text)]">
                {formatNumber(firstBodyValue)} {selectedBodyMetric.unit}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Последний замер
              </p>
              <p className="mt-1 font-bold text-[var(--text)]">
                {formatNumber(latestBodyValue)} {selectedBodyMetric.unit}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Изменение
              </p>
              <p className="mt-1 font-bold text-[var(--text)]">
                {bodyChange === null
                  ? "—"
                  : `${bodyChange > 0 ? "+" : ""}${formatNumber(
                      bodyChange,
                    )} ${selectedBodyMetric.unit}`}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {getChangeLabel(bodyChange, selectedBodyMetric)}
          </p>
        </section>

        <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Последний замер
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
              {selectedClient?.name ?? "Клиент не выбран"}
            </h2>
          </div>

          {selectedBodyLatest ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                {formatDate(selectedBodyLatest.measuredAt)}
              </p>
              {bodyMetrics.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-[var(--text-muted)]">
                    {metric.label}
                  </span>
                  <span className="font-semibold text-[var(--text)]">
                    {formatNumber(
                      getBodyMetricValue(selectedBodyLatest, metric.key),
                    )}{" "}
                    {metric.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-muted)]">
              У выбранного клиента еще нет замеров.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">
              История замеров тела
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Все даты и доступные показатели выбранного клиента
            </p>
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {selectedClientMeasurements.length} записей
          </span>
        </div>

        {selectedClientMeasurements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
            История появится после добавления первого замера в карточке клиента.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  <th className="px-3 py-3 font-semibold">Дата</th>
                  {bodyMetrics.map((metric) => (
                    <th key={metric.key} className="px-3 py-3 font-semibold">
                      {metric.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...selectedClientMeasurements]
                  .reverse()
                  .map((measurement) => (
                    <tr
                      key={measurement.id}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--text)]">
                        {formatDate(measurement.measuredAt)}
                      </td>
                      {bodyMetrics.map((metric) => (
                        <td
                          key={metric.key}
                          className="whitespace-nowrap px-3 py-3 text-[var(--text-muted)]"
                        >
                          {formatNumber(
                            getBodyMetricValue(measurement, metric.key),
                          )}{" "}
                          {metric.unit}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Силовые показатели
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Аналитика по выбранному упражнению, тоннажу и динамике силовых
            показателей
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tonnageCards.map((card) => (
            <div
              key={card.key}
              className="rounded-lg bg-[var(--surface-soft)] p-4"
            >
              <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-[var(--text)]">
                {formatNumber(card.value)} кг
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {card.periodLabel}
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-[var(--surface-soft)] p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Максимальный вес упражнения
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--text)]">
              {formatNumber(selectedExerciseMaxWeight)} кг
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              За весь период
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block min-w-0">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              Упражнение
            </span>
            <select
              value={activeExerciseName}
              onChange={(event) => setSelectedExerciseName(event.target.value)}
              disabled={exerciseNames.length === 0}
              className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            >
              {exerciseNames.length === 0 ? (
                <option value="">Нет упражнений</option>
              ) : (
                exerciseNames.map((exerciseName) => (
                  <option key={exerciseName} value={exerciseName}>
                    {exerciseName}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              Тренировка
            </span>
            <select
              value={activeTrainingDate}
              onChange={(event) => setSelectedTrainingDate(event.target.value)}
              disabled={trainingDates.length === 0}
              className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            >
              {trainingDates.length === 0 ? (
                <option value="">Нет тренировок</option>
              ) : (
                trainingDates.map((trainingDate) => (
                  <option key={trainingDate} value={trainingDate}>
                    {formatDate(trainingDate)}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
              Показатель
            </span>
            <select
              value={selectedStrengthMetricKey}
              onChange={(event) =>
                setSelectedStrengthMetricKey(
                  event.target.value as StrengthMetricKey,
                )
              }
              className="focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            >
              {strengthMetrics.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <TrendChart
            id="strength-metric"
            points={strengthMetricPoints}
            color={selectedStrengthMetric.color}
            unit={selectedStrengthMetric.unit}
            label={`${activeExerciseName || "Упражнение"}: ${selectedStrengthMetric.label}`}
            emptyText="Для выбранного упражнения пока нет силовых данных."
          />
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">
              История силовых данных
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Все упражнения, веса, повторы и интенсивность выбранного клиента
            </p>
          </div>
        </div>

        {selectedClientStrengthSets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
            Данные появятся после добавления структурированной программы
            тренировок.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  <th className="px-3 py-3 font-semibold">Дата</th>
                  <th className="px-3 py-3 font-semibold">Упражнение</th>
                  <th className="px-3 py-3 font-semibold">Подход</th>
                  <th className="px-3 py-3 font-semibold">Вес</th>
                  <th className="px-3 py-3 font-semibold">Повторы</th>
                  <th className="px-3 py-3 font-semibold">Интенсивность</th>
                  <th className="px-3 py-3 font-semibold">Тоннаж</th>
                </tr>
              </thead>
              <tbody>
                {[...selectedClientStrengthSets]
                  .sort((firstSet, secondSet) =>
                    secondSet.trainingDate.localeCompare(firstSet.trainingDate),
                  )
                  .map((setRow) => (
                    <tr
                      key={setRow.id}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text-muted)]">
                        {formatDate(setRow.trainingDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--text)]">
                        {setRow.exerciseName}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">
                        {setRow.setNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text-muted)]">
                        {formatNumber(setRow.weightKg)} кг
                      </td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">
                        {setRow.repetitions}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${intensityClasses[setRow.intensity]}`}
                        >
                          {intensityLabels[setRow.intensity]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text-muted)]">
                        {formatNumber(setRow.tonnageKg)} кг
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">
            Сводка по клиентам
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Последние замеры тела по всем клиентам
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
            Клиенты появятся после добавления первой карточки.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {clients.map((client) => {
              const latest = latestMeasurements.get(client.id);

              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={[
                    "focus-ring rounded-lg border p-4 text-left transition",
                    selectedClientId === client.id
                      ? "border-[var(--accent)] bg-blue-50"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold text-[var(--text)]">
                      {client.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {latest ? formatDate(latest.measuredAt) : "Нет замеров"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                      <span className="block text-xs text-[var(--text-muted)]">
                        Вес
                      </span>
                      <span className="mt-1 block font-semibold text-[var(--text)]">
                        {formatNumber(latest?.weightKg ?? client.currentWeight)}{" "}
                        кг
                      </span>
                    </span>
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                      <span className="block text-xs text-[var(--text-muted)]">
                        Талия
                      </span>
                      <span className="mt-1 block font-semibold text-[var(--text)]">
                        {formatNumber(latest?.waistCm ?? null)} см
                      </span>
                    </span>
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                      <span className="block text-xs text-[var(--text-muted)]">
                        Жир
                      </span>
                      <span className="mt-1 block font-semibold text-[var(--text)]">
                        {formatNumber(latest?.bodyFatPercent ?? null)} %
                      </span>
                    </span>
                    <span className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                      <span className="block text-xs text-[var(--text-muted)]">
                        Жировая масса
                      </span>
                      <span className="mt-1 block font-semibold text-[var(--text)]">
                        {formatNumber(
                          latest
                            ? getBodyMetricValue(latest, "fatMassKg")
                            : null,
                        )}{" "}
                        кг
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default Analytics;
