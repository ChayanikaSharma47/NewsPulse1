import re
from datetime import datetime, timezone

import feedparser

feedparser.USER_AGENT = "NewsPulseStudentProject/1.0"

FEEDS = {
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "Guardian": "https://www.theguardian.com/world/rss",
}


def clean_html(text):
    """Remove HTML tags like <p> or <a> from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()


def get_published(entry):
    """Return the published time as an ISO string (UTC)."""
    parsed = entry.get("published_parsed")
    if parsed:
        return datetime(*parsed[:6], tzinfo=timezone.utc).isoformat()
    return None  # fallback if missing


def normalize(entry, source):
    """Turn one raw feed entry into our own consistent format."""
    return {
        "title": clean_html(entry.get("title", "")),
        "summary": clean_html(entry.get("summary", "")),
        "url": entry.get("link", ""),
        "source": source,
        "published_at": get_published(entry),
        "full_text": "",  # we will fill this in later
    }


def fetch_all():
    articles = []
    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                article = normalize(entry, source)
                if article["title"] and article["url"] and article["published_at"]:
                    articles.append(article)
            print(f"{source}: got {len(feed.entries)} entries")
        except Exception as error:
            print(f"{source}: failed ({error})")
    return articles


if __name__ == "__main__":
    articles = fetch_all()
    print(f"\nTotal: {len(articles)} articles")
    for a in articles[:3]:
        print(a)