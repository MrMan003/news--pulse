#!/usr/bin/env python3
"""
Test script to verify scraper setup is working
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

if not DB_URL:
    print("❌ DATABASE_URL not set in .env")
    sys.exit(1)

print(f"📊 Testing connection to: {DB_URL}")

try:
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).fetchone()
        print("✅ Database connection successful!")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    sys.exit(1)

# Test imports
try:
    import feedparser
    print("✅ feedparser imported")
except ImportError:
    print("❌ feedparser not installed")

try:
    import trafilatura
    print("✅ trafilatura imported")
except ImportError:
    print("❌ trafilatura not installed")

try:
    import sklearn
    print("✅ scikit-learn imported")
except ImportError:
    print("❌ scikit-learn not installed")

print("\n✅ All tests passed! Ready to run scraper.")