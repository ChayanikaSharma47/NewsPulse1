require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { spawn } = require("child_process");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || "../scraper/news.db");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const SCRAPER_DIR = path.resolve(__dirname, "../scraper");
const PYTHON_CMD = process.env.PYTHON_CMD
  ? path.resolve(__dirname, process.env.PYTHON_CMD)
  : "python";
const INGEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes



const jobs = new Map(); // jobId -> { status, startedAt, finishedAt, error }
let activeJob = null;   // jobId of the job currently running, or null

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());


function startIngestJob() {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "running", startedAt: new Date().toISOString() });
  activeJob = jobId;

  const child = spawn(PYTHON_CMD, ["main.py"], { cwd: SCRAPER_DIR });

  const timeout = setTimeout(() => {
    child.kill();
  }, INGEST_TIMEOUT_MS);

  let stderrOutput = "";
  child.stderr.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });

  child.on("error", (err) => {
    clearTimeout(timeout);
    jobs.set(jobId, {
      status: "failed",
      startedAt: jobs.get(jobId).startedAt,
      finishedAt: new Date().toISOString(),
      error: `Could not start Python: ${err.message}`,
    });
    activeJob = null;
  });

  child.on("close", (code) => {
    clearTimeout(timeout);
    const startedAt = jobs.get(jobId).startedAt;
    if (code === 0) {
      jobs.set(jobId, { status: "done", startedAt, finishedAt: new Date().toISOString() });
    } else {
      jobs.set(jobId, {
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: stderrOutput.slice(-500) || `Process exited with code ${code}`,
      });
    }
    activeJob = null;
  });

  return jobId;
}
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

app.post("/ingest/trigger", (req, res) => {
  if (activeJob) {
    return res.status(409).json({ error: "An ingest job is already running", jobId: activeJob });
  }
  const jobId = startIngestJob();
  res.status(202).json({ jobId, status: "running" });
});

app.get("/ingest/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json({ jobId: req.params.jobId, ...job });
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

