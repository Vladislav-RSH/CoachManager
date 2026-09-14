import PagePlaceholder from "../components/PagePlaceholder";

function Analytics() {
  return (
    <PagePlaceholder
      eyebrow="Динамика"
      title="Аналитика"
      description="Здесь удобно отслеживать посещаемость, изменение веса, выполнение программ и вовлеченность клиентов."
      items={[
        "Сводка по прогрессу клиентов",
        "Графики нагрузки и посещаемости",
        "Сигналы о клиентах без активности",
      ]}
    />
  );
}

export default Analytics;
