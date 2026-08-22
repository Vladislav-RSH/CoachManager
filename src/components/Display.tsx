import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import Clients from "../pages/Clients";
import Analytics from "../pages/Analytics";
import Calendar from "../pages/Calendar";
import Chats from "../pages/Chats";
import WorkoutPatterns from "../pages/WorkoutPatterns";
import NutritionPrograms from "../pages/NutritionPrograms";
import Profile from "../pages/Profile";

function Display() {
  return (
    <main className="flex-1 p-10">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/workoutpatterns" element={<WorkoutPatterns />} />
        <Route path="/nutritionprograms" element={<NutritionPrograms />} />
      </Routes>
    </main>
  );
}

export default Display;