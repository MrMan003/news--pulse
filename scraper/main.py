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
from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey, Integer, inspect, text
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

# --- Flask App ---
app = Flask(__name__)

# --- News Sources (Only sources that reliably provide images) ---
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

# --- Connect and create tables with connection pooling ---
try:
    # Create engine with connection pooling settings to handle disconnections
    engine = create_engine(
        DB_URL,
        pool_pre_ping=True,      # Check connection before using it
        pool_recycle=300,        # Recycle connections every 5 minutes
        pool_size=5,             # Maintain 5 connections in the pool
        max_overflow=10,         # Allow up to 10 extra connections if needed
        pool_timeout=30,         # Wait 30 seconds for a connection before timing out
        echo=False               # Set to True for debugging SQL
    )
    SessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    logger.info("Database connection established with pooling settings")
except Exception as e:
    logger.error(f"Failed to connect to database: {e}")
    exit(1)

# --- Session with retry ---
def get_session_with_retry() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=2, read=2, connect=2, backoff_factor=0.5, status_forcelist=(500, 502, 504))
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

# --- Database operation with retry ---
def execute_db_with_retry(func, max_retries=3, delay=2):
    """Execute a database function with retry logic for connection issues"""
    for attempt in range(max_retries):
        try:
            return func()
        except (OperationalError, DBAPIError) as e:
            error_msg = str(e).lower()
            # Only retry on connection-related errors
            if ("ssl connection" in error_msg or 
                "connection has been closed" in error_msg or
                "could not connect" in error_msg or
                "connection timed out" in error_msg):
                if attempt < max_retries - 1:
                    logger.warning(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                    # Refresh the engine connection
                    if attempt == max_retries - 2:
                        logger.info("Attempting to reconnect to database...")
                        engine.dispose()
                    continue
            # If it's not a connection error or we've exhausted retries, raise it
            raise
        except Exception as e:
            # Don't retry on other errors
            raise

# --- Extract image URL from RSS entry ---
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

# --- Extract image from article HTML using BeautifulSoup ---
def extract_image_from_html(url: str, session: requests.Session) -> Optional[str]:
    try:
        resp = session.get(url, timeout=8, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 1. Open Graph image
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
                logger.debug(f"Found OG image: {img[:60]}...")
                return img
        
        # 2. Twitter image
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
                logger.debug(f"Found Twitter image: {img[:60]}...")
                return img
        
        # 3. Find first large image in article
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
                    logger.debug(f"Found article image: {src[:60]}...")
                    return src
        
        # 4. Find any large image
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
                    # Check if it has a decent size
                    width = img.get('width')
                    if width:
                        try:
                            if int(width) > 100:
                                logger.debug(f"Found image with width {width}")
                                return src
                        except:
                            pass
                    # If no width, check srcset for large version
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
                                logger.debug(f"Found srcset image: {src[:60]}...")
                                return src
                    # Fallback: take the first non-icon image
                    logger.debug(f"Found image: {src[:60]}...")
                    return src
        
        return None
    except Exception as e:
        logger.debug(f"Failed to extract image from {url}: {e}")
        return None

# --- Clean image URL ---
def clean_image_url(image_url: str, base_url: str) -> Optional[str]:
    if not image_url:
        return None
    
    # Remove query params sometimes
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
                    
                    # --- IMAGE EXTRACTION (AGGRESSIVE) ---
                    image_url = None
                    
                    # 1. Try RSS media tags
                    image_url = extract_image_from_rss(entry)
                    
                    # 2. If no image, scrape the article page with BeautifulSoup
                    if not image_url:
                        try:
                            img = extract_image_from_html(url, session)
                            if img:
                                image_url = clean_image_url(img, url)
                                if image_url:
                                    logger.info(f"✅ Found image for '{title[:30]}'")
                        except Exception as e:
                            logger.debug(f"Failed to scrape image from {url}: {e}")
                    
                    # 3. Clean the image URL
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

# --- Cluster and Store (with retry logic) ---
def cluster_and_store(raw_articles: List[Dict[str, Any]], job_id: Optional[str] = None) -> Dict[str, Any]:
    def do_clustering():
        db = SessionLocal()
        
        try:
            if not job_id:
                job_id = str(uuid.uuid4())
            
            scrape_run = ScrapeRun(id=str(uuid.uuid4()), job_id=job_id, status="running")
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
                db.query(ScrapeRun).filter(ScrapeRun.id == scrape_run.id).update({
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
                db.query(ScrapeRun).filter(ScrapeRun.id == scrape_run.id).update({
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
            
            db.query(ScrapeRun).filter(ScrapeRun.id == scrape_run.id).update({
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
    
    # Execute with retry logic
    return execute_db_with_retry(do_clustering)

# --- Run once (for manual triggering) ---
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

# --- Flask Routes ---
@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "service": "News Scraper",
        "endpoints": {
            "/": "Health check",
            "/run": "Run scraper manually",
            "/run-sync": "Run scraper synchronously (for cron jobs)",
            "/health": "Health check"
        }
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()})

@app.route('/run')
def run_scraper():
    """Manual trigger endpoint"""
    try:
        # Run the scraper in a separate thread so it doesn't block
        thread = threading.Thread(target=run_scraper_once)
        thread.start()
        return jsonify({
            "status": "started",
            "message": "Scraper started in background",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to start scraper: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/run-sync')
def run_scraper_sync():
    """Synchronous run (for cron jobs)"""
    try:
        result = run_scraper_once()
        return jsonify({
            "status": "completed",
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Background Scheduler (keeps the app awake) ---
def scheduled_scraper():
    """Run scraper every 10 minutes"""
    while True:
        try:
            logger.info("=== SCHEDULED SCRAPE START ===")
            run_scraper_once()
            logger.info("=== SCHEDULED SCRAPE COMPLETE ===")
        except Exception as e:
            logger.error(f"Scheduled scraper failed: {e}")
        time.sleep(600)  # 10 minutes

# --- Start background scheduler thread ---
scheduler_thread = threading.Thread(target=scheduled_scraper, daemon=True)
scheduler_thread.start()
atexit.register(lambda: logger.info("Shutting down..."))

# --- Main Execution ---
if __name__ == "__main__":
    # Get port from environment (Render sets this automatically)
    port = int(os.getenv("PORT", 10000))
    
    # Run the Flask app
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)