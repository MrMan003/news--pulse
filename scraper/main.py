import os
import uuid
import re
import time
import feedparser
import trafilatura
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey, Integer, inspect, text, func
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError, DBAPIError
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import List, Dict, Optional, Any, Set
from collections import defaultdict
import numpy as np
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS  # <-- ADD THIS IMPORT
import threading
import atexit

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

if not DB_URL:
    logger.error("DATABASE_URL not set in environment")
    exit(1)

# --- Flask App with CORS ---
app = Flask(__name__)
CORS(app)  # <-- ADD THIS LINE - Allows all origins

# --- News Sources ---
FEEDS: List[Dict[str, str]] = [
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
    {"name": "Sky News", "url": "https://feeds.skynews.com/feeds/rss/world.xml"},
    {"name": "CNN", "url": "http://rss.cnn.com/rss/cnn_topstories.rss"},
    {"name": "Fox News", "url": "http://feeds.foxnews.com/foxnews/politics"},
    {"name": "NBC News", "url": "https://feeds.nbcnews.com/nbcnews/public/news"},
]

# --- Database Models ---
Base = declarative_base()

class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    article_count = Column(Integer, default=0)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))

class Article(Base):
    __tablename__ = "articles"
    id = Column(String, primary_key=True)
    url = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    summary = Column(Text)
    image_url = Column(String, nullable=True)
    source = Column(String)
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    cluster_id = Column(String, ForeignKey("clusters.id"))

class ScrapeRun(Base):
    __tablename__ = "scrape_runs"
    id = Column(String, primary_key=True)
    job_id = Column(String, unique=True)
    status = Column(String, default="running")
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))
    articles_found = Column(Integer, default=0)
    articles_new = Column(Integer, default=0)
    clusters_created = Column(Integer, default=0)
    error_message = Column(Text)

# --- Connect and create tables ---
try:
    engine = create_engine(
        DB_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        echo=False
    )
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    logger.info("Database connection established with pooling settings")
except Exception as e:
    logger.error(f"Failed to connect to database: {e}")
    exit(1)

