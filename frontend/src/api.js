const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export function getTimeline() {
  return request("/timeline");
}

export function getCluster(id) {
  return request(`/clusters/${id}`);
}

export function triggerIngest() {
  return request("/ingest/trigger", { method: "POST" });
}

export function getIngestStatus(jobId) {
  return request(`/ingest/status/${jobId}`);
}