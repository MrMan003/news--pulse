#!/usr/bin/env python3
"""
Test image extraction from article URLs
"""

import requests
import re
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def get_session():
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=0.3)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def extract_image_from_html(url):
    session = get_session()
    try:
        print(f"  Fetching: {url}")
        resp = session.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; NewsPulseBot/1.0)'
        })
        if resp.status_code != 200:
            print(f"  ❌ Status: {resp.status_code}")
            return None
        
        html = resp.text
        print(f"  ✅ Page loaded ({len(html)} bytes)")
        
        # Try Open Graph image
        og_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
        if og_match:
            img = og_match.group(1)
            print(f"  ✅ Open Graph image found")
            return img
        
        # Try Twitter card image
        twitter_match = re.search(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
        if twitter_match:
            img = twitter_match.group(1)
            print(f"  ✅ Twitter image found")
            return img
        
        # Try article:image
        article_match = re.search(r'<meta[^>]+property=["\']article:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
        if article_match:
            img = article_match.group(1)
            print(f"  ✅ Article image found")
            return img
        
        # Try to find images in article content
        content_match = re.search(r'<article[^>]*>.*?</article>', html, re.S | re.I)
        if content_match:
            content_html = content_match.group(0)
            img_matches = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', content_html, re.I)
            for img in img_matches:
                if not any(x in img.lower() for x in ['icon', 'logo', 'avatar', 'pixel', '1x1', 'blank']):
                    print(f"  ✅ Image found in article content")
                    return img
        
        # Fallback: find the largest image
        img_matches = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html, re.I)
        best_img = None
        best_dimension = 0
        
        for img in img_matches:
            if any(x in img.lower() for x in ['icon', 'logo', 'avatar', 'pixel', '1x1', 'blank']):
                continue
            # Try to check size
            if 'width' in img:
                width_match = re.search(r'width=["\'](\d+)["\']', img)
                if width_match:
                    width = int(width_match.group(1))
                    if width > best_dimension:
                        best_dimension = width
                        best_img = img
        
        if best_img:
            print(f"  ✅ Image found with width {best_dimension}")
            return best_img
        
        print(f"  ❌ No image found")
        return None
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def make_absolute_url(image_url, base_url):
    if not image_url:
        return None
    if image_url.startswith('//'):
        return 'https:' + image_url
    if image_url.startswith('/'):
        match = re.match(r'https?://[^/]+', base_url)
        if match:
            return match.group(0) + image_url
    if not image_url.startswith('http'):
        match = re.match(r'https?://[^/]+/[^/]+', base_url)
        if match:
            base_dir = match.group(0).rsplit('/', 1)[0]
            return base_dir + '/' + image_url.lstrip('/')
    return image_url

# Test URLs from BBC, NPR, Guardian, Al Jazeera
test_urls = [
    # BBC
    "https://www.bbc.com/news/articles/c4gyjgreg1ro",
    "https://www.bbc.com/news/world-us-canada-12345678",
    # NPR
    "https://www.npr.org/2026/06/26/123456789/article-name",
    # The Guardian
    "https://www.theguardian.com/world/2026/jun/26/article-name",
    # Al Jazeera
    "https://www.aljazeera.com/news/2026/6/26/article-name",
]

print("=" * 60)
print("🧪 Testing Image Extraction from News Articles")
print("=" * 60)

for url in test_urls:
    print(f"\n📰 Testing: {url}")
    print("-" * 40)
    
    img = extract_image_from_html(url)
    if img:
        full_url = make_absolute_url(img, url)
        print(f"  ✅ Found image: {full_url}")
        
        # Try to fetch the image to verify it works
        try:
            session = get_session()
            head = session.head(full_url, timeout=5)
            if head.status_code == 200:
                content_type = head.headers.get('content-type', 'unknown')
                content_length = head.headers.get('content-length', 'unknown')
                print(f"  ✅ Image is accessible ({content_type}, {content_length} bytes)")
            else:
                print(f"  ⚠️  Image returned status: {head.status_code}")
        except Exception as e:
            print(f"  ❌ Could not verify image: {e}")
    else:
        print("  ❌ No image found")

print("\n" + "=" * 60)
print("✅ Test complete!")