# --- Helper Functions ---
def get_session_with_retry() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=2, read=2, connect=2, backoff_factor=0.5, status_forcelist=(500, 502, 504))
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def execute_db_with_retry(func, max_retries=3, delay=2):
    for attempt in range(max_retries):
        try:
            return func()
        except (OperationalError, DBAPIError) as e:
            error_msg = str(e).lower()
            if ("ssl connection" in error_msg or 
                "connection has been closed" in error_msg or
                "could not connect" in error_msg or
                "connection timed out" in error_msg):
                if attempt < max_retries - 1:
                    logger.warning(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                    if attempt == max_retries - 2:
                        logger.info("Attempting to reconnect to database...")
                        engine.dispose()
                    continue
            raise
        except Exception as e:
            raise

# --- Image Extraction Functions ---
def extract_image_from_rss(entry) -> Optional[str]:
    image_url = None
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        if isinstance(entry.media_thumbnail, list) and len(entry.media_thumbnail) > 0:
            url = entry.media_thumbnail[0].get('url')
            if url and 'icon' not in url.lower():
                image_url = url
    if not image_url and hasattr(entry, 'media_content') and entry.media_content:
        if isinstance(entry.media_content, list):
            for content in entry.media_content:
                if content.get('medium') == 'image' or content.get('type', '').startswith('image/'):
                    url = content.get('url')
                    if url and 'icon' not in url.lower():
                        image_url = url
                        break
    if not image_url and hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image/'):
                url = enc.get('href') or enc.get('url')
                if url and 'icon' not in url.lower():
                    image_url = url
                    break
    return image_url

def extract_image_from_html(url: str, session: requests.Session) -> Optional[str]:
    try:
        resp = session.get(url, timeout=8, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, 'html.parser')
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img = og_image.get('content')
            if img.startswith('//'):
                img = 'https:' + img
            elif img.startswith('/'):
                base = re.match(r'https?://[^/]+', url)
                if base:
                    img = base.group(0) + img
            if img and not any(x in img.lower() for x in ['icon', 'logo', 'pixel', '1x1']):
                return img
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            img = twitter_image.get('content')
            if img.startswith('//'):
                img = 'https:' + img
            elif img.startswith('/'):
                base = re.match(r'https?://[^/]+', url)
                if base:
                    img = base.group(0) + img
            if img and not any(x in img.lower() for x in ['icon', 'logo', 'pixel', '1x1']):
                return img
        article = soup.find('article')
        if article:
            img = article.find('img')
            if img and img.get('src'):
                src = img.get('src')
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    base = re.match(r'https?://[^/]+', url)
                    if base:
                        src = base.group(0) + src
                if src and not any(x in src.lower() for x in ['icon', 'logo', 'pixel', '1x1']):
                    return src
        for img in soup.find_all('img', limit=10):
            src = img.get('src')
            if src:
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    base = re.match(r'https?://[^/]+', url)
                    if base:
                        src = base.group(0) + src
                if src and not any(x in src.lower() for x in ['icon', 'logo', 'pixel', '1x1', 'avatar']):
                    width = img.get('width')
                    if width:
                        try:
                            if int(width) > 100:
                                return src
                        except:
                            pass
                    if 'srcset' in img.attrs:
                        srcset = img.get('srcset')
                        if srcset:
                            parts = srcset.split(',')
                            last = parts[-1].strip().split(' ')
                            if len(last) > 0:
                                src = last[0]
                                if src.startswith('//'):
                                    src = 'https:' + src
                                elif src.startswith('/'):
                                    base = re.match(r'https?://[^/]+', url)
                                    if base:
                                        src = base.group(0) + src
                                return src
                    return src
        return None
    except Exception as e:
        logger.debug(f"Failed to extract image from {url}: {e}")
        return None

def clean_image_url(image_url: str, base_url: str) -> Optional[str]:
    if not image_url:
        return None
    image_url = image_url.split('?')[0]
    if image_url.startswith('//'):
        image_url = 'https:' + image_url
    elif image_url.startswith('/'):
        base_match = re.match(r'https?://[^/]+', base_url)
        if base_match:
            image_url = base_match.group(0) + image_url
    elif not image_url.startswith('http'):
        base_match = re.match(r'https?://[^/]+/[^/]+', base_url)
        if base_match:
            base_dir = base_match.group(0).rsplit('/', 1)[0]
            image_url = base_dir + '/' + image_url.lstrip('/')
    if any(x in image_url.lower() for x in ['icon', 'logo', 'avatar', 'pixel', '1x1', 'svg', 'blank']):
        return None
    return image_url

# --- Fetch Articles ---
def fetch_articles() -> List[Dict[str, Any]]:
    articles = []
    logger.info("Fetching feeds...")
    session = get_session_with_retry()
    for feed in FEEDS:
        try:
            logger.info(f"Parsing {feed['name']}...")
            response = session.get(feed['url'], timeout=10)
            response.raise_for_status()
            parsed = feedparser.parse(response.content)
            if not parsed.entries:
                continue
            max_articles = 30
            processed = 0
            for entry in parsed.entries[:max_articles]:
                try:
                    url = entry.get('link')
                    title = entry.get('title', 'Untitled')
                    if not url or not url.startswith('http'):
                        continue
                    pub_str = entry.get('published')
                    pub_date = datetime.now(timezone.utc)
                    if pub_str and isinstance(pub_str, str):
                        try:
                            pub_date = parsedate_to_datetime(pub_str)
                        except:
                            pass
                    image_url = None
                    image_url = extract_image_from_rss(entry)
                    if not image_url:
                        try:
                            img = extract_image_from_html(url, session)
                            if img:
                                image_url = clean_image_url(img, url)
                                if image_url:
                                    logger.info(f"✅ Found image for '{title[:30]}'")
                        except Exception as e:
                            logger.debug(f"Failed to scrape image from {url}: {e}")
                    if image_url:
                        image_url = clean_image_url(image_url, url)
                    summary = ''
                    if hasattr(entry, 'summary'):
                        summary = str(entry.summary) if entry.summary else ''
                    elif hasattr(entry, 'description'):
                        summary = str(entry.description) if entry.description else ''
                    if summary:
                        summary = re.sub(r'<[^>]+>', ' ', summary)
                        summary = ' '.join(summary.split())[:500]
                    body = None
                    try:
                        resp = session.get(url, timeout=8)
                        if resp.status_code == 200:
                            body = trafilatura.extract(resp.text)
                    except:
                        pass
                    if not body:
                        body = summary
                    if body and len(body) > 100:
                        articles.append({
                            "url": url,
                            "title": title,
                            "body": body[:5000],
                            "summary": summary,
                            "image_url": image_url,
                            "source": feed['name'],
                            "published_at": pub_date
                        })
                        processed += 1
                except:
                    continue
            logger.info(f"Processed {processed} articles from {feed['name']}")
        except Exception as e:
            logger.warning(f"Failed to fetch {feed['name']}: {e}")
            continue
    logger.info(f"Fetched {len(articles)} total articles")
    return articles

# --- Cluster and Store ---
def cluster_and_store(raw_articles: List[Dict[str, Any]], job_id: Optional[str] = None) -> Dict[str, Any]:
    outer_job_id = job_id
    
    def do_clustering():
        db = SessionLocal()
        try:
            current_job_id = outer_job_id if outer_job_id else str(uuid.uuid4())
            scrape_run = ScrapeRun(id=str(uuid.uuid4()), job_id=current_job_id, status="running")
            db.add(scrape_run)
            db.commit()
            existing_urls = {row[0] for row in db.query(Article.url).all()}
            seen_urls = set()
            new_articles = []
            for a in raw_articles:
                if a['url'] not in existing_urls and a['url'] not in seen_urls:
                    new_articles.append(a)
                    seen_urls.add(a['url'])
            if not new_articles:
                db.query(ScrapeRun).filter(ScrapeRun.job_id == current_job_id).update({
                    "status": "completed", "completed_at": datetime.now(timezone.utc)
                })
                db.commit()
                return {"status": "completed", "new_articles": 0, "clusters_created": 0}
            logger.info(f"Processing {len(new_articles)} new articles...")
            if len(new_articles) < 5:
                for a in new_articles:
                    db.add(Article(
                        id=str(uuid.uuid4()), url=a['url'], title=a['title'],
                        body=a['body'], summary=a.get('summary', ''), image_url=a.get('image_url'),
                        source=a['source'], published_at=a['published_at']
                    ))
                db.query(ScrapeRun).filter(ScrapeRun.job_id == current_job_id).update({
                    "status": "completed", "completed_at": datetime.now(timezone.utc),
                    "articles_found": len(raw_articles), "articles_new": len(new_articles)
                })
                db.commit()
                return {"status": "completed", "new_articles": len(new_articles), "clusters_created": 0}
            texts = [f"{a['title']}. {a['body'][:1000]}" for a in new_articles]
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000, min_df=1)
            tfidf_matrix = vectorizer.fit_transform(texts)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            THRESHOLD = 0.25
            n = len(new_articles)
            parent = list(range(n))
            def find(x):
                while parent[x] != x:
                    parent[x] = parent[parent[x]]
                    x = parent[x]
                return x
            def union(x, y):
                rx, ry = find(x), find(y)
                if rx != ry:
                    parent[ry] = rx
            for i in range(n):
                for j in range(i + 1, n):
                    if similarity_matrix[i][j] >= THRESHOLD:
                        union(i, j)
            groups = defaultdict(list)
            for i in range(n):
                groups[find(i)].append(i)
            clusters_created = 0
            for group_indices in groups.values():
                if len(group_indices) >= 2:
                    cluster_group = [new_articles[i] for i in group_indices]
                    cluster_id = str(uuid.uuid4())
                    pub_dates = [a['published_at'] for a in cluster_group]
                    label = cluster_group[0]['title'][:60]
                    new_cluster = Cluster(
                        id=cluster_id, label=label, article_count=len(cluster_group),
                        start_time=min(pub_dates), end_time=max(pub_dates)
                    )
                    db.add(new_cluster)
                    db.flush()
                    for a in cluster_group:
                        db.add(Article(
                            id=str(uuid.uuid4()), url=a['url'], title=a['title'],
                            body=a['body'], summary=a.get('summary', ''), image_url=a.get('image_url'),
                            source=a['source'], published_at=a['published_at'], cluster_id=cluster_id
                        ))
                    clusters_created += 1
            db.query(ScrapeRun).filter(ScrapeRun.job_id == current_job_id).update({
                "status": "completed", "completed_at": datetime.now(timezone.utc),
                "articles_found": len(raw_articles), "articles_new": len(new_articles),
                "clusters_created": clusters_created
            })
            db.commit()
            logger.info(f"Created {clusters_created} clusters from {len(new_articles)} articles")
            return {"status": "completed", "new_articles": len(new_articles), "clusters_created": clusters_created}
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    return execute_db_with_retry(do_clustering)

