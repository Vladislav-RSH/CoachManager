import PagePlaceholder from "../components/PagePlaceholder";

function WorkoutPatterns() {
  return (
    <PagePlaceholder
      eyebrow="Библиотека"
      title="Программы тренировок"
      description="Собирайте готовые шаблоны тренировок и быстро назначайте их клиентам с учетом цели и уровня подготовки."
      items={[
        "Шаблоны для разных целей",
        "Уровни нагрузки и длительность",
        "Назначение программы в пару кликов",
      ]}
    />
  );
}

export default WorkoutPatterns;
