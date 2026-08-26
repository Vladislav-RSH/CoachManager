function Clients() {
  return (
    <section>
      <div className="flex justify-between">
        <h1 className="text-3xl font-semibold text-white">Клиенты</h1>
        <button type="button" className="transition-all text-[#a8b5c3] border py-2 px-6 rounded-xl bg-[#242f3d] 
        border-[#2f3b48] hover:bg-[#202b36] hover:text-[#fff] cursor-pointer">+ Добавить клиента</button>
      </div>
      <div>
        <p className="text-sm text-[#a8b5c3]">0 активных</p>
      </div>
      <div>
        <input 
          type="text"
          placeholder="Поиск по имени..."
          className="border-[#2f3b48] border py-2 pl-3 pr-20 rounded-xl bg-[#242f3d] text-left mt-5" 
        />
      </div>
      <div className="mt-5 border bg-[#242f3d] border-[#2f3b48] rounded-xl flex justify-between items-center gap-2 pl-3 py-2">
        <div className="flex gap-2">
          <h2>1</h2>
          <h2>Имя</h2>
        </div>
        <div className="mr-2 gap-2 flex">
          <button type="button" className="transition-all text-[#a8b5c3] border py-2 px-6 rounded-xl bg-[#242f3d] 
          border-[#2f3b48] hover:bg-[#202b36] hover:text-[#fff] cursor-pointer">Пригласить клиента</button>
          <button type="button" className="transition-all text-[#a8b5c3] border px-4 py-1 rounded-xl bg-[#242f3d] 
          border-[#2f3b48] hover:bg-[#202b36] hover:text-[#fff] cursor-pointer">x</button>
        </div>
      </div>
    </section>
  );
}

export default Clients;