def run_scraper_with_job_id(job_id):
    """Run scraper and update job status"""
    try:
        articles = fetch_articles()
        if articles:
            result = cluster_and_store(articles, job_id)
            logger.info(f"Scraper run complete: {result}")
        else:
            logger.info("No articles fetched")
            # Update job status
            db = SessionLocal()
            try:
                db.query(ScrapeRun).filter(ScrapeRun.job_id == job_id).update({
                    "status": "completed",
                    "articles_found": 0,
                    "articles_new": 0
                })
                db.commit()
            finally:
                db.close()
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        db = SessionLocal()
        try:
            db.query(ScrapeRun).filter(ScrapeRun.job_id == job_id).update({
                "status": "failed",
                "error_message": str(e)
            })
            db.commit()
        finally:
            db.close()

def run_scraper_once() -> Dict[str, Any]:
    logger.info("Starting scraper run...")
    articles = fetch_articles()
    if articles:
        result = cluster_and_store(articles)
        logger.info(f"Scraper run complete: {result}")
        return result
    else:
        logger.info("No articles fetched")
        return {"status": "completed", "new_articles": 0, "clusters_created": 0}

# --- API Endpoints for Frontend ---

@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "service": "News Scraper",
        "endpoints": {
            "/": "Health check",
            "/health": "Health check",
            "/clusters": "Get all clusters with articles",
            "/ingest/trigger": "Trigger a scrape job (POST)",
            "/ingest/status/<job_id>": "Check job status"
        }
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()})

