# News Pulse

![Python](https://img.shields.io/badge/Python-3.13.5-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-API-black?logo=flask&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-API-000000?logo=fastify&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A full-stack news aggregation and clustering application that automatically scrapes news from 7 major sources, groups similar articles together using machine learning, and presents them through a modern, interactive web interface.

***

## Live Demo

* **Frontend:** [https://news-pulse-tvh9.vercel.app](https://news-pulse-tvh9.vercel.app)
* **Node.js Backend API:** [https://news-pulse-2xcf.onrender.com](https://news-pulse-2xcf.onrender.com)
* **Python Scraper Service:** [https://news-pulse-1.onrender.com](https://news-pulse-1.onrender.com)
* **API Health Check:** [https://news-pulse-2xcf.onrender.com/health](https://news-pulse-2xcf.onrender.com/health)
* **Clusters Endpoint:** [https://news-pulse-2xcf.onrender.com/clusters](https://news-pulse-2xcf.onrender.com/clusters)

***

## Screenshots

### Home Timeline
![Home View]
<img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/0ea7550d-f0e7-4d79-8dfd-af5864374b59" />

*The main dashboard showing clustered news stories on a timeline*

### Topics View
![Topics View]
<img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/eda57586-81ea-4dc0-be9b-798e9d1223a4" />

*All topics displayed as cards with intensity indicators*

### Live Feed
![Live Feed]
<img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/4514d49a-e536-4ccd-ab18-da23b40bd579" />

*Chronological feed of news clusters*

### Analytics
![Analytics]
<img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/a821575d-9d4e-46d4-af2e-9fd8e608b58e" />

*Source distribution and statistics*

### Cluster Detail
![Cluster Detail]
<img width="1710" height="1112" alt="image" src="https://github.com/user-attachments/assets/2ff115c5-061d-4ce1-ba1b-43eca03c599d" />

*Slide-out panel showing all articles in a cluster*

### Mobile Responsive
<div align="center">
  <img src="https://github.com/user-attachments/assets/e4f1ce40-d07b-45cd-ab81-d100606dd28b" /> width="250" alt="Mobile Home" />
  <img src="screenshots/mobile-topics.png" width="250" alt="Mobile Topics" />
  <br>
  <em>Mobile views showing responsive design</em>
</div>

## Features

* **Automated News Scraping:** Fetches articles from BBC, Al Jazeera, CNN, Fox News, NBC News, and Sky News.
* **Intelligent Clustering:** Groups related articles using TF-IDF vectorization and cosine similarity.
* **Image Extraction:** Multi-step image detection (RSS media tags, Open Graph, Twitter Cards, HTML scraping).
* **Real-time Dashboard:** Interactive Next.js frontend with live feed, topic views, and analytics.
* **Auto-scheduling:** Background scraper runs autonomously every 10 minutes.
* **Modern UI:** Dark-themed, responsive design with Framer Motion animations.
* **Free Tier Ready:** Deployed optimally on the free tiers of Render, Vercel, and Neon.
* **Separate Services:** Node.js API and Python scraper run as independent services for better scalability and maintainability.

***

## Architecture

### High-Level Overview

The system follows a three-tier architecture with separate backend services:

* **Node.js + Fastify Backend:** Handles all REST API requests, job management, and image proxying.
* **Python + Flask Scraper:** Handles RSS ingestion, content extraction, and machine learning clustering.
* **Shared PostgreSQL Database:** Stores clusters, articles, and scrape run metadata.

This separation of concerns allows each service to scale independently and keeps the API layer lightweight and responsive.

```text
+=================================================================================+
|                       THREE-TIER SYSTEM ARCHITECTURE                            |
+=================================================================================+
|                                                                                 |
|  +----------------------------------------+                                     |
|  |            FRONTEND (Vercel)           |                                     |
|  |            Next.js 15 + React          |                                     |
|  +------------------+---------------------+                                     |
|                     |                                                           |
|                     | REST API Calls                                            |
|                     | https://news-pulse-2xcf.onrender.com                      |
|                     v                                                           |
|  +----------------------------------------+     +----------------------------+  |
|  |       NODE.JS BACKEND (Render)         |     |    PYTHON SCRAPER (Render) |  |
|  |       Fastify + PostgreSQL Pool        |     |    Flask + ML Pipeline     |  |
|  +------------------+---------------------+     +------------+---------------+  |
|                     |                                        |                  |
|                     | Shared Database                        | Writes to DB     |
|                     v                                        v                  |
|  +----------------------------------------+     +----------------------------+  |
|  |       DATABASE (Neon PostgreSQL)       |     |    EXTERNAL SOURCES        |  |
|  |       Clusters, Articles, ScrapeRuns   |     |    7 RSS Feeds             |  |
|  +----------------------------------------+     +----------------------------+  |
|                                                                                 |
+=================================================================================+

```

### Service Responsibilities

**Node.js Backend (`backend/index.js`)**

| Component | Responsibility |
| --- | --- |
| **Fastify Server** | REST API routing and request handling |
| **CORS Middleware** | Cross-origin resource sharing configuration |
| **PostgreSQL Pool** | Database connection management |
| **Job Tracking** | In-memory job status storage |
| **Image Proxy** | CORS bypass for external images |
| **Scraper Orchestration** | Spawns Python scraper as subprocess with job ID |

**Python Scraper (`scraper/main.py`)**

| Component | Responsibility |
| --- | --- |
| **Flask Server** | Internal API for job triggering and status |
| **RSS Feed Fetcher** | Pulls articles from 7 news sources |
| **Content Extractor** | Extracts full article text using trafilatura |
| **Image Extractor** | Multi-step image detection pipeline |
| **TF-IDF Vectorizer** | Converts text to numerical vectors |
| **Clustering Engine** | Groups similar articles using cosine similarity |
| **Background Scheduler** | Runs scraping autonomously every 10 minutes |
| **SQLAlchemy ORM** | Database operations with connection pooling |

---

## Data Flow

### Complete End-to-End Data Flow

```text
+=================================================================================+
|                        END-TO-END DATA FLOW                                     |
+=================================================================================+
|                                                                                 |
|  USER ACTION (Page Load / Refresh Click)                                        |
|         |                                                                       |
|         v                                                                       |
|  FRONTEND (Vercel)                                                              |
|  * Makes API call to /clusters                                                  |
|  * Renders timeline and clusters                                                |
|  * Polls /ingest/status for job completion                                      |
|         |                                                                       |
|         | HTTP/HTTPS (REST API)                                                 |
|         v                                                                       |
|  NODE.JS BACKEND (Render)                                                       |
|  * Receives API request                                                         |
|  * Queries PostgreSQL for clusters                                              |
|  * Returns JSON response to frontend                                            |
|         |                                                                       |
|         | ORM Query                                                             |
|         v                                                                       |
|  DATABASE (Neon PostgreSQL)                                                     |
|  * Returns clusters and articles                                                |
|                                                                                 |
|  BACKGROUND SCHEDULER (Every 10 Minutes)                                        |
|         |                                                                       |
|         v                                                                       |
|  PYTHON SCRAPER (Render)                                                        |
|  * Fetches RSS feeds from 7 sources                                             |
|  * Extracts article content and images                                          |
|  * Deduplicates against existing URLs                                           |
|  * TF-IDF vectorization and clustering                                          |
|  * Saves new clusters and articles to database                                  |
|         |                                                                       |
|         | SQLAlchemy ORM                                                        |
|         v                                                                       |
|  DATABASE (Neon PostgreSQL)                                                     |
|  * Stores new clusters and articles                                             |
|                                                                                 |
|  FRONTEND (Auto-refresh or Manual Refresh)                                      |
|  * Polls /clusters for updated data                                             |
|  * Renders updated timeline                                                     |
|                                                                                 |
+=================================================================================+

```

### Scraping Pipeline Steps

1. **RSS Feed Fetching:** Queries 7 RSS feeds concurrently using a session with retry logic. Each feed returns up to 30 recent articles.
2. **Article Content Extraction:** For each article, `trafilatura` extracts clean body text. Falls back to RSS summary if extraction fails. Minimum length validation (>100 characters).
3. **Image Extraction (Multi-Step):**
* RSS media tags (`media_thumbnail`, `media_content`, `enclosures`)
* Open Graph meta tags (`og:image`)
* Twitter Cards (`twitter:image`)
* HTML scraping for article images
* URL cleaning and validation


4. **Deduplication:** Checks existing URLs in database using set intersection for O(1) lookup. Only new articles proceed to clustering.
5. **TF-IDF Vectorization:** Combines title and first 1000 characters of body. Removes English stop words. Limits to 1000 most important features. Creates sparse matrix representation.
6. **Clustering with Union-Find:** Calculates cosine similarity matrix. Threshold: 0.25 (tuned for news similarity). Union-Find algorithm merges similar articles. Clusters with ≥2 articles are saved.
7. **Storage & Logging:** Clusters and articles saved to PostgreSQL. ScrapeRun status updated. Job ID returned for async tracking.

---

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

* **Clusters Table:** Stores groups of related articles. `label`: Headline of the most prominent article. `article_count`: Denormalized count for quick sorting. `start_time`/`end_time`: Time range of articles in cluster.
* **Articles Table:** Stores individual news articles. `url`: Unique identifier for deduplication. `image_url`: Extracted lead image. `cluster_id`: Foreign key linking to cluster.
* **ScrapeRun Table:** Tracks each scraping job execution. `job_id`: External identifier for polling. `status`: running, completed, failed. Stores metrics for monitoring.

---

## Data Flow Sequence Diagrams

### Manual Scrape Trigger

```text
Frontend          Node.js Backend       Python Scraper       Database         RSS Feeds
    |                    |                    |                |                 |
    | POST /ingest/trigger                    |                |                 |
    |--------------------------------------->|                 |                 |
    |                    |   Create job_id    |                |                 |
    |                    |--------------------|                |                 |
    |                    |   Spawn subprocess |                |                 |
    |                    |------------------->|                |                 |
    |                    |   Return job_id    |                |                 |
    |                    |<-------------------|                |                 |
    | Return job_id      |                    |                |                 |
    |<-------------------|                    |                |                 |
    |                    |                    |                |                 |
    | GET /ingest/status/{job_id}             |                |                 |
    |--------------------------------------->|                 |                 |
    |                    |  Query ScrapeRun   |                |                 |
    |                    |------------------------------------>|                 |
    |                    |  Return status     |                |                 |
    |                    |<------------------------------------|                 |
    | Return status      |                    |                |                 |
    |<-------------------|                    |                |                 |
    |                    |                    |                |                 |
    |   (Background)     |                    | Fetch RSS Feeds|                 |
    |                    |                    |--------------------------------->|
    |                    |                    | Return articles|                 |
    |                    |                    |<---------------------------------|
    |                    |                    | Extract content|                 |
    |                    |                    |--------------------------------->|
    |                    |                    | Return content |                 |
    |                    |                    |<---------------------------------|
    |                    |                    | TF-IDF + Clustering              |
    |                    |                    |--------------------------------->|
    |                    |                    | Save to DB     |                 |
    |                    |                    |--------------------------------->|
    |                    |                    | UPDATE ScrapeRun                 |
    |                    |                    |--------------------------------->|
    | Status complete    |                    |                |                 |
    |<-------------------|                    |                |                 |

```

### Automatic Scheduler Flow

```text
  Scheduler         Python Scraper          Database         RSS Feeds
   (Thread)              |                     |                |
      |                  |                     |                |
      | Sleep 600s       |                     |                |
      |----------------->|                     |                |
      |                  |                     |                |
      | Wake up          |                     |                |
      |----------------->|                     |                |
      |                  | Fetch RSS Feeds     |                |
      |                  |------------------------------------->|
      |                  | Return articles     |                |
      |                  |<-------------------------------------|
      |                  | Extract content     |                |
      |                  |------------------------------------->|
      |                  | Return content      |                |
      |                  |<-------------------------------------|
      |                  | Extract images      |                |
      |                  |------------------------------------->|
      |                  | Return images       |                |
      |                  |<-------------------------------------|
      |                  | Deduplicate         |                |
      |                  |------------------------------------->|
      |                  | Existing URLs       |                |
      |                  |<-------------------------------------|
      |                  | TF-IDF + Clustering |                |
      |                  |------------------------------------->|
      |                  | Save to DB          |                |
      |                  |------------------------------------->|
      |                  | Log complete        |                |
      |                  |------------------------------------->|
      | Repeat           |                     |                |
      |----------------->|                     |                |

```

---

## API Endpoints

### Node.js Backend ([https://news-pulse-2xcf.onrender.com](https://news-pulse-2xcf.onrender.com))

| Endpoint | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Service health and available endpoints |
| `/health` | `GET` | Detailed health check with timestamp |
| `/clusters` | `GET` | Retrieve all clusters with articles and source counts |
| `/clusters/:id` | `GET` | Retrieve a single cluster with all its articles |
| `/timeline` | `GET` | Clusters formatted for timeline visualization |
| `/ingest/trigger` | `POST` | Start a new scraping job asynchronously |
| `/ingest/status/:jobId` | `GET` | Check job status and results |
| `/proxy-image` | `GET` | Proxy external images to bypass CORS policies |

### Python Scraper ([https://news-pulse-1.onrender.com](https://news-pulse-1.onrender.com))

| Endpoint | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Service health and available endpoints |
| `/health` | `GET` | Detailed health check with timestamp |
| `/clusters` | `GET` | Retrieve all clusters with articles and source counts |
| `/ingest/trigger` | `POST` | Start a new scraping job asynchronously |
| `/ingest/status/<job_id>` | `GET` | Check job status and results |
| `/proxy-image` | `GET` | Proxy external images to bypass CORS policies |

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

---

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
|  |  |  Next.js 15          |  |     |  |  Node.js + Fastify   |  |              |
|  |  |  * SSR/SSG           |  |     |  |  * Port: 10000       |  |              |
|  |  |  * Static Export     |  |     |  |  * CORS enabled      |  |              |
|  |  |  * ISR               |  |     |  |  * Job tracking      |  |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |                            |     |                            |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |  |  Environment         |  |     |  |  Python + Flask      |  |              |
|  |  |  * NEXT_PUBLIC_API   |  |     |  |  * Port: 10000       |  |              |
|  |  +----------------------+  |     |  |  * ML Pipeline       |  |              |
|  |                            |     |  |  * Scheduler         |  |              |
|  |  +----------------------+  |     |  +----------------------+  |              |
|  |  |  URL:                |  |     |                            |              |
|  |  |  news-pulse-tvh9     |  |     |  +----------------------+  |              |
|  |  +----------------------+  |     |  |  URL:                |  |              |
|  |                            |     |  |  news-pulse-2xcf     |  |              |
|  +============================+     |  +----------------------+  |              |
|              |                      +============================+              |
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

**Node.js Backend (Render)**

| Setting | Value |
| --- | --- |
| **Environment** | Node.js |
| **Root Directory** | backend |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | Free |
| **Port** | 10000 |
| **URL** | `https://news-pulse-2xcf.onrender.com` |

**Python Scraper (Render)**

| Setting | Value |
| --- | --- |
| **Environment** | Python 3 |
| **Root Directory** | scraper |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python3 main.py` |
| **Instance Type** | Free |
| **Port** | 10000 |
| **URL** | `https://news-pulse-1.onrender.com` |

**Frontend (Vercel)**

| Setting | Value |
| --- | --- |
| **Framework** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |
| **Environment Variable** | `NEXT_PUBLIC_API_URL=https://news-pulse-2xcf.onrender.com` |
| **URL** | `https://news-pulse-tvh9.vercel.app` |

**Database (Neon)**

| Setting | Value |
| --- | --- |
| **Plan** | Free Tier |
| **Storage** | 1 GB |
| **Connections** | 5 max concurrent |
| **SSL** | Required |
| **Backups** | Automatic (30 days) |

---

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
├── backend/                     # Node.js Backend (DEPLOYED)
│   └── index.js                # Fastify API with job management
├── scraper/                     # Python Backend + Scraper
│   └── main.py                 # Flask API + integrated scraper
├── requirements.txt             # Python dependencies
├── .python-version             # Python 3.13.5 specification
├── run.sh                      # Startup script
├── .env                        # Environment variables
└── .gitignore                  # Git ignore patterns

```

---

## Tech Stack

### Backend (Node.js)

| Technology | Version | Purpose |
| --- | --- | --- |
| **Node.js** | 18+ | JavaScript runtime |
| **Fastify** | 4.x | Web framework and API server |
| **@fastify/cors** | 8.x | Cross-origin resource sharing |
| **pg** | 8.x | PostgreSQL driver |
| **zod** | 3.x | Schema validation |
| **nanoid** | 5.x | Unique ID generation |

### Backend (Python)

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

### Frontend

| Technology | Version | Purpose |
| --- | --- | --- |
| **Next.js** | 15.x | React framework |
| **React** | 19.x | UI library |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Framer Motion** | 12.x | Animations |
| **Axios** | 1.x | HTTP client |
| **date-fns** | 4.x | Date formatting |

---

## Setup and Installation

### Prerequisites

* Python 3.13+
* Node.js 18+
* PostgreSQL (or a Neon account)
* Git

### 1. Clone the Repository

```bash
git clone https://github.com/MrMan003/news--pulse.git
cd news--pulse

```

### 2. Backend (Node.js) Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create .env file
echo "DATABASE_URL=postgresql://username:password@host/database?sslmode=require" > .env

```

### 3. Backend (Python) Setup

```bash
# Navigate to the scraper directory
cd scraper

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

```

### 4. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Configure local environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:10000" > .env.local

```

### 5. Run Locally

**Terminal 1 (Node.js Backend):**

```bash
cd backend
node index.js

```

**Terminal 2 (Python Scraper):**

```bash
cd scraper
python3 main.py

```

**Terminal 3 (Frontend):**

```bash
cd frontend
npm run dev

```

Open `http://localhost:3000` in your browser to view the application.

---

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



---

## News Sources

| Source | Feed URL |
| --- | --- |
| **BBC News** | [http://feeds.bbci.co.uk/news/rss.xml](http://feeds.bbci.co.uk/news/rss.xml) |
| **BBC World** | [http://feeds.bbci.co.uk/news/world/rss.xml](http://feeds.bbci.co.uk/news/world/rss.xml) |
| **Al Jazeera** | [https://www.aljazeera.com/xml/rss/all.xml](https://www.aljazeera.com/xml/rss/all.xml) |
| **Sky News** | [https://feeds.skynews.com/feeds/rss/world.xml](https://feeds.skynews.com/feeds/rss/world.xml) |
| **CNN** | [http://rss.cnn.com/rss/cnn_topstories.rss](http://rss.cnn.com/rss/cnn_topstories.rss) |
| **Fox News** | [http://feeds.foxnews.com/foxnews/politics](http://feeds.foxnews.com/foxnews/politics) |
| **NBC News** | [https://feeds.nbcnews.com/nbcnews/public/news](https://feeds.nbcnews.com/nbcnews/public/news) |

---

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

---

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
Access to fetch at 'https://news-pulse-2xcf.onrender.com/clusters' from origin 'https://news-pulse-tvh9.vercel.app' has been blocked by CORS policy

```

**Solution:** Ensure CORS is configured correctly in both backends and the Vercel domain is in the allowed origins list.

**4. Render Free Tier Sleep**

```text
Your free instance will spin down with inactivity...

```

**Solution:** Set up cron-job.org to ping `/health` every 5 minutes.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

---

## Contact

Built by **Mitul Pabri**

* **GitHub:** [MrMan003](https://github.com/MrMan003)
* **Project Repository:** [https://github.com/MrMan003/news--pulse](https://github.com/MrMan003/news--pulse)
* **Live Demo:** [https://news-pulse-tvh9.vercel.app](https://news-pulse-tvh9.vercel.app)

---

## Acknowledgments

* **Render** for providing free backend hosting
* **Vercel** for providing free frontend hosting
* **Neon** for providing free PostgreSQL hosting
* All open-source libraries used in this project

---
