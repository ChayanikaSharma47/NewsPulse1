import Chart from "react-apexcharts";

function TimelineChart({ clusters, onSelectCluster }) {
  const series = [
    {
      data: clusters.map((c) => ({
        x: c.label,
        y: [c.start, c.end],
      })),
    },
  ];

  const options = {
    chart: {
      type: "rangeBar",
      toolbar: { show: false },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const cluster = clusters[config.dataPointIndex];

          if (cluster) {
            onSelectCluster(cluster.id);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 2,
      },
    },
    xaxis: {
      type: "datetime",
    },
  };

  const height = Math.max(clusters.length * 40, 200);

  return (
    <Chart
      options={options}
      series={series}
      type="rangeBar"
      height={height}
    />
  );
}

export default TimelineChart;