@app.route('/clusters')
def get_clusters():
    """Get all clusters with their articles"""
    try:
        db = SessionLocal()
        clusters = db.query(Cluster).order_by(Cluster.end_time.desc()).all()
        
        result = []
        for cluster in clusters:
            articles = db.query(Article).filter(Article.cluster_id == cluster.id).all()
            result.append({
                "id": cluster.id,
                "label": cluster.label,
                "article_count": cluster.article_count,
                "start_time": cluster.start_time.isoformat() if cluster.start_time else None,
                "end_time": cluster.end_time.isoformat() if cluster.end_time else None,
                "articles": [{
                    "id": a.id,
                    "title": a.title,
                    "url": a.url,
                    "summary": a.summary,
                    "image_url": a.image_url,
                    "source": a.source,
                    "published_at": a.published_at.isoformat() if a.published_at else None
                } for a in articles]
            })
        
        # Get source counts
        source_counts = db.query(Article.source, func.count(Article.id)).group_by(Article.source).all()
        sources = [{"source": s[0], "count": s[1]} for s in source_counts if s[0]]
        
        db.close()
        return jsonify({
            "success": True,
            "clusters": result,
            "sources": sources
        })
    except Exception as e:
        logger.error(f"Failed to get clusters: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ingest/trigger', methods=['POST'])
def trigger_ingest():
    """Trigger a scrape job"""
    try:
        job_id = str(uuid.uuid4())
        # Run scraper in background
        thread = threading.Thread(target=run_scraper_with_job_id, args=(job_id,))
        thread.start()
        return jsonify({"success": True, "job_id": job_id})
    except Exception as e:
        logger.error(f"Failed to trigger ingest: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ingest/status/<job_id>')
def get_job_status(job_id):
    """Check job status"""
    try:
        db = SessionLocal()
        scrape_run = db.query(ScrapeRun).filter(ScrapeRun.job_id == job_id).first()
        db.close()
        
        if scrape_run:
            return jsonify({
                "status": scrape_run.status,
                "articles_found": scrape_run.articles_found or 0,
                "articles_new": scrape_run.articles_new or 0,
                "clusters_created": scrape_run.clusters_created or 0,
                "error_message": scrape_run.error_message
            })
        return jsonify({"status": "not_found"}), 404
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# --- Background Scheduler ---
def scheduled_scraper():
    """Run scraper every 10 minutes"""
    while True:
        try:
            logger.info("=== SCHEDULED SCRAPE START ===")
            run_scraper_once()
            logger.info("=== SCHEDULED SCRAPE COMPLETE ===")
        except Exception as e:
            logger.error(f"Scheduled scraper failed: {e}")
        time.sleep(600)

scheduler_thread = threading.Thread(target=scheduled_scraper, daemon=True)
scheduler_thread.start()
atexit.register(lambda: logger.info("Shutting down..."))

# --- Main Execution ---
if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)