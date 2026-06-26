#!/bin/bash

# News Pulse Scraper - Quick Run Script

echo "📰 News Pulse Scraper"
echo "====================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Please create .env with:"
    echo "DATABASE_URL=postgresql://username:password@localhost:5432/newspulse"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run the scraper
echo "🚀 Starting scraper..."
echo ""
python main.py --multiple 3
echo ""

# Show results
echo "📊 Database Stats:"
if command -v psql &> /dev/null; then
    psql -d newspulse -c "SELECT COUNT(*) as articles FROM articles;"
    psql -d newspulse -c "SELECT COUNT(*) as clusters FROM clusters;"
    psql -d newspulse -c "SELECT label, article_count FROM clusters ORDER BY article_count DESC LIMIT 5;"
else
    echo "psql not found - check database manually"
fi

echo ""
echo "✅ Done!"