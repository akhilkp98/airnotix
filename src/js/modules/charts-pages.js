export const drawBars = (id, labels, datasets) => {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart || !window.theme) {
    return;
  }
  if (canvas._airnotixChart) {
    canvas._airnotixChart.destroy();
  }
  const theme = window.theme;
  const colours = [theme.primary, theme.accent, theme.info, theme.warning];
  canvas._airnotixChart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color || colours[index % colours.length],
        barPercentage: 0.7,
        categoryPercentage: 0.7
      }))
    },
    options: {
      maintainAspectRatio: false,
      legend: { display: datasets.length > 1 },
      scales: {
        yAxes: [{
          ticks: { beginAtZero: true, precision: 0 },
          gridLines: { color: "rgba(16,28,44,0.06)" }
        }],
        xAxes: [{ gridLines: { display: false } }]
      }
    }
  });
};
