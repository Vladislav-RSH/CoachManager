import PagePlaceholder from "../components/PagePlaceholder";

function NutritionPrograms() {
  return (
    <PagePlaceholder
      eyebrow="Рацион"
      title="Планы питания"
      description="Храните планы питания, рекомендации и привычки клиентов рядом с их тренировочными целями."
      items={[
        "Рационы и шаблоны приемов пищи",
        "Баланс калорий и макронутриентов",
        "Контроль выполнения плана",
      ]}
    />
  );
}

export default NutritionPrograms;
