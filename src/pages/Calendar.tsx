import PagePlaceholder from "../components/PagePlaceholder";

function Calendar() {
  return (
    <PagePlaceholder
      eyebrow="Расписание"
      title="Календарь"
      description="Планируйте персональные тренировки, контрольные замеры и групповые занятия в одном календаре."
      items={[
        "Дневная и недельная сетка занятий",
        "Быстрое добавление тренировки",
        "Напоминания о переносах и отменах",
      ]}
    />
  );
}

export default Calendar;
