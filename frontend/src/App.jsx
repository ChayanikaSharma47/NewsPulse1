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

  useEffect(() => {
    getTimeline()
      .then(setClusters)
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

  return (
    <div>
      <h1>News Pulse</h1>

      <TimelineChart
        clusters={clusters}
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