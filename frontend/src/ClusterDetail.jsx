function ClusterDetail({ detail, loading, error }) {
  if (loading) return <p>Loading cluster...</p>;
  if (error) return <p>Error loading cluster: {error}</p>;
  if (!detail) return null;

  return (
    <div style={{ border: "1px solid #ccc", padding: "12px", margin: "12px 0" }}>
      <h2>{detail.label}</h2>
      <p>{detail.articleCount} articles</p>
      <ul>
        {detail.articles.map((article) => (
          <li key={article.id}>
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              {article.title}
            </a>
            {" — "}
            {article.source}, {new Date(article.publishedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClusterDetail;