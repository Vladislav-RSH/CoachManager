import Notifications from "../components/Notifications";

function HomePage() {

    const notifications = [
        {id : 1, text: "Новый клиент ожидает подтверждения"},
    ];

    return (
        <section>
            <Notifications notifications={notifications}/>

            <h1 className="text-3xl font-semibold text-white">Главная</h1>
        </section>
    );
}

export default HomePage;
