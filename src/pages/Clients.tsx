import { useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type ClientRow,
  type NewClientRow,
} from "../lib/supabase";

type Client = {
  id: string;
  firstName: string;
  secondName: string;
  date: string;
  height: number;
  currentWeight: number;
  desiredWeight: number;
  goal: string;
};

const toNullableNumber = (value: FormDataEntryValue | null) => {
  const textValue = String(value ?? "").trim();

  if (!textValue) {
    return null;
  }

  const parsedValue = Number(textValue);

  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const mapClientRow = (row: ClientRow): Client => ({
  id: row.id,
  firstName: row.first_name,
  secondName: row.second_name,
  date: row.birth_date ?? "",
  height: Number(row.height ?? 0),
  currentWeight: Number(row.current_weight ?? 0),
  desiredWeight: Number(row.desired_weight ?? 0),
  goal: row.goal ?? "",
});

const missingSupabaseMessage =
  "Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.";

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
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(missingSupabaseMessage);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не удалось загрузить клиентов из Supabase.");
        setClients([]);
      } else {
        setErrorMessage(null);
        setClients(((data ?? []) as ClientRow[]).map(mapClientRow));
      }

      setIsLoading(false);
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClients = clients.filter((client) => {
    const fullName = `${client.firstName} ${client.secondName}`.toLowerCase();

    return fullName.includes(query.toLowerCase());
  });

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(missingSupabaseMessage);
      return;
    }

    const payload: NewClientRow = {
      first_name: String(formData.get("firstName") ?? "").trim(),
      second_name: String(formData.get("secondName") ?? "").trim(),
      birth_date: String(formData.get("date") ?? "") || null,
      height: toNullableNumber(formData.get("height")),
      current_weight: toNullableNumber(formData.get("currentWeight")),
      desired_weight: toNullableNumber(formData.get("desiredWeight")),
      goal: String(formData.get("goal") ?? "").trim() || null,
    };

    setIsSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select()
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage("Не удалось создать клиента в Supabase.");
      return;
    }

    setErrorMessage(null);
    setClients((prevClients) => [mapClientRow(data as ClientRow), ...prevClients]);
    form.reset();
    setIsAddOpen(false);
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
    setClients((prev) => prev.filter((clients) => clients.id !== id));
  };

  return (
    <section className="space-y-6">
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          onClick={() => setIsAddOpen(false)}
        >
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--surface)] p-5 text-[var(--text)] shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleCreateClient}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Новый клиент</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Добавьте базовые данные, чтобы начать вести прогресс.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                title="Закрыть форму"
                aria-label="Закрыть форму"
                className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Имя
                </span>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Фамилия
                </span>
                <input
                  type="text"
                  name="secondName"
                  required
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Дата рождения
                </span>
                <input
                  type="date"
                  name="date"
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Рост
                </span>
                <input
                  type="number"
                  name="height"
                  min="0"
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Текущий вес
                </span>
                <input
                  type="number"
                  name="currentWeight"
                  min="0"
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Желаемый вес
                </span>
                <input
                  type="number"
                  name="desiredWeight"
                  min="0"
                  className="focus-ring w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Цель
              </span>
              <textarea
                name="goal"
                className="focus-ring min-h-28 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                placeholder="Набор массы, похудение, восстановление..."
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="focus-ring min-h-11 cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="focus-ring min-h-11 cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
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
          onClick={() => setIsAddOpen(true)}
          className="focus-ring inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)] sm:w-auto"
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
          placeholder="Поиск по имени..."
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
        {filteredClients.map((client) => (
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
                      {client.height || "-"} см
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-3">
                    <dt>Вес</dt>
                    <dd className="mt-1 font-semibold text-[var(--text)]">
                      {client.currentWeight || "-"} кг
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-soft)] p-3">
                    <dt>Цель</dt>
                    <dd className="mt-1 font-semibold text-[var(--text)]">
                      {client.desiredWeight || "-"} кг
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <button
                  type="button"
                  className="focus-ring min-h-10 cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Пригласить клиента
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(client.id)}
                  title="Удалить клиента"
                  aria-label={`Удалить клиента ${client.firstName} ${client.secondName}`}
                  className="focus-ring grid min-h-10 cursor-pointer place-items-center rounded-lg border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Удалить
                </button>
              </div>
            </article>
          </li>
        ))}
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
