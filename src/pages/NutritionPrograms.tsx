import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type ClientRow,
  type NewNutritionMealItemRow,
  type NewNutritionMealRow,
  type NewNutritionProgramRow,
  type NutritionMealItemRow,
  type NutritionMealRow,
  type NutritionMealType,
  type NutritionProgramRow,
  type NutritionProgramStatus,
} from "../lib/supabase";

type NutritionClient = {
  id: string;
  firstName: string;
  secondName: string;
};

type NutritionProgram = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetFatG: number | null;
  targetCarbsG: number | null;
  status: NutritionProgramStatus;
  createdAt: string;
  updatedAt: string;
};

type NutritionMealItem = {
  id: string;
  mealId: string;
  foodName: string;
  amountG: number;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  orderIndex: number;
};

type NutritionMeal = {
  id: string;
  nutritionProgramId: string;
  mealType: NutritionMealType;
  name: string;
  mealTime: string;
  orderIndex: number;
  notes: string;
  items: NutritionMealItem[];
};

type NutritionItemDraft = {
  id: string;
  foodName: string;
  amountG: string;
  calories: string;
  proteinG: string;
  fatG: string;
  carbsG: string;
};

type NutritionTotals = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const inputClass =
  "focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 text-[var(--text)] outline-none transition focus:border-[var(--accent)]";
const compactInputClass =
  "focus-ring min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]";
const textareaClass =
  "focus-ring min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]";

const mealTypeLabels: Record<NutritionMealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

const mealTypeClasses: Record<NutritionMealType, string> = {
  breakfast: "bg-amber-50 text-amber-700",
  lunch: "bg-emerald-50 text-emerald-700",
  dinner: "bg-blue-50 text-blue-700",
  snack: "bg-violet-50 text-violet-700",
};

const statusLabels: Record<NutritionProgramStatus, string> = {
  draft: "Черновик",
  active: "Активный",
  archived: "Архив",
};

const statusClasses: Record<NutritionProgramStatus, string> = {
  draft: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
};

const metricFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

const formatMetricNumber = (value: number | null) =>
  value === null ? "—" : metricFormatter.format(value);

const parseOptionalNumber = (value: string) => {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const createDraftId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createItemDraft = (): NutritionItemDraft => ({
  id: createDraftId(),
  foodName: "",
  amountG: "",
  calories: "",
  proteinG: "",
  fatG: "",
  carbsG: "",
});

const mapClientRow = (row: ClientRow): NutritionClient => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
});

const mapProgramRow = (row: NutritionProgramRow): NutritionProgram => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  description: row.description ?? "",
  targetCalories: row.target_calories === null ? null : Number(row.target_calories),
  targetProteinG:
    row.target_protein_g === null ? null : Number(row.target_protein_g),
  targetFatG: row.target_fat_g === null ? null : Number(row.target_fat_g),
  targetCarbsG: row.target_carbs_g === null ? null : Number(row.target_carbs_g),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMealItemRow = (row: NutritionMealItemRow): NutritionMealItem => ({
  id: row.id,
  mealId: row.meal_id,
  foodName: row.food_name,
  amountG: Number(row.amount_g),
  calories: row.calories === null ? null : Number(row.calories),
  proteinG: row.protein_g === null ? null : Number(row.protein_g),
  fatG: row.fat_g === null ? null : Number(row.fat_g),
  carbsG: row.carbs_g === null ? null : Number(row.carbs_g),
  orderIndex: row.order_index,
});

const mapMealRow = (row: NutritionMealRow): NutritionMeal => ({
  id: row.id,
  nutritionProgramId: row.nutrition_program_id,
  mealType: row.meal_type,
  name: row.name,
  mealTime: row.meal_time ?? "",
  orderIndex: row.order_index,
  notes: row.notes ?? "",
  items: [],
});

const emptyTotals: NutritionTotals = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
};

const getMealTotals = (meal: NutritionMeal): NutritionTotals =>
  meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + (item.calories ?? 0),
      proteinG: totals.proteinG + (item.proteinG ?? 0),
      fatG: totals.fatG + (item.fatG ?? 0),
      carbsG: totals.carbsG + (item.carbsG ?? 0),
    }),
    emptyTotals,
  );

const getPlanTotals = (meals: NutritionMeal[]): NutritionTotals =>
  meals.reduce(
    (totals, meal) => {
      const mealTotals = getMealTotals(meal);

      return {
        calories: totals.calories + mealTotals.calories,
        proteinG: totals.proteinG + mealTotals.proteinG,
        fatG: totals.fatG + mealTotals.fatG,
        carbsG: totals.carbsG + mealTotals.carbsG,
      };
    },
    emptyTotals,
  );

const getProgressPercent = (value: number, target: number | null) =>
  target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function NutritionPrograms() {
  const [clients, setClients] = useState<NutritionClient[]>([]);
  const [programs, setPrograms] = useState<NutritionProgram[]>([]);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [programStatus, setProgramStatus] =
    useState<NutritionProgramStatus>("active");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProteinG, setTargetProteinG] = useState("");
  const [targetFatG, setTargetFatG] = useState("");
  const [targetCarbsG, setTargetCarbsG] = useState("");
  const [mealType, setMealType] = useState<NutritionMealType>("breakfast");
  const [mealName, setMealName] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [itemDrafts, setItemDrafts] = useState<NutritionItemDraft[]>(() => [
    createItemDraft(),
  ]);
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isProgramsLoading, setIsProgramsLoading] = useState(false);
  const [isMealsLoading, setIsMealsLoading] = useState(false);
  const [isProgramSaving, setIsProgramSaving] = useState(false);
  const [isMealSaving, setIsMealSaving] = useState(false);
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

    const loadPrograms = async () => {
      if (!selectedClientId) {
        setPrograms([]);
        setMeals([]);
        setSelectedProgramId("");
        setIsProgramsLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        return;
      }

      setIsProgramsLoading(true);
      const { data, error } = await supabase
        .from("nutrition_programs")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(
          "Не удалось загрузить планы питания. Проверьте, применена ли миграция 007.",
        );
        setPrograms([]);
        setMeals([]);
        setSelectedProgramId("");
      } else {
        const nextPrograms = (
          (data ?? []) as NutritionProgramRow[]
        ).map(mapProgramRow);

        setErrorMessage(null);
        setPrograms(nextPrograms);
        setSelectedProgramId((currentProgramId) =>
          currentProgramId &&
          nextPrograms.some((program) => program.id === currentProgramId)
            ? currentProgramId
            : nextPrograms[0]?.id ?? "",
        );
      }

      setIsProgramsLoading(false);
    };

    loadPrograms();

    return () => {
      isMounted = false;
    };
  }, [selectedClientId]);

  useEffect(() => {
    let isMounted = true;

    const loadMeals = async () => {
      if (!selectedProgramId) {
        setMeals([]);
        setIsMealsLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        return;
      }

      setIsMealsLoading(true);
      const { data: mealData, error: mealError } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("nutrition_program_id", selectedProgramId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (mealError) {
        setErrorMessage("Не удалось загрузить приемы пищи.");
        setMeals([]);
        setIsMealsLoading(false);
        return;
      }

      const mealRows = (mealData ?? []) as NutritionMealRow[];

      if (mealRows.length === 0) {
        setErrorMessage(null);
        setMeals([]);
        setIsMealsLoading(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("nutrition_meal_items")
        .select("*")
        .in(
          "meal_id",
          mealRows.map((meal) => meal.id),
        )
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (itemError) {
        setErrorMessage("Не удалось загрузить продукты приемов пищи.");
        setMeals(mealRows.map(mapMealRow));
      } else {
        const itemsByMealId = (
          (itemData ?? []) as NutritionMealItemRow[]
        ).reduce<Map<string, NutritionMealItem[]>>((items, row) => {
          const item = mapMealItemRow(row);
          items.set(item.mealId, [...(items.get(item.mealId) ?? []), item]);
          return items;
        }, new Map());

        setErrorMessage(null);
        setMeals(
          mealRows.map((row) => ({
            ...mapMealRow(row),
            items: itemsByMealId.get(row.id) ?? [],
          })),
        );
      }

      setIsMealsLoading(false);
    };

    loadMeals();

    return () => {
      isMounted = false;
    };
  }, [selectedProgramId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedProgram = programs.find(
    (program) => program.id === selectedProgramId,
  );
  const planTotals = useMemo(() => getPlanTotals(meals), [meals]);
  const productCount = meals.reduce((total, meal) => total + meal.items.length, 0);

  const resetProgramForm = () => {
    setProgramTitle("");
    setProgramDescription("");
    setProgramStatus("active");
    setTargetCalories("");
    setTargetProteinG("");
    setTargetFatG("");
    setTargetCarbsG("");
  };

  const resetMealForm = () => {
    setMealType("breakfast");
    setMealName("");
    setMealTime("");
    setMealNotes("");
    setItemDrafts([createItemDraft()]);
  };

  const validateOptionalTargets = () => {
    const values = [
      ["Калории", targetCalories],
      ["Белки", targetProteinG],
      ["Жиры", targetFatG],
      ["Углеводы", targetCarbsG],
    ];

    const hasInvalidValue = values.some(([, value]) => {
      const parsedValue = parseOptionalNumber(value);
      return parsedValue !== null && parsedValue < 0;
    });

    if (hasInvalidValue) {
      setErrorMessage("Целевые показатели не могут быть отрицательными.");
      return false;
    }

    return true;
  };

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

    if (!programTitle.trim() || !validateOptionalTargets()) {
      return;
    }

    const payload: NewNutritionProgramRow = {
      client_id: selectedClientId,
      title: programTitle.trim(),
      description: programDescription.trim() || null,
      target_calories: parseOptionalNumber(targetCalories),
      target_protein_g: parseOptionalNumber(targetProteinG),
      target_fat_g: parseOptionalNumber(targetFatG),
      target_carbs_g: parseOptionalNumber(targetCarbsG),
      status: programStatus,
    };

    setIsProgramSaving(true);
    const { data, error } = await supabase
      .from("nutrition_programs")
      .insert(payload)
      .select()
      .single();
    setIsProgramSaving(false);

    if (error || !data) {
      setErrorMessage("Не удалось создать план питания.");
      return;
    }

    const createdProgram = mapProgramRow(data as NutritionProgramRow);

    setErrorMessage(null);
    setPrograms((currentPrograms) => [createdProgram, ...currentPrograms]);
    setSelectedProgramId(createdProgram.id);
    resetProgramForm();
  };

  const handleUpdateProgramStatus = async (
    status: NutritionProgramStatus,
  ) => {
    if (!selectedProgram || !isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { data, error } = await supabase
      .from("nutrition_programs")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProgram.id)
      .select()
      .single();

    if (error || !data) {
      setErrorMessage("Не удалось обновить статус плана.");
      return;
    }

    const updatedProgram = mapProgramRow(data as NutritionProgramRow);
    setErrorMessage(null);
    setPrograms((currentPrograms) =>
      currentPrograms.map((program) =>
        program.id === updatedProgram.id ? updatedProgram : program,
      ),
    );
  };

  const handleDeleteProgram = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase
      .from("nutrition_programs")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить план питания.");
      return;
    }

    const nextPrograms = programs.filter((program) => program.id !== id);

    setErrorMessage(null);
    setPrograms(nextPrograms);
    setSelectedProgramId(
      selectedProgramId === id ? nextPrograms[0]?.id ?? "" : selectedProgramId,
    );
  };

  const handleItemDraftChange = (
    id: string,
    field: keyof Omit<NutritionItemDraft, "id">,
    value: string,
  ) => {
    setItemDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === id ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const buildMealItemPayloads = (): Omit<
    NewNutritionMealItemRow,
    "meal_id"
  >[] | null => {
    const normalizedItems = itemDrafts.map((draft, index) => ({
      draft,
      index,
      amountG: parseOptionalNumber(draft.amountG),
      calories: parseOptionalNumber(draft.calories),
      proteinG: parseOptionalNumber(draft.proteinG),
      fatG: parseOptionalNumber(draft.fatG),
      carbsG: parseOptionalNumber(draft.carbsG),
    }));

    const hasInvalidItem = normalizedItems.some(
      ({ draft, amountG, calories, proteinG, fatG, carbsG }) =>
        !draft.foodName.trim() ||
        amountG === null ||
        amountG <= 0 ||
        [calories, proteinG, fatG, carbsG].some(
          (value) => value !== null && value < 0,
        ),
    );

    if (hasInvalidItem) {
      setErrorMessage(
        "Проверьте продукты: название и граммовка обязательны, числовые значения не могут быть отрицательными.",
      );
      return null;
    }

    return normalizedItems.map(
      ({ draft, index, amountG, calories, proteinG, fatG, carbsG }) => ({
        food_name: draft.foodName.trim(),
        amount_g: amountG ?? 0,
        calories,
        protein_g: proteinG,
        fat_g: fatG,
        carbs_g: carbsG,
        order_index: index,
      }),
    );
  };

  const handleCreateMeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    if (!selectedProgramId) {
      setErrorMessage("Сначала создайте или выберите план питания.");
      return;
    }

    const itemPayloads = buildMealItemPayloads();

    if (!mealName.trim() || !itemPayloads) {
      if (!mealName.trim()) {
        setErrorMessage("Укажите название приема пищи.");
      }
      return;
    }

    const mealPayload: NewNutritionMealRow = {
      nutrition_program_id: selectedProgramId,
      meal_type: mealType,
      name: mealName.trim(),
      meal_time: mealTime || null,
      order_index: meals.length,
      notes: mealNotes.trim() || null,
    };

    setIsMealSaving(true);
    const { data, error } = await supabase
      .from("nutrition_meals")
      .insert(mealPayload)
      .select()
      .single();

    if (error || !data) {
      setIsMealSaving(false);
      setErrorMessage("Не удалось создать прием пищи.");
      return;
    }

    const createdMeal = mapMealRow(data as NutritionMealRow);
    const { data: itemData, error: itemError } = await supabase
      .from("nutrition_meal_items")
      .insert(
        itemPayloads.map((item) => ({
          ...item,
          meal_id: createdMeal.id,
        })),
      )
      .select();

    if (itemError || !itemData) {
      await supabase.from("nutrition_meals").delete().eq("id", createdMeal.id);
      setIsMealSaving(false);
      setErrorMessage("Не удалось сохранить продукты приема пищи.");
      return;
    }

    setErrorMessage(null);
    setIsMealSaving(false);
    setMeals((currentMeals) => [
      ...currentMeals,
      {
        ...createdMeal,
        items: (itemData as NutritionMealItemRow[]).map(mapMealItemRow),
      },
    ]);
    resetMealForm();
  };

  const handleDeleteMeal = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase
      .from("nutrition_meals")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить прием пищи.");
      return;
    }

    setErrorMessage(null);
    setMeals((currentMeals) => currentMeals.filter((meal) => meal.id !== id));
  };

  const renderTargetCard = (
    label: string,
    value: number,
    target: number | null,
    unit: string,
    accent: string,
  ) => (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--text-muted)]">
          {label}
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--text)]">
        {formatMetricNumber(value)}
        <span className="ml-1 text-sm font-medium text-[var(--text-muted)]">
          {unit}
        </span>
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Цель: {formatMetricNumber(target)} {unit}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${accent} transition-all`}
          style={{ width: `${getProgressPercent(value, target)}%` }}
        />
      </div>
    </div>
  );

  const targetFields: Array<{
    label: string;
    value: string;
    setter: (nextValue: string) => void;
  }> = [
    { label: "Калории, ккал", value: targetCalories, setter: setTargetCalories },
    { label: "Белки, г", value: targetProteinG, setter: setTargetProteinG },
    { label: "Жиры, г", value: targetFatG, setter: setTargetFatG },
    { label: "Углеводы, г", value: targetCarbsG, setter: setTargetCarbsG },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Питание
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
          Планы питания
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Создавайте рацион под клиента, распределяйте продукты по приемам пищи
          и сразу контролируйте калории и БЖУ.
        </p>
      </div>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Клиенты</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">
            {clients.length}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Планы выбранного клиента</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">
            {programs.length}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Активные планы</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">
            {programs.filter((program) => program.status === "active").length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <label className="block max-w-xl">
          <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
            Клиент
          </span>
          <select
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            disabled={clients.length === 0}
            className={inputClass}
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-5">
          <form
            onSubmit={handleCreateProgram}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-[var(--text)]">
              Новый план
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {selectedClient
                ? `Для клиента ${selectedClient.firstName} ${selectedClient.secondName}`
                : "Выберите клиента, чтобы создать план."}
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Название
              </span>
              <input
                required
                value={programTitle}
                onChange={(event) => setProgramTitle(event.target.value)}
                placeholder="Например: Дефицит на 4 недели"
                className={inputClass}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Описание
              </span>
              <textarea
                value={programDescription}
                onChange={(event) => setProgramDescription(event.target.value)}
                placeholder="Цель, ограничения, рекомендации..."
                className={textareaClass}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {targetFields.map(({ label, value, setter }) => (
                <label key={label} className="block min-w-0">
                  <span className="mb-2 block text-xs font-semibold text-[var(--text-muted)]">
                    {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={value}
                    onChange={(event) => setter(event.target.value)}
                    className={compactInputClass}
                  />
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Статус
              </span>
              <select
                value={programStatus}
                onChange={(event) =>
                  setProgramStatus(event.target.value as NutritionProgramStatus)
                }
                className={inputClass}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isProgramSaving || !selectedClientId}
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon />
              {isProgramSaving ? "Создаем..." : "Создать план"}
            </button>
          </form>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Планы клиента
            </h2>
            {isProgramsLoading ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Загружаем планы...
              </p>
            ) : programs.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--text-muted)]">
                У выбранного клиента пока нет планов питания.
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
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 font-bold text-[var(--text)]">
                          {program.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses[program.status]}`}
                        >
                          {statusLabels[program.status]}
                        </span>
                      </span>
                      <span className="mt-2 block text-sm text-[var(--text-muted)]">
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
          {!selectedProgram ? (
            <section className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
              <h2 className="text-xl font-bold text-[var(--text)]">
                План питания не выбран
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
                Создайте новый план слева или выберите существующий, чтобы
                добавить приемы пищи.
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-muted)]">
                        План питания
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[selectedProgram.status]}`}
                      >
                        {statusLabels[selectedProgram.status]}
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
                      {selectedProgram.title}
                    </h2>
                    {selectedProgram.description && (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        {selectedProgram.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedProgram.status}
                      onChange={(event) =>
                        handleUpdateProgramStatus(
                          event.target.value as NutritionProgramStatus,
                        )
                      }
                      className={`${compactInputClass} min-w-36`}
                      aria-label="Статус плана питания"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteProgram(selectedProgram.id)}
                      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-100 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <TrashIcon />
                      Удалить
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {renderTargetCard(
                  "Калории",
                  planTotals.calories,
                  selectedProgram.targetCalories,
                  "ккал",
                  "bg-[var(--warm)]",
                )}
                {renderTargetCard(
                  "Белки",
                  planTotals.proteinG,
                  selectedProgram.targetProteinG,
                  "г",
                  "bg-[var(--accent)]",
                )}
                {renderTargetCard(
                  "Жиры",
                  planTotals.fatG,
                  selectedProgram.targetFatG,
                  "г",
                  "bg-[var(--teal)]",
                )}
                {renderTargetCard(
                  "Углеводы",
                  planTotals.carbsG,
                  selectedProgram.targetCarbsG,
                  "г",
                  "bg-violet-500",
                )}
              </section>

              <form
                onSubmit={handleCreateMeal}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-[var(--text)]">
                    Добавить прием пищи
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Заполните продукты и их пищевую ценность на указанную
                    граммовку.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[150px_minmax(0,1fr)_130px]">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                      Тип
                    </span>
                    <select
                      value={mealType}
                      onChange={(event) =>
                        setMealType(event.target.value as NutritionMealType)
                      }
                      className={inputClass}
                    >
                      {Object.entries(mealTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                      Название приема
                    </span>
                    <input
                      required
                      value={mealName}
                      onChange={(event) => setMealName(event.target.value)}
                      placeholder="Например: Овсянка с ягодами"
                      className={inputClass}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                      Время
                    </span>
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(event) => setMealTime(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                    Заметки
                  </span>
                  <textarea
                    value={mealNotes}
                    onChange={(event) => setMealNotes(event.target.value)}
                    placeholder="Способ приготовления, замены, рекомендации..."
                    className="focus-ring min-h-20 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--border)]">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[minmax(180px,1.7fr)_100px_repeat(4,minmax(90px,1fr))_44px] gap-2 bg-[var(--surface-soft)] px-3 py-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      <span>Продукт</span>
                      <span>Граммы</span>
                      <span>Ккал</span>
                      <span>Белки</span>
                      <span>Жиры</span>
                      <span>Углеводы</span>
                      <span />
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {itemDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="grid grid-cols-[minmax(180px,1.7fr)_100px_repeat(4,minmax(90px,1fr))_44px] gap-2 px-3 py-3"
                        >
                          {(
                            [
                              ["foodName", "Куриная грудка"],
                              ["amountG", "150"],
                              ["calories", "248"],
                              ["proteinG", "46"],
                              ["fatG", "5"],
                              ["carbsG", "0"],
                            ] as const
                          ).map(([field, placeholder]) => (
                            <input
                              key={field}
                              type={field === "foodName" ? "text" : "number"}
                              min={field === "foodName" ? undefined : "0"}
                              step={field === "foodName" ? undefined : "0.1"}
                              value={draft[field]}
                              onChange={(event) =>
                                handleItemDraftChange(
                                  draft.id,
                                  field,
                                  event.target.value,
                                )
                              }
                              placeholder={placeholder}
                              className={compactInputClass}
                              aria-label={field}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setItemDrafts((currentDrafts) =>
                                currentDrafts.length === 1
                                  ? currentDrafts
                                  : currentDrafts.filter(
                                      (item) => item.id !== draft.id,
                                    ),
                              )
                            }
                            disabled={itemDrafts.length === 1}
                            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Удалить продукт"
                            title="Удалить продукт"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setItemDrafts((currentDrafts) => [
                        ...currentDrafts,
                        createItemDraft(),
                      ])
                    }
                    className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <PlusIcon />
                    Добавить продукт
                  </button>
                  <button
                    type="submit"
                    disabled={isMealSaving}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusIcon />
                    {isMealSaving ? "Сохраняем..." : "Добавить прием пищи"}
                  </button>
                </div>
              </form>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text)]">
                      Приемы пищи
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {meals.length} приемов, {productCount} продуктов
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-tint)] px-3 py-2 text-sm font-semibold text-[var(--teal)]">
                    Итого: {formatMetricNumber(planTotals.calories)} ккал
                  </div>
                </div>

                {isMealsLoading ? (
                  <p className="mt-5 text-sm text-[var(--text-muted)]">
                    Загружаем приемы пищи...
                  </p>
                ) : meals.length === 0 ? (
                  <p className="mt-5 rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-5 text-sm text-[var(--text-muted)]">
                    В этом плане пока нет приемов пищи. Добавьте первый прием
                    выше.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {meals.map((meal) => {
                      const mealTotals = getMealTotals(meal);

                      return (
                        <article
                          key={meal.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${mealTypeClasses[meal.mealType]}`}
                                >
                                  {mealTypeLabels[meal.mealType]}
                                </span>
                                {meal.mealTime && (
                                  <span className="text-sm font-semibold text-[var(--text-muted)]">
                                    {meal.mealTime}
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-2 text-base font-bold text-[var(--text)]">
                                {meal.name}
                              </h3>
                              {meal.notes && (
                                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                  {meal.notes}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="focus-ring inline-flex min-h-9 items-center gap-2 self-start rounded-lg border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              <TrashIcon />
                              Удалить
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                              ["Ккал", mealTotals.calories],
                              ["Белки", mealTotals.proteinG],
                              ["Жиры", mealTotals.fatG],
                              ["Углеводы", mealTotals.carbsG],
                            ].map(([label, value]) => (
                              <div
                                key={String(label)}
                                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2"
                              >
                                <p className="text-xs text-[var(--text-muted)]">
                                  {label}
                                </p>
                                <p className="mt-1 font-bold text-[var(--text)]">
                                  {formatMetricNumber(Number(value))}
                                  <span className="ml-1 text-xs font-medium text-[var(--text-muted)]">
                                    {label === "Ккал" ? "ккал" : "г"}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
                            <table className="w-full min-w-[620px] text-left text-sm">
                              <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                                <tr>
                                  <th className="px-3 py-3 font-bold">Продукт</th>
                                  <th className="px-3 py-3 font-bold">Граммы</th>
                                  <th className="px-3 py-3 font-bold">Ккал</th>
                                  <th className="px-3 py-3 font-bold">Б</th>
                                  <th className="px-3 py-3 font-bold">Ж</th>
                                  <th className="px-3 py-3 font-bold">У</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border)]">
                                {meal.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-3 py-3 font-semibold text-[var(--text)]">
                                      {item.foodName}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-muted)]">
                                      {formatMetricNumber(item.amountG)} г
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-muted)]">
                                      {formatMetricNumber(item.calories)}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-muted)]">
                                      {formatMetricNumber(item.proteinG)}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-muted)]">
                                      {formatMetricNumber(item.fatG)}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-muted)]">
                                      {formatMetricNumber(item.carbsG)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

export default NutritionPrograms;
