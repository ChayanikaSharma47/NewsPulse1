import os
import sqlite3
from contextlib import closing

# The database path can be changed with an environment variable.
DEFAULT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "news.db")
DB_PATH = os.environ.get("DB_PATH", DEFAULT_PATH)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create the tables if they don't exist yet."""
    with closing(get_connection()) as conn:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS clusters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    summary TEXT,
                    url TEXT NOT NULL UNIQUE,
                    source TEXT,
                    published_at TEXT NOT NULL,
                    full_text TEXT,
                    cluster_id INTEGER,
                    FOREIGN KEY (cluster_id) REFERENCES clusters(id)
                )
            """)


def save_articles(articles):
    """Insert articles. Articles with an existing URL are skipped."""
    new_count = 0

    with closing(get_connection()) as conn:
        with conn:
            for a in articles:
                cursor = conn.execute(
                    """INSERT OR IGNORE INTO articles
                       (title, summary, url, source, published_at, full_text)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        a["title"],
                        a["summary"],
                        a["url"],
                        a["source"],
                        a["published_at"],
                        a["full_text"],
                    ),
                )
                new_count += cursor.rowcount

    return new_count