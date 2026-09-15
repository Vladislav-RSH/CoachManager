import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type ClientMeasurementRow,
  type ClientRow,
  type NewClientMeasurementRow,
  type NewClientRow,
} from "../lib/supabase";

type ClientMeasurement = {
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
  notes: string;
};

type Client = {
  id: string;
  firstName: string;
  secondName: string;
  date: string;
  height: number | null;
  currentWeight: number | null;
  desiredWeight: number | null;
  goal: string;
  measurements: ClientMeasurement[];
};

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

const inputClass =
  "focus-ring min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5 text-[var(--text)] outline-none transition focus:border-[var(--accent)]";

const todayDateKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

const toNullableNumber = (value: FormDataEntryValue | null) => {
  const textValue = String(value ?? "").trim().replace(",", ".");

  if (!textValue) {
    return null;
  }

  const parsedValue = Number(textValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const measurementFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const formatMeasurementValue = (value: number | null, unit: string) =>
  value === null ? "—" : `${measurementFormatter.format(value)} ${unit}`;

const formatMeasurementDate = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const mapMeasurementRow = (
  row: ClientMeasurementRow,
): ClientMeasurement => ({
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
  notes: row.notes ?? "",
});

const mapClientRow = (
  row: ClientRow,
  measurements: ClientMeasurement[] = [],
): Client => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
  date: row.birth_date ?? "",
  height: row.height === null ? null : Number(row.height),
  currentWeight:
    row.current_weight === null ? null : Number(row.current_weight),
  desiredWeight:
    row.desired_weight === null ? null : Number(row.desired_weight),
  goal: row.goal ?? "",
  measurements,
});

const sortMeasurements = (measurements: ClientMeasurement[]) =>
  [...measurements].sort((firstMeasurement, secondMeasurement) =>
    secondMeasurement.measuredAt.localeCompare(firstMeasurement.measuredAt),
  );

