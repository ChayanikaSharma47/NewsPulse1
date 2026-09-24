require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || "../scraper/news.db");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Open the database read-only for one query, then close it again.
function query(work) {
  if (!fs.existsSync(DB_PATH)) {
    const error = new Error("Database file not found");
    error.status = 503;
    throw error;
  }
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return work(db);
  } finally {
    db.close();
  }
}

// One row per cluster: label, article count, and time range.
const CLUSTER_SUMMARY_SQL = `
  SELECT c.id,
         c.label,
         COUNT(a.id) AS article_count,
         MIN(a.published_at) AS earliest,
         MAX(a.published_at) AS latest,
         GROUP_CONCAT(DISTINCT a.source) AS sources
  FROM clusters c
  JOIN articles a ON a.cluster_id = c.id
  GROUP BY c.id
  ORDER BY latest DESC
`;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/clusters", (req, res) => {
  const rows = query((db) => db.prepare(CLUSTER_SUMMARY_SQL).all());
  res.json(
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      articleCount: row.article_count,
      earliest: row.earliest,
      latest: row.latest,
    }))
  );
});

app.get("/clusters/:id", (req, res) => {
  if (!/^\d{1,9}$/.test(req.params.id)) {
    return res.status(400).json({ error: "Cluster id must be a positive whole number" });
  }
  const id = Number(req.params.id);

  const result = query((db) => {
    const cluster = db.prepare("SELECT id, label FROM clusters WHERE id = ?").get(id);
    if (!cluster) return null;
    const articles = db
      .prepare(
        `SELECT id, title, summary, url, source, published_at AS publishedAt
         FROM articles
         WHERE cluster_id = ?
         ORDER BY published_at ASC`
      )
      .all(id);
    return { ...cluster, articleCount: articles.length, articles };
  });

  if (!result) {
    return res.status(404).json({ error: "Cluster not found" });
  }
  res.json(result);
});

app.get("/timeline", (req, res) => {
  const rows = query((db) => db.prepare(CLUSTER_SUMMARY_SQL).all());
  res.json(
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      start: Date.parse(row.earliest), // milliseconds, which charting libraries prefer
      end: Date.parse(row.latest),
      count: row.article_count,
      sources: row.sources ? row.sources.split(",") : [],
    }))
  );
});

// Anything else: 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Unexpected errors: log details on the server, send a generic message to the client
app.use((err, req, res, next) => {
  console.error(err);
  if (err.status === 503) {
    return res.status(503).json({ error: "No data yet. Run the ingest first." });
  }
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});