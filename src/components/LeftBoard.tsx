import { NavLink } from "react-router-dom";

function LeftBoard() {

    return (
        <section className="basis-[25%] shrink-0 flex flex-col mt-10 pt-10 pl-10 gap-10">
            <NavLink to="/profile">Профиль</NavLink>
            <NavLink to="/clients">Клиенты</NavLink>
            <NavLink to="/analytics">Аналитика</NavLink>
            <NavLink to="/calendar">Календарь</NavLink>
            <NavLink to="/chats">Чаты</NavLink>
            <NavLink to="/workoutpatterns">Программы тренировок</NavLink>
            <NavLink to="/nutritionprograms">Планы питания</NavLink>
        </section>
    );

}

export default LeftBoard;