const mergeMeasurement = (
  client: Client,
  measurement: ClientMeasurement,
): Client => ({
  ...client,
  measurements: sortMeasurements([
    measurement,
    ...client.measurements.filter(
      (existingMeasurement) =>
        existingMeasurement.measuredAt !== measurement.measuredAt,
    ),
  ]),
});

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m20 20-4.2-4.2M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

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

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m4 16.5-.8 3.3 3.3-.8L17.8 7.7a2.1 2.1 0 0 0-3-3L3.5 16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      const [clientsResponse, measurementsResponse] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("client_measurements")
          .select("*")
          .order("measured_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      const measurementRows = measurementsResponse.error
        ? []
        : ((measurementsResponse.data ?? []) as ClientMeasurementRow[]).map(
            mapMeasurementRow,
          );
      const measurementsByClientId = measurementRows.reduce<
        Record<string, ClientMeasurement[]>
      >((measurements, measurement) => {
        measurements[measurement.clientId] = [
          ...(measurements[measurement.clientId] ?? []),
          measurement,
        ];

        return measurements;
      }, {});

      if (clientsResponse.error) {
        setErrorMessage("Не удалось загрузить клиентов из Supabase.");
        setClients([]);
      } else {
        const nextClients = (
          (clientsResponse.data ?? []) as ClientRow[]
        ).map((clientRow) =>
          mapClientRow(clientRow, measurementsByClientId[clientRow.id] ?? []),
        );

        setClients(nextClients);
        setErrorMessage(
          measurementsResponse.error
            ? "Клиенты загружены, но замеры недоступны. Выполните миграцию 006_create_client_measurements.sql."
            : null,
        );
      }

      setIsLoading(false);
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const searchableText = `${client.firstName} ${client.secondName} ${
        client.goal
      }`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [clients, query]);

  const editingClient = clients.find((client) => client.id === editingClientId);
  const latestMeasurement = editingClient?.measurements[0];

  const openCreateForm = () => {
    setEditingClientId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClientId(client.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (!isSaving) {
      setIsFormOpen(false);
      setEditingClientId(null);
    }
  };

  const handleSaveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const height = toNullableNumber(formData.get("height"));
    const currentWeight = toNullableNumber(formData.get("currentWeight"));
    const desiredWeight = toNullableNumber(formData.get("desiredWeight"));
    const measurementWeight = toNullableNumber(
      formData.get("measurementWeight"),
    );
    const chest = toNullableNumber(formData.get("chest"));
    const waist = toNullableNumber(formData.get("waist"));
    const hips = toNullableNumber(formData.get("hips"));
    const arm = toNullableNumber(formData.get("arm"));
    const thigh = toNullableNumber(formData.get("thigh"));
    const bodyFat = toNullableNumber(formData.get("bodyFat"));
    const numericValues = [
      height,
      currentWeight,
      desiredWeight,
      measurementWeight,
      chest,
      waist,
      hips,
      arm,
      thigh,
      bodyFat,
    ];

    if (
      numericValues.some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0),
      ) ||
      (bodyFat !== null && bodyFat > 100)
    ) {
      setErrorMessage(
        "Проверьте числовые значения: они не могут быть отрицательными, а процент жира должен быть от 0 до 100.",
      );
      return;
    }

    const measurementDate =
      String(formData.get("measurementDate") ?? "").trim() || todayDateKey();
    const measurementNotes =
      String(formData.get("measurementNotes") ?? "").trim();
    const hasMeasurementValues =
      numericValues.slice(3).some((value) => value !== null) ||
      measurementNotes.length > 0;
    const isEditingExistingMeasurement = Boolean(
      editingClient?.measurements.some(
        (measurement) => measurement.measuredAt === measurementDate,
      ),
    );
    const shouldSaveMeasurement =
      hasMeasurementValues || isEditingExistingMeasurement;

    const clientPayload: NewClientRow = {
      first_name: String(formData.get("firstName") ?? "").trim(),
      second_name: String(formData.get("secondName") ?? "").trim(),
      birth_date: String(formData.get("date") ?? "") || null,
      height,
      current_weight: currentWeight,
      desired_weight: desiredWeight,
      goal: String(formData.get("goal") ?? "").trim() || null,
    };

    setIsSaving(true);

    const clientResponse = editingClientId
      ? await supabase
          .from("clients")
          .update(clientPayload)
          .eq("id", editingClientId)
          .select()
          .single()
      : await supabase.from("clients").insert(clientPayload).select().single();

    if (clientResponse.error || !clientResponse.data) {
      setIsSaving(false);
      setErrorMessage(
        editingClientId
          ? "Не удалось обновить клиента в Supabase."
          : "Не удалось создать клиента в Supabase.",
      );
      return;
    }

    const savedClientId = (clientResponse.data as ClientRow).id;
    const previousMeasurements = editingClient?.measurements ?? [];
    let savedMeasurement: ClientMeasurement | null = null;

    if (shouldSaveMeasurement) {
      const measurementPayload: NewClientMeasurementRow = {
        client_id: savedClientId,
        measured_at: measurementDate,
        weight_kg: measurementWeight,
        chest_cm: chest,
        waist_cm: waist,
        hips_cm: hips,
        arm_cm: arm,
        thigh_cm: thigh,
        body_fat_percent: bodyFat,
        notes: measurementNotes || null,
      };
      const measurementResponse = await supabase
        .from("client_measurements")
        .upsert(measurementPayload, {
          onConflict: "client_id,measured_at",
        })
        .select()
        .single();

      if (measurementResponse.error || !measurementResponse.data) {
        const savedClient = mapClientRow(
          clientResponse.data as ClientRow,
          previousMeasurements,
        );

        setClients((currentClients) =>
          editingClientId
            ? currentClients.map((client) =>
                client.id === savedClient.id ? savedClient : client,
              )
            : [savedClient, ...currentClients],
        );
        setIsSaving(false);
        setErrorMessage(
          "Данные клиента сохранены, но замер не удалось сохранить.",
        );
        return;
      }

      savedMeasurement = mapMeasurementRow(
        measurementResponse.data as ClientMeasurementRow,
      );
    }

    let savedClient = mapClientRow(
      clientResponse.data as ClientRow,
      previousMeasurements,
    );

    if (savedMeasurement) {
      savedClient = mergeMeasurement(savedClient, savedMeasurement);
    }

    setClients((currentClients) =>
      editingClientId
        ? currentClients.map((client) =>
            client.id === savedClient.id ? savedClient : client,
          )
        : [savedClient, ...currentClients],
    );
    setErrorMessage(null);
    setIsSaving(false);
    setIsFormOpen(false);
    setEditingClientId(null);
    form.reset();
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      setErrorMessage("Не удалось удалить клиента из Supabase.");
      return;
    }

    setErrorMessage(null);
    setClients((currentClients) =>
      currentClients.filter((client) => client.id !== id),
    );
  };

  return (
    <section className="space-y-6">
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/55 px-4 py-4 backdrop-blur-sm sm:py-8"
          onClick={closeForm}
        >
          <div className="flex min-h-full items-start justify-center">
            <form
              key={editingClientId ?? "new-client"}
              className="w-full max-w-3xl rounded-lg bg-[var(--surface)] p-5 text-[var(--text)] shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
              onSubmit={handleSaveClient}
            >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                  {editingClient ? "Карточка клиента" : "Новый клиент"}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {editingClient
                    ? `${editingClient.firstName} ${editingClient.secondName}`
                    : "Добавить клиента"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                title="Закрыть форму"
                aria-label="Закрыть форму"
                className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Имя
                </span>
                <input
                  type="text"
                  name="firstName"
                  required
                  defaultValue={editingClient?.firstName ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Фамилия
                </span>
                <input
                  type="text"
                  name="secondName"
                  required
                  defaultValue={editingClient?.secondName ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Дата рождения
                </span>
                <input
                  type="date"
                  name="date"
                  defaultValue={editingClient?.date ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Рост, см
                </span>
                <input
                  type="number"
                  name="height"
                  min="0"
                  step="0.1"
                  defaultValue={editingClient?.height ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Текущий вес, кг
                </span>
                <input
                  type="number"
                  name="currentWeight"
                  min="0"
                  step="0.1"
                  defaultValue={editingClient?.currentWeight ?? ""}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Желаемый вес, кг
                </span>
                <input
                  type="number"
                  name="desiredWeight"
                  min="0"
                  step="0.1"
                  defaultValue={editingClient?.desiredWeight ?? ""}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold">Цель</span>
              <textarea
                name="goal"
                defaultValue={editingClient?.goal ?? ""}
                className="focus-ring min-h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                placeholder="Набор массы, похудение, восстановление..."
              />
            </label>

            <div className="mt-6 rounded-lg border border-[var(--border)] bg-white/70 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                    Измерения
                  </p>
                  <h3 className="mt-1 text-lg font-bold">Замеры тела</h3>
                </div>
                {latestMeasurement && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Последний: {formatMeasurementDate(latestMeasurement.measuredAt)}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Дата замера
                  </span>
                  <input
                    type="date"
                    name="measurementDate"
                    required
                    defaultValue={latestMeasurement?.measuredAt ?? todayDateKey()}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Вес на дату замера, кг
                  </span>
                  <input
                    type="number"
                    name="measurementWeight"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.weightKg ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Грудь, см
                  </span>
                  <input
                    type="number"
                    name="chest"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.chestCm ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Талия, см
                  </span>
                  <input
                    type="number"
                    name="waist"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.waistCm ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Бедра, см
                  </span>
                  <input
                    type="number"
                    name="hips"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.hipsCm ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Рука, см
                  </span>
                  <input
                    type="number"
                    name="arm"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.armCm ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Бедро, см
                  </span>
                  <input
                    type="number"
                    name="thigh"
                    min="0"
                    step="0.1"
                    defaultValue={latestMeasurement?.thighCm ?? ""}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Процент жира
                  </span>
                  <input
                    type="number"
                    name="bodyFat"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={latestMeasurement?.bodyFatPercent ?? ""}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold">
                  Заметка к замеру
                </span>
                <textarea
                  name="measurementNotes"
                  defaultValue={latestMeasurement?.notes ?? ""}
                  className="focus-ring min-h-20 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  placeholder="Условия замера, самочувствие, комментарий..."
                />
              </label>

              {editingClient && editingClient.measurements.length > 0 && (
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    История замеров
                  </p>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {editingClient.measurements.slice(0, 6).map((measurement) => (
                      <li
                        key={measurement.id}
                        className="rounded-lg bg-[var(--surface)] p-3 text-sm"
                      >
                        <p className="font-semibold text-[var(--text)]">
                          {formatMeasurementDate(measurement.measuredAt)}
                        </p>
                        <p className="mt-1 text-[var(--text-muted)]">
                          Вес {formatMeasurementValue(measurement.weightKg, "кг")} ·
                          талия {formatMeasurementValue(measurement.waistCm, "см")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="focus-ring min-h-11 rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="focus-ring min-h-11 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Сохранение..."
                  : editingClient
                    ? "Сохранить изменения"
                    : "Создать клиента"}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
            База клиентов
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Клиенты
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {clients.length} активных клиентов в сопровождении
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)] sm:w-auto"
        >
          <PlusIcon />
          Добавить клиента
        </button>
      </div>

      <label className="relative block max-w-xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по имени или цели..."
          className="focus-ring min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-12 pr-4 text-left text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
        />
      </label>

      {errorMessage && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {errorMessage}
        </section>
      )}

      {isLoading && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)] shadow-sm">
          Загружаем клиентов...
        </section>
      )}

      <ul className="grid grid-cols-1 gap-4">
        {filteredClients.map((client) => {
          const latestClientMeasurement = client.measurements[0];

          return (
            <li key={client.id}>
              <article className="grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 font-bold text-[var(--accent)]">
                      {client.firstName.charAt(0)}
                      {client.secondName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-[var(--text)]">
                        {client.firstName} {client.secondName}
                      </h2>
                      <p className="text-sm text-[var(--text-muted)]">
                        {client.goal || "Цель пока не указана"}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-3">
                    <div className="rounded-lg bg-[var(--surface-soft)] p-3">
                      <dt>Рост</dt>
                      <dd className="mt-1 font-semibold text-[var(--text)]">
                        {formatMeasurementValue(client.height, "см")}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-soft)] p-3">
                      <dt>Текущий вес</dt>
                      <dd className="mt-1 font-semibold text-[var(--text)]">
                        {formatMeasurementValue(client.currentWeight, "кг")}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-soft)] p-3">
                      <dt>Желаемый вес</dt>
                      <dd className="mt-1 font-semibold text-[var(--text)]">
                        {formatMeasurementValue(client.desiredWeight, "кг")}
                      </dd>
                    </div>
                  </dl>

                  {latestClientMeasurement && (
                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-[var(--accent)]">
                          Последний замер
                        </p>
                        <p className="text-[var(--text-muted)]">
                          {formatMeasurementDate(
                            latestClientMeasurement.measuredAt,
                          )}
                        </p>
                      </div>
                      <p className="mt-2 text-[var(--text-muted)]">
                        Вес{" "}
                        <span className="font-semibold text-[var(--text)]">
                          {formatMeasurementValue(
                            latestClientMeasurement.weightKg,
                            "кг",
                          )}
                        </span>
                        {" · "}грудь{" "}
                        <span className="font-semibold text-[var(--text)]">
                          {formatMeasurementValue(
                            latestClientMeasurement.chestCm,
                            "см",
                          )}
                        </span>
                        {" · "}талия{" "}
                        <span className="font-semibold text-[var(--text)]">
                          {formatMeasurementValue(
                            latestClientMeasurement.waistCm,
                            "см",
                          )}
                        </span>
                        {" · "}бедра{" "}
                        <span className="font-semibold text-[var(--text)]">
                          {formatMeasurementValue(
                            latestClientMeasurement.hipsCm,
                            "см",
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <button
                    type="button"
                    onClick={() => openEditForm(client)}
                    className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <EditIcon />
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="focus-ring min-h-10 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Пригласить клиента
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    title="Удалить клиента"
                    aria-label={`Удалить клиента ${client.firstName} ${client.secondName}`}
                    className="focus-ring min-h-10 rounded-lg border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Удалить
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {!isLoading && filteredClients.length === 0 && (
        <section className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-8 text-center">
          <h2 className="text-lg font-bold text-[var(--text)]">
            Клиенты не найдены
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Добавьте первого клиента или измените поисковый запрос.
          </p>
        </section>
      )}
    </section>
  );
}

export default Clients;
