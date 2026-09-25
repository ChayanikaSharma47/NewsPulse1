import { useEffect, useState } from "react";
import { getTimeline } from "./api";
import TimelineChart from "./TimelineChart";

function App() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTimeline()
      .then(setClusters)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>News Pulse</h1>

      <TimelineChart
        clusters={clusters}
        onSelectCluster={(id) => console.log("selected", id)}
      />

      <ul>
        {clusters.map((c) => (
          <li key={c.id}>
            {c.label} — {c.count} articles (
            {new Date(c.start).toLocaleDateString()} to{" "}
            {new Date(c.end).toLocaleDateString()})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

