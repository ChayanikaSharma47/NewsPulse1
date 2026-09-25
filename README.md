# News Pulse

A solo full-stack project: a Python scraper collects news articles from RSS feeds, groups related articles into story clusters, a Node.js/Express API serves that data, and a React frontend visualizes it as an interactive timeline.

## Stack:

Python (scraping + clustering) → Node.js/Express (API) → React + Vite (frontend)

### What it does

- Pulls recent articles from BBC, NPR, and The Guardian RSS feeds
- Groups related articles into "clusters" using keyword overlap — no ML
- Serves cluster and article data through a small REST API
- Displays clusters as an interactive range-bar timeline
- Clicking a bar shows the individual articles in that story
- Filters clusters by news source
- 
### How to run it locally

This project has three parts ( in order): the scraper, the backend, and the frontend.

## Scraper (Python)

From the project root:

powershell
           python -m venv .venv
           .venv\Scripts\Activate.ps1
           pip install -r scraper/requirements.txt
           python scraper/main.py

- This fetches the latest articles, saves them to scraper/news.db (SQLite), and runs the clustering step. 

- safe to re-run — duplicate articles are skipped automatically.

## Backend (Node/Express)
powershell
           cd backend
           npm install
           Copy-Item .env.example .env
           npm start

The backend reads scraper/news.db in read-only mode and serves the API at: http://localhost:3000

###  Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | System health check |
| **GET** | `/timeline` | Retrieves all clusters, formatted specifically for the timeline chart |
| **GET** | `/clusters/:id` | Fetches the full article list for a single, specific cluster |
| **POST** | `/ingest/trigger` | Triggers a background job to re-run the scraper |
| **GET** | `/ingest/status/:jobId` | Polls the real-time status of a triggered scrape job |

Note:The ingestion endpoints are implemented and tested locally.

### They are not currently wired to a frontend refresh button (see Design decisions below).

## Frontend (React + Vite)
powershell
           cd frontend
           npm install
           Copy-Item .env.example .env
           npm run dev

Open:http://localhost:5173

The frontend fetches /timeline from the backend and renders the timeline, cluster details, and source filter.

## Architecture overview
### Project Structure & Components

| Component | Technology | Primary Responsibilities |
| :--- | :--- | :--- |
| **`scraper/`** | Python | • Fetches external RSS feeds<br>• Normalizes and saves articles to SQLite<br>• Groups related stories into clusters |
| **`backend/`** | Node.js / Express | • Serves read-only API endpoints over SQLite<br>• Handles requests to trigger manual scrape jobs |
| **`frontend/`** | React + Vite | • Fetches data from the backend API<br>• Renders interactive timeline charts and cluster details<br>• Manages content filtering by source |


Data flows one direction the frontend never accesses the database directly.

# Design decisions & trade-offs

- The project was intentionally kept simple and explainable rather copy pasting without knowledge
- No full-article-text extraction

- The scraper uses the RSS headline and summary provided by each feed rather than extracting the full article body. Extracting full text reliably across different news sites involves paywalls, inconsistent HTML, and anti-scraping measures — RSS parsing was sufficient for this project's scope.

- The full_text column exists in the database schema for possible future use but is currently left empty.

- Keyword-overlap clustering, not ML

- Related articles are grouped using shared significant words between headlines and summaries. The current configuration uses:


                      MIN_SHARED_WORDS = 4
                      MIN_CLUSTER_SIZE = 2
                      
                      along with a hand-tuned stop-word list.

- This approach is simple to reason about, debug, and explain, but it's less accurate for stories that use very different wording. Some stop words were tuned against headlines observed during development, so the list may not generalize perfectly to all future headlines.

- SQLite over a hosted database

- SQLite is appropriate for this single-user, read-mostly, local-first project. Backend database connections are opened in read-only mode and closed after each use.

- Windows-specific Python invocation

- The backend triggers the scraper using the PYTHON_CMD environment variable. The current local configuration points to the Windows virtual environment:

text

           ../.venv/Scripts/python.exe

A Linux or macOS deployment would require a different Python executable path.

Refresh-from-UI

- The backend fully supports triggering a scrape and polling its status via POST /ingest/trigger and GET /ingest/status/:jobId — built and tested end-to-end. The frontend refresh button that would call these was deliberately deferred to prioritize finishing the core visualization within the available time. The API contract is already in place for adding it later.

### Known limitations
- No live deployment

- This version runs locally and is not deployed to a live URL.

The backend reads from scraper/news.db, which is intentionally excluded from version control via .gitignore so scraped data isn't committed to the repository. Deploying the backend without also hosting that database would leave the live API returning empty results — a broken-looking demo that misrepresents the working project.

Rather than ship that, this version is demonstrated fully working locally, with deployment as a clearly scoped-out next step. A production deployment would require moving to a hosted database and running the Python ingestion pipeline in the cloud — for example via a scheduled job (GitHub Actions or Render Cron Jobs) or a containerized service bundling both Node.js and Python.

## Approximate clustering

Keyword-overlap clustering can sometimes merge unrelated stories that happen to share several words, or miss related stories that use very different wording. This is a known trade-off of the simpler clustering approach described above.

### Three RSS sources

The scraper currently covers BBC, NPR, and The Guardian. Adding more sources is straightforward since the scraper is feed-driven, but wasn't prioritized for this version.


