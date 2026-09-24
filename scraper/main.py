from fetch_feeds import fetch_all
from database import init_db, save_articles


def run():
    init_db()
    articles = fetch_all()
    new_count = save_articles(articles)
    print(f"Saved {new_count} new articles "
          f"({len(articles) - new_count} already existed)")


if __name__ == "__main__":
    run()