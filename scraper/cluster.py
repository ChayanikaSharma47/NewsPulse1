import re
from collections import Counter

from database import get_articles_for_grouping, save_clusters

MIN_SHARED_WORDS = 4    # articles sharing this many words count as related
MIN_CLUSTER_SIZE = 2    # a topic needs at least this many articles
LABEL_WORDS = 3      # words used in each cluster's label

STOP_WORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
    "was", "one", "our", "out", "has", "have", "had", "his", "how", "its",
    "who", "why", "new", "now", "may", "say", "says", "said", "will", "would",
    "could", "should", "with", "from", "that", "this", "these", "those",
    "they", "them", "their", "there", "then", "than", "what", "when",
    "where", "which", "while", "been", "being", "were", "into", "over",
    "after", "before", "about", "against", "also", "more", "most", "some",
    "such", "only", "other", "just", "like", "your", "here", "watch", "news", "week", "year", "years", "today", "people", "first",
    "back", "two", "three", "off", "get", "gets", "make", "made", "him",
    "she", "does", "did", "own", "any", "way", "day", "days", "many", "free", "continue", "reading", "require",
    "causing", "app", "email", "slashed", "appearing", "well", "moment", "discharge", "man", "woman", "down",
    "plans", "temporarily", "access", "alleged", "general", "blog","month",
    "cut", "old", "need","recognize","mph", "earlier",
    "seize", "end", "return"
}


def to_words(title, summary):
    """Lowercase, keep words of 3+ letters, and drop stop words."""
    text = (title + " " + (summary or "")).lower()
    words = re.findall(r"[a-z]{3,}", text)
    return {w for w in words if w not in STOP_WORDS}


def group_articles(rows):
    """Put each article in the cluster it overlaps most with, or start a new one."""
    clusters = []   # each cluster is a list of (article_id, word_set)
    for article_id, title, summary in rows:
        words = to_words(title, summary)
        best_cluster, best_overlap = None, 0
        for cluster in clusters:
            overlap = max(len(words & member_words) for _, member_words in cluster)
            if overlap > best_overlap:
                best_cluster, best_overlap = cluster, overlap
        if best_cluster is not None and best_overlap >= MIN_SHARED_WORDS:
            best_cluster.append((article_id, words))
        else:
            clusters.append([(article_id, words)])
    return clusters


def make_label(cluster):
    """Label a cluster with its most common words."""
    counts = Counter()
    for _, words in cluster:
        counts.update(words)
    return " ".join(word for word, _ in counts.most_common(LABEL_WORDS))


def run():
    rows = get_articles_for_grouping()
    titles = {row[0]: row[1] for row in rows}

    clusters = group_articles(rows)
    clusters = [c for c in clusters if len(c) >= MIN_CLUSTER_SIZE]
    clusters.sort(key=len, reverse=True)

    to_save = []
    for cluster in clusters:
        label = make_label(cluster)
        ids = [article_id for article_id, _ in cluster]
        to_save.append((label, ids))
        print(f"\n[{label}]  ({len(ids)} articles)")
        for article_id in ids:
            print("   -", titles[article_id])

    save_clusters(to_save)
    print(f"\nSaved {len(to_save)} clusters.")


if __name__ == "__main__":
    run()