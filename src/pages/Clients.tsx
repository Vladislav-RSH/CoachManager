import { useEffect, useState } from "react";

function Clients() {

  type Clients = {
    id: string;
    firstName: string;
    secondName: string;
    date: Date;
    height: number;
    currentWeight: number;
    desiredWeight: number;
    goal: string;
  }

  const [clients, setClients] = useState<Clients[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      const response = await fetch('http://localhost:3000/clients');
      const data = await response.json();

      setClients(data);
    };

    loadClients();
  }, [])

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      secondName: String(formData.get("secondName") ?? ""),
      date: String(formData.get("date") ?? ""),
      height: Number(formData.get("height") ?? ""),
      currentWeight: Number(formData.get("currentWeight") ?? ""),
      desiredWeight: Number(formData.get("desiredWeight") ?? ""),
      goal: String(formData.get("goal") ?? ""),
    };

    const response = await fetch('http://localhost:3000/clients' , {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body : JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Не удалось создать клиента');
    }

    const createdClient = await response.json();

    setClients((prevClients) => [...prevClients, createdClient]);
    form.reset();
    setIsAddOpen(false);
  }

  const hadleDelete = async (id: string) => {
    const response = await fetch(`http://localhost:3000/clients/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Не удалось удалить клиента');
    }

    setClients((prev) => prev.filter((clients) => clients.id !== id));
  }


  return (
    <section>
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setIsAddOpen(false)}
        >
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#242f3d] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleCreateClient}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Новый клиент</h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="cursor-pointer rounded-xl border border-[#2f3b48] px-3 py-1 text-[#a8b5c3] transition-all hover:bg-[#202b36] hover:text-white"
                aria-label="Закрыть форму"
              >
                x
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">Имя</span>
                <input
                  type="text"
                  name="firstName"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">
                  Фамилия
                </span>
                <input
                  type="text"
                  name="secondName"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">
                  Дата рождения
                </span>
                <input
                  type="date"
                  name="date"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">Рост</span>
                <input
                  type="number"
                  name="height"
                  min="0"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">
                  Текущий вес
                </span>
                <input
                  type="number"
                  name="currentWeight"
                  min="0"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[#a8b5c3]">
                  Желаемый вес
                </span>
                <input
                  type="number"
                  name="desiredWeight"
                  min="0"
                  className="w-full rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-[#a8b5c3]">Цель</span>
              <textarea
                name="goal"
                className="min-h-28 w-full resize-none rounded-xl border border-[#2f3b48] bg-[#17212b] px-4 py-3 text-white outline-none transition-colors focus:border-[#3390ec]"
                placeholder="Набор массы, похудение, восстановление..."
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="cursor-pointer rounded-xl border border-[#2f3b48] px-4 py-2 text-[#a8b5c3] transition-all hover:bg-[#202b36] hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-[#3390ec] px-4 py-2 text-white transition-all hover:bg-[#2b7fce]"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between">
        <h1 className="text-3xl font-semibold text-white">Клиенты</h1>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="cursor-pointer rounded-xl border border-[#2f3b48] bg-[#242f3d] px-6 py-2 text-[#a8b5c3] transition-all hover:bg-[#202b36] hover:text-white"
        >
          + Добавить клиента
        </button>
      </div>

      <div>
        <p className="text-sm text-[#a8b5c3]">0 активных</p>
      </div>

      <div>
        <input
          type="text"
          placeholder="Поиск по имени..."
          className="mt-5 rounded-xl border border-[#2f3b48] bg-[#242f3d] py-2 pl-3 pr-20 text-left"
        />
      </div>

      <ul>
        {clients.map((client) => (
          <li key={client.id}>
            <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border 
            border-[#2f3b48] bg-[#242f3d] py-2 pl-3">
              <span>{client.firstName}</span>
              <div className="mr-2 flex gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-[#2f3b48] bg-[#242f3d] px-6 py-2 
                  text-[#a8b5c3] transition-all hover:bg-[#202b36] hover:text-white"
                >
                  Пригласить клиента
                </button>
                <button
                  type="button"
                  onClick={() => hadleDelete(client.id)}
                  className="cursor-pointer rounded-xl border border-[#2f3b48] bg-[#242f3d] px-4 py-1 
                  text-[#a8b5c3] transition-all hover:bg-[#202b36] hover:text-white"
                >
                  x
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Clients;
