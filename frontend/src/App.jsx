import { useEffect, useState } from "react";
import { getTimeline, getCluster } from "./api";
import TimelineChart from "./TimelineChart";
import ClusterDetail from "./ClusterDetail";

function App() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [clusterDetail, setClusterDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [selectedSources, setSelectedSources] = useState(null);

  useEffect(() => {
    getTimeline()
      .then((data) => {
        setClusters(data);
        const allSources = new Set(data.flatMap((c) => c.sources));
        setSelectedSources(allSources);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedClusterId === null) return;

    setDetailLoading(true);
    setDetailError(null);
    setClusterDetail(null);

    getCluster(selectedClusterId)
      .then(setClusterDetail)
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedClusterId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const allSources = [...new Set(clusters.flatMap((c) => c.sources))];

  const toggleSource = (source) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const filteredClusters = clusters.filter((c) =>
    c.sources.some((s) => selectedSources.has(s))
  );

  return (
    <div>
      <h1>News Pulse</h1>

      <div style={{ margin: "12px 0" }}>
        {allSources.map((source) => (
          <label key={source} style={{ marginRight: "12px" }}>
            <input
              type="checkbox"
              checked={selectedSources.has(source)}
              onChange={() => toggleSource(source)}
            />
            {source}
          </label>
        ))}
      </div>

      <TimelineChart
        clusters={filteredClusters}
        onSelectCluster={(id) => setSelectedClusterId(id)}
      />

      {selectedClusterId !== null && (
        <ClusterDetail
          detail={clusterDetail}
          loading={detailLoading}
          error={detailError}
        />
      )}

      <ul>
        {filteredClusters.map((c) => (
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