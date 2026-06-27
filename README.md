# News Pulse

![Python](https://img.shields.io/badge/Python-3.13.5-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-API-black?logo=flask&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A full-stack news aggregation and clustering application that automatically scrapes news from 7 major sources, groups similar articles together using machine learning, and presents them through a modern, interactive web interface.

## Live Demo

* **Frontend:** [https://news-pulse-tvh9.vercel.app](https://news-pulse-tvh9.vercel.app)
* **Backend API:** [https://news-pulse-1.onrender.com](https://news-pulse-1.onrender.com)
* **API Health Check:** [https://news-pulse-1.onrender.com/health](https://news-pulse-1.onrender.com/health)
* **Clusters Endpoint:** [https://news-pulse-1.onrender.com/clusters](https://news-pulse-1.onrender.com/clusters)

## Features

* **Automated News Scraping:** Fetches articles from BBC, Al Jazeera, CNN, Fox News, NBC News, and Sky News.
* **Intelligent Clustering:** Groups related articles using TF-IDF vectorization and cosine similarity.
* **Image Extraction:** Multi-step image detection (RSS media tags, Open Graph, Twitter Cards, HTML scraping).
* **Real-time Dashboard:** Interactive Next.js frontend with live feed, topic views, and analytics.
* **Auto-scheduling:** Background scraper runs autonomously every 10 minutes.
* **Modern UI:** Dark-themed, responsive design with Framer Motion animations.
* **Free Tier Ready:** Deployed optimally on the free tiers of Render, Vercel, and Neon.

## Architecture

### High-Level Overview

The system follows a consolidated two-tier architecture, combining the REST API and the data science scraping pipeline into a unified Python environment. This eliminates unnecessary network hops, keeps API responses in the sub-ms range, and simplifies the deployment strategy.

```text
+---------------------------------------------------------------------------------+
|                            NEWS PULSE ARCHITECTURE                              |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +----------------+     +----------------+     +----------------+               |
|  |   Frontend     |     |   Backend      |     |   Database     |               |
|  |   (Vercel)     |---->|   (Render)     |---->|    (Neon)      |               |
|  |   Next.js 15   |     |   Flask        |     |  PostgreSQL    |               |
|  +----------------+     +----------------+     +----------------+               |
|        |                       |                      |                         |
|        v                       v                      v                         |
|  +----------------+     +----------------+     +----------------+               |
|  |   User         |     |   Scraper      |     |   Clusters     |               |
|  |   Interface    |     |   Service      |     |   Articles     |               |
|  |  (Tailwind)    |     |   (Python)     |     |   ScrapeRun    |               |
|  +----------------+     +----------------+     +----------------+               |
|        |                       |                      |                         |
|        v                       v                      v                         |
|  +----------------+     +----------------+     +----------------+               |
|  |  Framer        |     |  Scheduler     |     |  Image         |               |
|  |  Motion        |     |  (Thread)      |     |  Proxy         |               |
|  |  Animations    |     |  Every 10min   |     |  Service       |               |
|  +----------------+     +----------------+     +----------------+               |
|                                                                                 |
+---------------------------------------------------------------------------------+

```

### Detailed Component Architecture

```text
+=================================================================================+
|                          DETAILED SYSTEM ARCHITECTURE                           |
+=================================================================================+
|                                                                                 |
|  +==========================+     +==========================+                  |
|  |       FRONTEND           |     |        BACKEND           |                  |
|  |       (Vercel)           |     |        (Render)          |                  |
|  +==========================+     +==========================+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  |   Next.js 15       |  |     |  |   Flask Server     |  |                  |
|  |  |   +-------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |   |  React      |  |  |     |  |   |  Routes     |  |  |                  |
|  |  |   |  Components |  |  |     |  |   |  - /        |  |  |                  |
|  |  |   +-------------+  |  |     |  |   |  - /health  |  |  |                  |
|  |  |   +-------------+  |  |     |  |   |  - /clusters|  |  |                  |
|  |  |   |  State      |  |  |     |  |   |  - /ingest  |  |  |                  |
|  |  |   |  Management |  |  |     |  |   |  - /proxy   |  |  |                  |
|  |  |   |  (Hooks)    |  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   |   CORS      |  |  |                  |
|  |  |   |  API Client |  |  |     |  |   |   Middleware|  |  |                  |
|  |  |   |  (Axios)    |  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   |  Scheduler  |  |  |                  |
|  |  |   |  UI         |  |  |     |  |   |  (Thread)   |  |  |                  |
|  |  |   |  (Tailwind) |  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   |  Scraper    |  |  |                  |
|  |  |   |  Animations |  |  |     |  |   |  Pipeline   |  |  |                  |
|  |  |   |  (Framer)   |  |  |     |  |   +-------------+  |  |                  |
|  |  |   +-------------+  |  |     |  |   +-------------+  |  |                  |
|  |  +--------------------+  |     |  |   |  Database   |  |  |                  |
|  |                          |     |  |   |  (SQLAlchemy)|  |  |                  |
|  +==========================+     |  |   +-------------+  |  |                  |
|              |                    |  |   +-------------+  |  |                  |
|              | HTTP/HTTPS         |  |   |  Image      |  |  |                  |
|              | (REST API)         |  |   |  Proxy      |  |  |                  |
|              v                    |  |   +-------------+  |  |                  |
|  +==========================+     |  +--------------------+  |                  |
|  |       DATABASE           |     |                          |                  |
|  |       (Neon)             |     |  +--------------------+  |                  |
|  +==========================+     |  |   ML Pipeline      |  |                  |
|  |                          |     |  |   +-------------+  |  |                  |
|  |  +--------------------+  |     |  |   |  TF-IDF     |  |  |                  |
|  |  |  PostgreSQL        |  |     |  |   |  Vectorizer |  |  |                  |
|  |  |  +--------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |  |  Clusters    |  |  |     |  |   +-------------+  |  |                  |
|  |  |  |  Table       |  |  |     |  |   |  Cosine     |  |  |                  |
|  |  |  +--------------+  |  |     |  |   |  Similarity |  |  |                  |
|  |  |  +--------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |  |  Articles    |  |  |     |  |   +-------------+  |  |                  |
|  |  |  |  Table       |  |  |     |  |   |  Union-Find |  |  |                  |
|  |  |  +--------------+  |  |     |  |   |  Clustering |  |  |                  |
|  |  |  +--------------+  |  |     |  |   +-------------+  |  |                  |
|  |  |  |  ScrapeRun   |  |  |     |  +--------------------+  |                  |
|  |  |  |  Table       |  |  |     |                          |                  |
|  |  |  +--------------+  |  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  |   External         |  |                  |
|  |                          |     |  |   Services         |  |                  |
|  +==========================+     |  |   +-------------+  |  |                  |
|              ^                    |  |   |  RSS Feeds  |  |  |                  |
|              |                    |  |   |  7 Sources  |  |  |                  |
|              | SQLAlchemy ORM     |  |   +-------------+  |  |                  |
|              | (Connection Pool)  |  |   +-------------+  |  |                  |
|              |                    |  |   |  Article    |  |  |                  |
|              +---------------------+  |   |  Pages      |  |  |                  |
|                                       |   +-------------+  |  |                  |
|                                       +--------------------+  |                  |
|                                       +--------------------+  |                  |
|                                       |   Scheduler        |  |                  |
|                                       |   (Internal)       |  |                  |
|                                       +--------------------+  |                  |
|                                       +--------------------+  |                  |
|                                       |   Image Proxy      |  |                  |
|                                       |   (CORS Bypass)    |  |                  |
|                                       +--------------------+  |                  |
|                                                                                 |
+=================================================================================+

```

### Component Breakdown

**1. Presentation Layer (Frontend)**
Hosted on Vercel, the frontend is built with Next.js 15 and React. It serves as a real-time visualization dashboard. State management uses React hooks to handle live polling, data refreshing, and UI state. It is styled with Tailwind CSS using a custom glassmorphism design system, while Framer Motion drives the animations. An image proxy strategy bypasses strict CORS policies on external news images.

**2. Application & API Layer (Backend)**
Hosted on Render, the backend operates as a Flask web server. It exposes REST API endpoints for the frontend to retrieve chronological clusters, fetch individual articles, and manually trigger scraping jobs. A background daemon thread executes the scraping pipeline autonomously every 10 minutes without blocking incoming HTTP requests.

**3. Data Processing & Machine Learning Pipeline**
Integrated directly into the Flask application, this pipeline is the core engine. It uses `feedparser` to pull live data, `trafilatura` to scrape the full body text, and a multi-tiered fallback for media extraction. Text data is vectorized using TF-IDF (Term Frequency-Inverse Document Frequency). A Cosine Similarity matrix is calculated to group articles meeting a 0.25 similarity threshold using a custom Union-Find algorithm.

**4. Persistence Layer (Database)**
Hosted on Neon, the database is a managed PostgreSQL instance. Interactions are handled via SQLAlchemy, ensuring structured schemas for Clusters, Articles, and ScrapeRuns. PostgreSQL connection pooling prevents database lockups during high-volume scraping jobs.

## Data Flow & Processing Pipeline

### Complete End-to-End Data Flow

```text
+=================================================================================+
|                        END-TO-END DATA FLOW                                     |
+=================================================================================+
|                                                                                 |
|  +------------------+                                                           |
|  |  1. User Action  |                                                           |
|  |  * Page Load     |                                                           |
|  |  * Click Refresh |                                                           |
|  |  * Filter Source |                                                           |
|  +--------+---------+                                                           |
|           |                                                                     |
|           v                                                                     |
|  +------------------+                                                           |
|  |  2. Frontend     |                                                           |
|  |  * API Call      |                                                           |
|  |  * Polling       |                                                           |
|  |  * Render UI     |                                                           |
|  +--------+---------+                                                           |
|           |                                                                     |
|           | HTTP/HTTPS (REST API)                                               |
|           v                                                                     |
|  +------------------+     +------------------+     +------------------+         |
|  |  3. Flask API    |---->|  4. Database     |---->|  5. Response     |         |
|  |  * Route Handler |     |  * Query         |     |  * JSON          |         |
|  |  * Serialize     |     |  * Transform     |     |  * Status Codes  |         |
|  +------------------+     +------------------+     +------------------+         |
|                                                                                 |
|                     +--------------------------------------------------+        |
|                     |  6. Background Scheduler (Every 10 Minutes)      |        |
|                     +--------------------------------------------------+        |
|                     |                                                  |        |
|                     v                                                  |        |
|  +------------------+     +------------------+     +------------------+         |
|  |  7. RSS Fetch    |---->|  8. Article      |---->|  9. Image        |         |
|  |  * 7 Sources     |     |  Extraction      |     |  Extraction      |         |
|  |  * Feedparser    |     |  * Trafilatura   |     |  * Multi-step    |         |
|  +------------------+     +------------------+     +------------------+         |
|                                      |                                          |
|                                      v                                          |
|  +------------------+     +------------------+     +------------------+         |
|  | 10. Deduplicate  |---->| 11. TF-IDF       |---->| 12. Clustering   |         |
|  |  * Check URLs    |     |  * Vectorization |     |  * Cosine Sim    |         |
|  |  * Filter New    |     |  * Feature Matrix|     |  * Union-Find    |         |
|  +------------------+     +------------------+     +------------------+         |
|                                      |                                          |
|                                      v                                          |
|  +------------------+     +------------------+     +------------------+         |
|  | 13. Store        |---->| 14. Update       |---->| 15. Log          |         |
|  |  * Clusters      |     |  * ScrapeRun     |     |  * Success       |         |
|  |  * Articles      |     |  * Status        |     |  * Error         |         |
|  +------------------+     +------------------+     +------------------+         |
|                                                                                 |
|                     +--------------------------------------------------+        |
|                     |  16. Frontend Update (Auto-refresh)              |        |
|                     +--------------------------------------------------+        |
|                                                                                 |
+=================================================================================+

```

### Scraping Pipeline Steps

**Step 1: RSS Feed Fetching**

* The system queries 7 RSS feeds concurrently using a session with retry logic
* Each feed returns up to 30 recent articles
* HTTP adapter with retry handles network failures

**Step 2: Article Content Extraction**

* For each article, `trafilatura` extracts clean body text
* Fallback to RSS summary if extraction fails
* Minimum length validation (>100 characters)

**Step 3: Image Extraction (Multi-Step)**

* **Step 3a:** RSS media tags (media_thumbnail, media_content, enclosures)
* **Step 3b:** Open Graph meta tags (og:image)
* **Step 3c:** Twitter Cards (twitter:image)
* **Step 3d:** HTML scraping for article images
* **Step 3e:** URL cleaning and validation

**Step 4: Deduplication**

* Checks existing URLs in database
* Uses set intersection for O(1) lookup
* Only new articles proceed to clustering

**Step 5: TF-IDF Vectorization**

* Combines title and first 1000 characters of body
* Removes English stop words
* Limits to 1000 most important features
* Creates sparse matrix representation

**Step 6: Clustering with Union-Find**

* Calculates cosine similarity matrix
* Threshold: 0.25 (tuned for news similarity)
* Union-Find algorithm merges similar articles
* Clusters with ≥2 articles are saved

**Step 7: Storage & Logging**

* Clusters and articles saved to PostgreSQL
* ScrapeRun status updated
* Job ID returned for async tracking

## Database Schema

### Entity Relationship Diagram

```text
+=========================+     +=========================+
|       CLUSTERS          |     |       ARTICLES          |
+=========================+     +=========================+
| id          (PK)        |<----| cluster_id    (FK)      |
| label       (String)    |     | id            (PK)      |
| article_count (Int)     |     | url           (Unique)  |
| start_time   (DateTime) |     | title         (String)  |
| end_time     (DateTime) |     | body          (Text)    |
+=========================+     | summary       (Text)    |
          |                      | image_url     (String)  |
          |                      | source        (String)  |
          |                      | published_at  (DateTime)|
          |                      +=========================+
          |
          | 1 : M
          |
          v
+=========================+
|     SCRAPE_RUNS         |
+=========================+
| id            (PK)      |
| job_id        (Unique)  |
| status        (String)  |
| started_at    (DateTime)|
| completed_at  (DateTime)|
| articles_found (Int)    |
| articles_new  (Int)     |
| clusters_created (Int)  |
| error_message (Text)    |
+=========================+

```

### Table Descriptions

**Clusters Table**

* Stores groups of related articles
* `label`: Headline of the most prominent article
* `article_count`: Denormalized count for quick sorting
* `start_time`/`end_time`: Time range of articles in cluster

**Articles Table**

* Stores individual news articles
* `url`: Unique identifier for deduplication
* `image_url`: Extracted lead image
* `cluster_id`: Foreign key linking to cluster

**ScrapeRun Table**

* Tracks each scraping job execution
* `job_id`: External identifier for polling
* `status`: running, completed, failed
* Stores metrics for monitoring

## Data Flow Sequence Diagrams

### Manual Scrape Trigger

```text
Frontend                Flask API              Database              External Sources
    |                       |                      |                        |
    |  1. POST /ingest/trigger                    |                        |
    |-------------------------------------------->|                        |
    |                       |  2. Create job_id    |                        |
    |                       |----------------------|                        |
    |                       |  3. INSERT ScrapeRun |                        |
    |                       |----------------------|                        |
    |  4. Return job_id     |                      |                        |
    |<---------------------------------------------|                        |
    |                       |                      |                        |
    |  5. GET /ingest/status/{job_id}             |                        |
    |-------------------------------------------->|                        |
    |                       |  6. Query ScrapeRun  |                        |
    |                       |----------------------|                        |
    |  7. Return status     |                      |                        |
    |<---------------------------------------------|                        |
    |                       |                      |                        |
    |   (Background Thread) |  8. Fetch RSS Feeds  |                        |
    |                       |--------------------------------------------->|
    |                       |  9. Return articles  |                        |
    |                       |<---------------------------------------------|
    |                       |  10. Extract content |                        |
    |                       |--------------------------------------------->|
    |                       |  11. Return content  |                        |
    |                       |<---------------------------------------------|
    |                       |  12. TF-IDF + Clustering                    |
    |                       |-------------------------------------------->|
    |                       |  13. INSERT Clusters + Articles             |
    |                       |-------------------------------------------->|
    |                       |  14. UPDATE ScrapeRun                       |
    |                       |-------------------------------------------->|
    |  15. Status complete  |                      |                        |
    |<---------------------------------------------|                        |

```

### Automatic Scheduler Flow

```text
    Scheduler              Flask API              Database              External Sources
    (Thread)                   |                      |                        |
        |                      |                      |                        |
        |  1. Sleep 600s       |                      |                        |
        |----------------------|                      |                        |
        |                      |                      |                        |
        |  2. Wake up          |                      |                        |
        |----------------------|                      |                        |
        |  3. Call fetch_articles()                   |                        |
        |----------------------|                      |                        |
        |                      |  4. Fetch RSS Feeds  |                        |
        |                      |--------------------------------------------->|
        |                      |  5. Return articles  |                        |
        |                      |<---------------------------------------------|
        |                      |  6. Extract content  |                        |
        |                      |--------------------------------------------->|
        |                      |  7. Return content  |                        |
        |                      |<---------------------------------------------|
        |                      |  8. Extract images   |                        |
        |                      |--------------------------------------------->|
        |                      |  9. Return images    |                        |
        |                      |<---------------------------------------------|
        |                      |  10. Deduplicate      |                        |
        |                      |-------------------------------------------->|
        |                      |  11. Existing URLs   |                        |
        |                      |<--------------------------------------------|
        |                      |  12. TF-IDF + Clustering                    |
        |                      |-------------------------------------------->|
        |                      |  13. Save to DB      |                        |
        |                      |-------------------------------------------->|
        |                      |  14. Log complete    |                        |
        |                      |-------------------------------------------->|
        |  15. Repeat          |                      |                        |
        |----------------------|                      |                        |

```

## Deployment Architecture

### Cloud Infrastructure

```text
+=================================================================================+
|                           DEPLOYMENT ARCHITECTURE                               |
+=================================================================================+
|                                                                                 |
|  +============================+     +============================+              |
|  |         VERCEL             |     |         RENDER             |              |
|  |      (Frontend)            |     |      (Backend)             |              |
|  +============================+     +============================+              |
|  |                            |     |                            |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |  |  Next.js 15          |  |     |  |  Flask API           |  |              |
|  |  |  * SSR/SSG           |  |     |  |  * Python 3.13.5     |  |              |
|  |  |  * Static Export     |  |     |  |  * Gunicorn          |  |              |
|  |  |  * ISR               |  |     |  |  * Connection Pool   |  |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |                            |     |  +----------------------+  |              |
|  |  +----------------------+  |     |  |  Scraper Engine      |  |              |
|  |  |  Environment         |  |     |  |  * RSS Feeds         |  |              |
|  |  |  * NEXT_PUBLIC_API   |  |     |  |  * TF-IDF            |  |              |
|  |  +----------------------+  |     |  |  * Clustering        |  |              |
|  |                            |     |  +----------------------+  |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |  |  Custom Domain       |  |     |  |  Scheduler           |  |              |
|  |  |  * Vercel Subdomain  |  |     |  |  * Daemon Thread     |  |              |
|  |  +----------------------+  |     |  |  * Every 10 minutes  |  |              |
|  |                            |     |  +----------------------+  |              |
|  +============================+     +============================+              |
|              |                                     |                            |
|              | HTTP/HTTPS                          | SQLAlchemy ORM             |
|              |                                     |                            |
|              v                                     v                            |
|  +============================+     +============================+              |
|  |           NEON             |     |         CRON-JOB.ORG       |              |
|  |       (Database)           |     |      (Keep-alive)          |              |
|  +============================+     +============================+              |
|  |                            |     |                            |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |  |  PostgreSQL 16       |  |     |  |  Scheduled Job       |  |              |
|  |  |  * Connection Pool   |  |     |  |  * Every 5 minutes   |  |              |
|  |  |  * SSL Encryption    |  |     |  |  * Ping /health      |  |              |
|  |  |  * Automatic Backup  |  |     |  |  * Prevent sleep     |  |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |                            |     |                            |              |
|  |  +----------------------+  |     +============================+              |
|  |  |  Free Tier Limits    |  |                                                 |
|  |  |  * 1 GB Storage      |  |                                                 |
|  |  |  * 30 Day Retention  |  |                                                 |
|  |  +----------------------+  |                                                 |
|  +============================+                                                 |
|                                                                                 |
+=================================================================================+

```

### Deployment Configuration

**Render Configuration**

| Setting | Value |
| --- | --- |
| **Environment** | Python 3 |
| **Root Directory** | scraper |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python3 main.py` |
| **Instance Type** | Free |
| **Port** | 10000 |

**Vercel Configuration**

| Setting | Value |
| --- | --- |
| **Framework** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |
| **Environment Variable** | `NEXT_PUBLIC_API_URL` |

**Neon Configuration**

| Setting | Value |
| --- | --- |
| **Plan** | Free Tier |
| **Storage** | 1 GB |
| **Connections** | 5 max concurrent |
| **SSL** | Required |
| **Backups** | Automatic (30 days) |

## API Architecture

### Request-Response Flow

```text
+=================================================================================+
|                        REQUEST-RESPONSE FLOW                                    |
+=================================================================================+
|                                                                                 |
|  +------------------+                                                           |
|  |  Client Request  |                                                           |
|  |  * Next.js Front |                                                           |
|  |  * Axios Client  |                                                           |
|  +--------+---------+                                                           |
|           |                                                                     |
|           | HTTP Request                                                        |
|           | * Method: GET/POST                                                  |
|           | * Headers: Accept, CORS                                             |
|           | * Body: JSON (for POST)                                             |
|           v                                                                     |
|  +------------------+     +------------------+     +------------------+         |
|  |  Flask Router    |---->|  CORS Middleware |---->|  Route Handler   |         |
|  |  * URL Routing   |     |  * Origin Check  |     |  * Business Logic|         |
|  +------------------+     +------------------+     +------------------+         |
|                                                                |                |
|                                                                v                |
|  +------------------+     +------------------+     +------------------+         |
|  |  Serialization   |<----|  Database Query  |<----|  Model Objects   |         |
|  |  * JSON Response |     |  * SQLAlchemy    |     |  * SQLAlchemy    |         |
|  |  * Status Code   |     |  * Connection    |     |  * ORM           |         |
|  +------------------+     +------------------+     +------------------+         |
|           |                                                                     |
|           | HTTP Response                                                       |
|           | * Status: 200/404/500                                               |
|           | * Body: JSON                                                        |
|           | * Headers: Content-Type, CORS                                       |
|           v                                                                     |
|  +------------------+                                                           |
|  |  Client Response |                                                           |
|  |  * React Render  |                                                           |
|  |  * UI Update     |                                                           |
|  +------------------+                                                           |
|                                                                                 |
+=================================================================================+

```

### API Endpoint Details

**1. GET /clusters**

```text
+--------------------------------------------------+
|  GET /clusters                                   |
+--------------------------------------------------+
|  Purpose: Retrieve all clusters with articles    |
|  Response Time: < 500ms                          |
|  Authentication: None                            |
+--------------------------------------------------+
|  Request:                                        |
|  * No parameters required                        |
|                                                  |
|  Response:                                       |
|  {                                               |
|    "success": true,                              |
|    "clusters": [                                 |
|      {                                           |
|        "id": "uuid",                             |
|        "label": "Headline",                      |
|        "article_count": 4,                       |
|        "start_time": "ISO-8601",                 |
|        "end_time": "ISO-8601",                   |
|        "articles": [                             |
|          {                                       |
|            "id": "uuid",                         |
|            "title": "Article title",             |
|            "url": "https://...",                 |
|            "summary": "Brief summary",           |
|            "image_url": "https://...",           |
|            "source": "BBC News",                 |
|            "published_at": "ISO-8601"            |
|          }                                       |
|        ]                                         |
|      }                                           |
|    ],                                            |
|    "sources": [                                  |
|      {"source": "BBC News", "count": 12}         |
|    ]                                             |
|  }                                               |
+--------------------------------------------------+

```

**2. POST /ingest/trigger**

```text
+--------------------------------------------------+
|  POST /ingest/trigger                            |
+--------------------------------------------------+
|  Purpose: Start a new scraping job asynchronously|
|  Response Time: < 100ms                          |
|  Authentication: None                            |
+--------------------------------------------------+
|  Request:                                        |
|  * Empty body (or optional job_id)               |
|                                                  |
|  Response:                                       |
|  {                                               |
|    "success": true,                              |
|    "job_id": "uuid"                              |
|  }                                               |
|                                                  |
|  Background Process:                             |
|  1. Fetch articles from 7 sources                |
|  2. Extract content and images                   |
|  3. Cluster using TF-IDF + Cosine Similarity     |
|  4. Save to database                             |
|  5. Update job status in ScrapeRun table         |
+--------------------------------------------------+

```

**3. GET /ingest/status/{job_id}**

```text
+--------------------------------------------------+
|  GET /ingest/status/{job_id}                     |
+--------------------------------------------------+
|  Purpose: Check job status and results           |
|  Response Time: < 100ms                          |
|  Authentication: None                            |
+--------------------------------------------------+
|  Request:                                        |
|  * URL parameter: job_id (UUID)                  |
|                                                  |
|  Response:                                       |
|  {                                               |
|    "status": "running|completed|failed",         |
|    "articles_found": 150,                        |
|    "articles_new": 65,                           |
|    "clusters_created": 1,                        |
|    "error_message": null                         |
|  }                                               |
+--------------------------------------------------+

```

**4. GET /health**

```text
+--------------------------------------------------+
|  GET /health                                     |
+--------------------------------------------------+
|  Purpose: Health check for monitoring            |
|  Response Time: < 50ms                           |
|  Authentication: None                            |
+--------------------------------------------------+
|  Response:                                       |
|  {                                               |
|    "status": "healthy",                          |
|    "timestamp": "ISO-8601"                       |
|  }                                               |
|                                                  |
|  Usage:                                          |
|  * Used by cron-job.org for keep-alive           |
|  * Render health check                           |
+--------------------------------------------------+

```

## External Service Integration

### News Source Connections

```text
+=================================================================================+
|                        EXTERNAL SERVICE CONNECTIONS                             |
+=================================================================================+
|                                                                                 |
|  +--------------------------+     +--------------------------+                  |
|  |      RSS FEEDS           |     |      ARTICLE PAGES       |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | BBC News           |  |     |  | BBC News           |  |                  |
|  |  | feeds.bbci.co.uk   |  |     |  | [bbc.com/news](https://bbc.com/news)       |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Al Jazeera         |  |     |  | Al Jazeera         |  |                  |
|  |  | [aljazeera.com/xml](https://aljazeera.com/xml)  |  |     |  | aljazeera.com      |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | CNN                |  |     |  | CNN                |  |                  |
|  |  | rss.cnn.com        |  |     |  | cnn.com            |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Fox News           |  |     |  | Fox News           |  |                  |
|  |  | feeds.foxnews.com  |  |     |  | foxnews.com        |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | NBC News           |  |     |  | NBC News           |  |                  |
|  |  | feeds.nbcnews.com  |  |     |  | nbcnews.com        |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Sky News           |  |     |  | Sky News           |  |                  |
|  |  | [skynews.com/feeds](https://skynews.com/feeds)  |  |     |  | news.sky.com       |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |                          |     |                          |                  |
|  +--------------------------+     +--------------------------+                  |
|           |                                      |                              |
|           | HTTP GET                             | HTTP GET                     |
|           | * User-Agent: Mozilla                | * User-Agent: Mozilla        |
|           | * Timeout: 10s                       | * Timeout: 8s                |
|           | * Retry: 2x                          | * Retry: 2x                  |
|           v                                      v                              |
|  +--------------------------+     +--------------------------+                  |
|  |      RESPONSE            |     |      RESPONSE            |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | RSS XML Feed       |  |     |  | HTML Page          |  |                  |
|  |  | * Entries          |  |     |  | * Open Graph       |  |                  |
|  |  | * Metadata         |  |     |  | * Twitter Cards    |  |                  |
|  |  | * Media Tags       |  |     |  | * Article Content  |  |                  |
|  |  +--------------------+  |     |  | * Images           |  |                  |
|  |                          |     |  +--------------------+  |                  |
|  +--------------------------+     +--------------------------+                  |
|                                                                                 |
+=================================================================================+

```

### Database Connection

```text
+=================================================================================+
|                        DATABASE CONNECTION FLOW                                 |
+=================================================================================+
|                                                                                 |
|  +--------------------------+     +--------------------------+                  |
|  |      FLASK APP           |     |      NEON POSTGRESQL     |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Connection Pool    |  |     |  | Connection Pool    |  |                  |
|  |  | * pool_size: 5     |  |     |  | * max: 5           |  |                  |
|  |  | * max_overflow: 10 |  |     |  | * idle_timeout: 30 |  |                  |
|  |  | * pool_recycle: 300|  |     |  | * ssl: require     |  |                  |
|  |  | * pool_pre_ping: T |  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  | Database Instance  |  |                  |
|  |  | SQLAlchemy ORM     |  |     |  | * Version: 16      |  |                  |
|  |  | * Session Manager  |  |     |  | * Region: AWS      |  |                  |
|  |  | * Model Mappings   |  |     |  | * Backup: Daily    |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Operations         |  |     |  | Tables             |  |                  |
|  |  | * INSERT           |  |     |  | * clusters         |  |                  |
|  |  | * SELECT           |  |     |  | * articles         |  |                  |
|  |  | * UPDATE           |  |     |  | * scrape_runs      |  |                  |
|  |  | * DELETE           |  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |                          |                  |
|  |                          |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  | Connection String  |  |                  |
|  |  | Error Handling     |  |     |  | * sslmode=require  |  |                  |
|  |  | * SSL Errors       |  |     |  | * host: neon.tech  |  |                  |
|  |  | * Timeout Retry    |  |     |  +--------------------+  |                  |
|  |  | * Connection Reset |  |     |                          |                  |
|  |  +--------------------+  |     |                          |                  |
|  |                          |     |                          |                  |
|  +--------------------------+     +--------------------------+                  |
|           |                                      |                              |
|           | SQLAlchemy ORM                       | TCP/SSL                      |
|           | * Autocommit: False                  | * Port: 5432                 |
|           | * Autoflush: True                    | * Cipher: TLS 1.2+           |
|           | * Expire_on_commit: True             | * Timeout: 30s               |
|           v                                      v                              |
|  +--------------------------+     +--------------------------+                  |
|  |      RESPONSE            |     |      RESPONSE            |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Query Results      |  |     |  | Query Results      |  |                  |
|  |  | * Clusters         |  |     |  | * Clusters         |  |                  |
|  |  | * Articles         |  |     |  | * Articles         |  |                  |
|  |  | * ScrapeRun        |  |     |  | * ScrapeRun        |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |                          |     |                          |                  |
|  +--------------------------+     +--------------------------+                  |
|                                                                                 |
+=================================================================================+

```

## Security Architecture

```text
+=================================================================================+
|                          SECURITY ARCHITECTURE                                  |
+=================================================================================+
|                                                                                 |
|  +--------------------------+     +--------------------------+                  |
|  |      LAYER 1:            |     |      LAYER 2:            |                  |
|  |      FRONTEND            |     |      NETWORK             |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | HTTPS Only         |  |     |  | SSL/TLS 1.2+       |  |                  |
|  |  | * Vercel enforces  |  |     |  | * Render enforces  |  |                  |
|  |  | * HSTS Header      |  |     |  | * Certificate      |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | CSP Headers        |  |     |  | CORS Restricted    |  |                  |
|  |  | * Restricted CDN   |  |     |  | * Vercel domains   |  |                  |
|  |  | * No eval()        |  |     |  | * Localhost dev    |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  +--------------------------+     +--------------------------+                  |
|                                                                                 |
|  +--------------------------+     +--------------------------+                  |
|  |      LAYER 3:            |     |      LAYER 4:            |                  |
|  |      APPLICATION         |     |      DATABASE            |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Environment Vars   |  |     |  | SSL Required       |  |                  |
|  |  | * DATABASE_URL     |  |     |  | * sslmode=require  |  |                  |
|  |  | * API Keys         |  |     |  | * No plaintext     |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Input Validation   |  |     |  | Connection Pool    |  |                  |
|  |  | * URL Validation   |  |     |  | * Limit: 5         |  |                  |
|  |  | * Data Sanitization|  |     |  | * Overflow: 10     |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Error Handling     |  |     |  | Prepared Statements|  |                  |
|  |  | * No stack traces  |  |     |  | * SQLAlchemy ORM   |  |                  |
|  |  | * Generic messages |  |     |  | * No SQL injection |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  +--------------------------+     +--------------------------+                  |
|                                                                                 |
|  +--------------------------+     +--------------------------+                  |
|  |      LAYER 5:            |     |      LAYER 6:            |                  |
|  |      MONITORING          |     |      BACKUP              |                  |
|  +--------------------------+     +--------------------------+                  |
|  |                          |     |                          |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Health Checks      |  |     |  | Automatic Backups  |  |                  |
|  |  | * /health          |  |     |  | * Daily snapshots  |  |                  |
|  |  | * 200 OK required  |  |     |  | * Point-in-time    |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  |  | Logging            |  |     |  | Retention Period   |  |                  |
|  |  | * Request logging  |  |     |  | * 30 days          |  |                  |
|  |  | * Error logging    |  |     |  | * Free tier        |  |                  |
|  |  +--------------------+  |     |  +--------------------+  |                  |
|  +--------------------------+     +--------------------------+                  |
|                                                                                 |
+=================================================================================+

```

## Tech Stack

### Backend

| Technology | Version | Purpose |
| --- | --- | --- |
| **Python** | 3.13.5 | Core language |
| **Flask** | 3.1.3 | Web framework and API server |
| **Flask-CORS** | 4.0.0 | Cross-origin resource sharing |
| **SQLAlchemy** | 2.0.51 | ORM for database operations |
| **Scikit-learn** | 1.9.0 | TF-IDF vectorization and clustering |
| **Feedparser** | 6.0.12 | RSS feed parsing |
| **Trafilatura** | 2.1.0 | Article text extraction |
| **BeautifulSoup** | 4.15.0 | HTML parsing and image extraction |
| **Psycopg2** | 2.9.12 | PostgreSQL adapter |
| **Requests** | 2.34.2 | HTTP client with retry logic |
| **Numpy** | 1.26.4 | Numerical computing |
| **Scipy** | 1.17.1 | Scientific computing |

### Frontend

| Technology | Version | Purpose |
| --- | --- | --- |
| **Next.js** | 15.x | React framework |
| **React** | 19.x | UI library |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Framer Motion** | 12.x | Animations |
| **Axios** | 1.x | HTTP client |
| **date-fns** | 4.x | Date formatting |

### Database & Deployment

| Technology | Version | Purpose |
| --- | --- | --- |
| **Neon PostgreSQL** | 16.x | Managed database |
| **Render** |  | Backend hosting |
| **Vercel** |  | Frontend hosting |
| **cron-job.org** |  | Keep-alive service |

## Project Structure

```text
news--pulse/
├── frontend/                    # Next.js 15 Frontend
│   ├── app/
│   │   ├── page.js             # Main dashboard component
│   │   ├── layout.js           # Root layout with metadata
│   │   └── globals.css         # Global styles
│   ├── package.json            # Frontend dependencies
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── .env.local              # Local environment variables
├── scraper/                     # Python Backend + Scraper
│   └── main.py                 # Flask API + integrated scraper
├── backend/                     # Node.js Backend (NOT USED - kept for reference)
│   └── index.js                # Fastify API (not deployed)
├── requirements.txt             # Python dependencies
├── .python-version             # Python 3.13.5 specification
├── run.sh                      # Startup script
├── .env                        # Environment variables
└── .gitignore                  # Git ignore patterns

```

## Setup and Installation

### Prerequisites

* Python 3.13+
* Node.js 18+
* PostgreSQL (or a Neon account)
* Git

### 1. Clone the Repository

```bash
git clone [https://github.com/MrMan003/news--pulse.git](https://github.com/MrMan003/news--pulse.git)
cd news--pulse

```

### 2. Backend Setup

```bash
# Navigate to the scraper directory
cd scraper

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

```

### 3. Environment Variables

Create a `.env` file in the root directory and add your configurations:

```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
PYTHON_PATH=/usr/bin/python3
SCRAPER_PATH=./scraper
PORT=10000
CORS_ORIGIN=*
NODE_ENV=production

```

### 4. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Configure local environment variables
echo "NEXT_PUBLIC_API_URL=[https://news-pulse-1.onrender.com](https://news-pulse-1.onrender.com)" > .env.local

```

> **Note:** If deploying to Vercel, add `NEXT_PUBLIC_API_URL=https://news-pulse-1.onrender.com` to your project's Environment Variables in the Vercel dashboard.

### 5. Run Locally

To run the full stack locally, start both servers in separate terminal windows:

**Terminal 1 (Backend):**

```bash
cd scraper
python3 main.py

```

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev

```

Open `http://localhost:3000` in your browser to view the application.

## API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Service health and available endpoints |
| `/health` | `GET` | Detailed health check with timestamp |
| `/clusters` | `GET` | Retrieve all clusters with their associated articles and source counts |
| `/ingest/trigger` | `POST` | Start a new scraping job asynchronously |
| `/ingest/status/<job_id>` | `GET` | Check job status and results |
| `/proxy-image` | `GET` | Proxy external images to bypass strict CORS policies |

### Example Response: `/clusters`

```json
{
  "success": true,
  "clusters": [
    {
      "id": "uuid",
      "label": "Headline of top article in cluster",
      "article_count": 4,
      "start_time": "2026-06-26T18:36:00+00:00",
      "end_time": "2026-06-26T18:14:00+00:00",
      "articles": [
        {
          "id": "uuid",
          "title": "Article headline",
          "url": "https://...",
          "summary": "Brief summary",
          "image_url": "https://...",
          "source": "BBC News",
          "published_at": "2026-06-26T18:36:00+00:00"
        }
      ]
    }
  ],
  "sources": [
    {"source": "BBC News", "count": 12},
    {"source": "Al Jazeera", "count": 10}
  ]
}

```

## How Clustering Works

1. **TF-IDF Vectorization:** Converts raw article text into numerical vectors.
```text
Text → Tokenization → Count Vectors → TF-IDF Weights → Sparse Matrix

```


2. **Cosine Similarity:** Measures the mathematical similarity between article vectors.
```text
Similarity = (A · B) / (||A|| × ||B||)
* 1.0 = Identical
* 0.0 = Completely different

```


3. **Threshold Assessment:** A strict threshold of 0.25 is applied to group articles with high contextual similarity.
4. **Union-Find Algorithm:** Efficiently merges related articles into unified logical clusters.
```text
Initial: [1][2][3][4][5]
Merge 1-2: [1,2][3][4][5]
Merge 2-3: [1,2,3][4][5]
Final: [1,2,3] → Cluster

```



## News Sources

| Source | Feed URL |
| --- | --- |
| **BBC News** | http://feeds.bbci.co.uk/news/rss.xml |
| **BBC World** | http://feeds.bbci.co.uk/news/world/rss.xml |
| **Al Jazeera** | https://www.aljazeera.com/xml/rss/all.xml |
| **Sky News** | https://feeds.skynews.com/feeds/rss/world.xml |
| **CNN** | http://rss.cnn.com/rss/cnn_topstories.rss |
| **Fox News** | http://feeds.foxnews.com/foxnews/politics |
| **NBC News** | https://feeds.nbcnews.com/nbcnews/public/news |

## Security & Performance

### Security Measures

* **Environment Variables:** Database credentials and sensitive configuration are stored in environment variables, never in code.
* **CORS:** Strictly limited to verified origins (Vercel frontend, localhost for development).
* **SSL/TLS:** Enforced for all database connections with `sslmode=require`.
* **Connection Pooling:** Prevents database resource exhaustion during high-volume scraping jobs.
* **Input Validation:** All external inputs are validated before processing.
* **Error Handling:** Generic error messages returned to users; detailed logs stored internally.

### Performance Metrics

| Metric | Value |
| --- | --- |
| **Scrape Duration** | 2-3 minutes per run |
| **Articles per Scrape** | 150-170 total |
| **New Articles per Scrape** | 60-70 |
| **API Response Time** | < 500ms |
| **Frontend Load Time** | < 2s |
| **Database Connections** | 5 (pool) + 10 (overflow) |
| **Memory Usage** | ~200MB |
| **CPU Usage** | ~5-10% during scrape |

## Troubleshooting

### Common Issues

**1. Database Connection Errors**

```text
ERROR: Failed to connect to database: SSL connection has been closed unexpectedly

```

**Solution:** Add `pool_pre_ping=True` and `pool_recycle=300` to the database engine.

**2. Module Not Found**

```text
ModuleNotFoundError: No module named 'sklearn'

```

**Solution:** Ensure `scikit-learn` is installed: `pip install scikit-learn`

**3. CORS Errors**

```text
Access to fetch at '[https://news-pulse-1.onrender.com/clusters](https://news-pulse-1.onrender.com/clusters)' from origin '[https://news-pulse-tvh9.vercel.app](https://news-pulse-tvh9.vercel.app)' has been blocked by CORS policy

```

**Solution:** Ensure `CORS(app)` is enabled in Flask and the Vercel domain is in the allowed origins list.

**4. Image Loading Failures**

```text
404: /proxy-image?url=...

```

**Solution:** The frontend now uses direct image URLs. If still failing, check the image URL format in the database.

**5. Render Free Tier Sleep**

```text
Your free instance will spin down with inactivity...

```

**Solution:** Set up cron-job.org to ping `/health` every 5 minutes.

### Logs & Monitoring

* **Backend Logs:** Render Dashboard → Service → Logs
* **Frontend Logs:** Vercel Dashboard → Project → Deployments → Logs
* **Database Logs:** Neon Dashboard → Database → Activity
* **Error Tracking:** Check the `scrape_runs` table for job history

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

## Contact

Built by **Mitul Pabri**

* **GitHub:** [MrMan003](https://github.com/MrMan003)
* **Project Repository:** [https://github.com/MrMan003/news--pulse](https://github.com/MrMan003/news--pulse)
* **Live Demo:** [https://news-pulse-tvh9.vercel.app](https://news-pulse-tvh9.vercel.app)

## Acknowledgments

* **Render** for providing free backend hosting
* **Vercel** for providing free frontend hosting
* **Neon** for providing free PostgreSQL hosting
* **OpenAI** for inspiration on clustering algorithms
* All open-source libraries used in this project
