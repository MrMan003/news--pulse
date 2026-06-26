'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Color System ──────────────────────────────────────────────────────────────
const getIntensityColor = (intensity) => {
  if (intensity > 0.7) return { bg: '#c0392b', glow: 'rgba(192,57,43,0.2)', label: 'Hot', dot: 'bg-[#c0392b]' };
  if (intensity > 0.4) return { bg: '#d4a054', glow: 'rgba(212,160,84,0.2)', label: 'Trending', dot: 'bg-[#d4a054]' };
  return { bg: '#8a7a6a', glow: 'rgba(138,122,106,0.2)', label: 'Active', dot: 'bg-[#8a7a6a]' };
};

const safeParseDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : new Date();
  } catch {
    return new Date();
  }
};

// ─── Seed color for fallback ───────────────────────────────────────────────────
const seedColor = (label) => {
  if (!label) return '#1a1410';
  const hue = (label.charCodeAt(0) * 137) % 360;
  return `hsl(${hue}, 25%, 12%)`;
};

// ─── Image Component ───────────────────────────────────────────────────────────
function NewsImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  
  if (!src || error) {
    return (
      <div className={`${className} bg-gradient-to-br from-[#1a1410] to-[#0c0a09] flex items-center justify-center`}>
        <svg className="w-8 h-8 text-white/5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h8v2H8V9zm0 4h5v2H8v-2z" />
        </svg>
      </div>
    );
  }
  
  const imageUrl = src.startsWith('http') 
    ? `${API_URL}/proxy-image?url=${encodeURIComponent(src)}` 
    : src;
  
  return (
    <img
      src={imageUrl}
      alt={alt || 'News'}
      className={`${className} object-cover`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

// ─── Graphic Panel ─────────────────────────────────────────────────────────────
function GraphicPanel({ label, intensity, className }) {
  const color = getIntensityColor(intensity || 0.3);
  const bgColor = seedColor(label);
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${bgColor}, #0c0a09)` }}
    >
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full opacity-20 pulse-ring"
          style={{ background: color.glow }}
        />
        <span className="absolute text-3xl font-serif font-bold text-white/10">
          {label?.[0]?.toUpperCase() || 'N'}
        </span>
      </div>
      <div className="absolute bottom-2 right-3">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slideshow Carousel ────────────────────────────────────────────────────────
function Slideshow({ items, onItemClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
  };

  if (items.length === 0) return null;

  const current = items[currentIndex];

  return (
    <div
      className="relative rounded-2xl overflow-hidden glass-panel-elevated h-[400px] cursor-pointer"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Featured news carousel"
      onClick={() => onItemClick(current)}
    >
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full h-full"
      >
        {current.image_url ? (
          <NewsImage src={current.image_url} alt={current.label} className="w-full h-full" />
        ) : (
          <GraphicPanel label={current.label} intensity={current.intensity} className="w-full h-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09]/30 to-transparent" />
        
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#c0392b]/90 text-white rounded text-[9px] font-bold uppercase tracking-wider">
            LIVE
          </span>
          <span className="text-[10px] text-white/60 font-mono">
            {current.count} articles
          </span>
          <span className="text-white/40 text-[10px]">•</span>
          <span className="text-[10px] text-white/60 font-mono">
            {formatDistanceToNow(current.end instanceof Date ? current.end : safeParseDate(current.end), { addSuffix: true })}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white/95 glow-text leading-tight">
            {current.label}
          </h2>
          <p className="text-sm text-white/50 mt-2 line-clamp-2 max-w-2xl">
            {current.articles?.[0]?.summary || `${current.count} articles from multiple sources`}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {current.articles?.slice(0, 4).map((a, i) => (
              <span key={i} className={`text-[8px] px-2 py-0.5 rounded border ${getSourceBadge(a.source)}`}>
                {a.source?.split(' ').slice(0, 2).join(' ') || 'Unknown'}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-20 right-6 flex gap-1.5" role="tablist">
        {items.slice(0, 6).map((_, idx) => (
          <button
            key={idx}
            role="tab"
            aria-label={`Go to slide ${idx + 1}`}
            aria-selected={idx === currentIndex}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
            className={`transition-all rounded-full ${
              idx === currentIndex 
                ? 'w-8 h-1.5 bg-[#d4a054]' 
                : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + items.length) % items.length); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/60 hover:text-white transition-all"
        aria-label="Previous slide"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % items.length); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/60 hover:text-white transition-all"
        aria-label="Next slide"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-white/5 rounded-xl animate-pulse ${className}`} />;
}

// ─── Source Badge Helper ──────────────────────────────────────────────────────
const getSourceBadge = (source) => {
  const colors = {
    'BBC News': 'bg-[#c0392b]/20 text-[#c0392b] border-[#c0392b]/20',
    'BBC World': 'bg-[#c0392b]/20 text-[#c0392b] border-[#c0392b]/20',
    'Al Jazeera': 'bg-[#d4a054]/20 text-[#d4a054] border-[#d4a054]/20',
    'Sky News': 'bg-[#c0392b]/20 text-[#c0392b] border-[#c0392b]/20',
    'CNN': 'bg-[#8a7a6a]/20 text-[#8a7a6a] border-[#8a7a6a]/20',
    'Fox News': 'bg-[#c0392b]/20 text-[#c0392b] border-[#c0392b]/20',
    'NBC News': 'bg-[#2d6a4f]/20 text-[#2d6a4f] border-[#2d6a4f]/20',
  };
  return colors[source] || 'bg-white/10 text-white/30 border-white/10';
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [timeline, setTimeline] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Home');
  
  const pollRef = useRef(null);

  const MENU_ITEMS = ['Home', 'Topics', 'Live Feed', 'Analytics'];

  // ─── Build Data ──────────────────────────────────────────────────────────────
  const buildTimeline = (data) => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .filter(c => c && c.start_time && c.end_time)
      .map((c) => {
        const start = safeParseDate(c.start_time);
        const end = safeParseDate(c.end_time);
        return {
          id: c.id || `cluster-${Math.random()}`,
          label: c.label || 'Untitled',
          fullLabel: c.label || 'Untitled',
          start: start || new Date(),
          end: end || new Date(),
          count: c.article_count || 0,
          intensity: Math.min((c.article_count || 0) / 10, 1),
          articles: c.articles || [],
          image_url: c.articles?.[0]?.image_url || null,
          source: c.articles?.[0]?.source || 'Unknown',
        };
      });
  };

  // ─── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/clusters`);
      if (res.data && res.data.success) {
        const data = res.data.clusters || [];
        setClusters(data);
        const filteredSources = (res.data.sources || []).filter(s => s.source !== 'NPR');
        setSources(filteredSources);
        setTimeline(buildTimeline(data));
      } else {
        setTimeline([]);
        setSources([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Cannot connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Refresh ────────────────────────────────────────────────────────────────
  const triggerRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await axios.post(`${API_URL}/ingest/trigger`);
      if (res.data && res.data.success) {
        const jobId = res.data.job_id;
        pollRef.current = setInterval(async () => {
          try {
            const status = await axios.get(`${API_URL}/ingest/status/${jobId}`);
            if (status.data && status.data.status === 'completed') {
              clearInterval(pollRef.current);
              pollRef.current = null;
              await fetchData();
              setRefreshing(false);
              setJobStatus('completed');
              setTimeout(() => setJobStatus(null), 3000);
            } else if (status.data && status.data.status === 'failed') {
              clearInterval(pollRef.current);
              pollRef.current = null;
              setRefreshing(false);
              setError('Scrape failed.');
            }
          } catch (err) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setRefreshing(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh.');
      setRefreshing(false);
    }
  }, [fetchData]);

  // ─── Cleanup poll ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Data Processing ────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!timeline || !Array.isArray(timeline)) return [];
    return [...timeline].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [timeline]);

  // ─── FILTER BY SELECTED SOURCE ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!timeline || !Array.isArray(timeline)) return [];
    if (!selectedSource) return timeline;
    return timeline.filter((item) => {
      return item.articles?.some((a) => a.source === selectedSource);
    });
  }, [timeline, selectedSource]);

  const filteredSorted = useMemo(() => {
    if (!filtered || !Array.isArray(filtered)) return [];
    return [...filtered].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [filtered]);

  const displayData = filteredSorted.length > 0 ? filteredSorted : sorted;

  const totalArticles = useMemo(() => {
    if (!clusters || !Array.isArray(clusters)) return 0;
    return clusters.reduce((acc, c) => acc + (c.article_count || 0), 0);
  }, [clusters]);

  // ─── Layout Data ────────────────────────────────────────────────────────────
  const slideshowItems = displayData
    .filter(item => item.image_url)
    .slice(0, Math.min(6, displayData.length));

  // ─── Handle Cluster Click ──────────────────────────────────────────────────
  const handleClusterClick = (item) => {
    if (!item) return;
    const full = clusters.find((c) => c.id === item.id);
    if (full) {
      setSelectedCluster({
        ...full,
        start: safeParseDate(full.start_time),
        end: safeParseDate(full.end_time),
        intensity: Math.min((full.article_count || 0) / 10, 1),
        image_url: full.articles?.[0]?.image_url || null,
        source: full.articles?.[0]?.source || 'Unknown',
      });
    } else {
      setSelectedCluster(item);
    }
  };

  const handleSourceToggle = (source) => {
    setSelectedSource(selectedSource === source ? null : source);
  };

  // Get all sources from clusters (sorted alphabetically)
  const sourceList = useMemo(() => {
    const sourceSet = new Set();
    clusters.forEach(c => {
      if (c.articles) {
        c.articles.forEach(a => {
          if (a.source) sourceSet.add(a.source);
        });
      }
    });
    return Array.from(sourceSet).sort();
  }, [clusters]);

  // ─── Get all articles for the dot timeline ──────────────────────────────
  const getArticlesForDotTimeline = useMemo(() => {
    if (!selectedSource) return [];
    const allArticles = [];
    displayData.forEach(cluster => {
      if (cluster.articles) {
        cluster.articles.forEach(article => {
          if (article.image_url && article.source === selectedSource) {
            allArticles.push({
              ...article,
              cluster_id: cluster.id,
              cluster_label: cluster.label,
              intensity: cluster.intensity,
            });
          }
        });
      }
    });
    return allArticles;
  }, [displayData, selectedSource]);

  // ─── Render Content ──────────────────────────────────────────────────────────
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-[400px] rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      );
    }

    if (displayData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-48 text-[#8a7a6a]/40">
          <div className="text-6xl mb-4 opacity-20">📡</div>
          <p className="text-lg font-medium">No news clusters available</p>
          <p className="text-sm text-[#8a7a6a]/30 mt-1">Run the scraper to fetch articles</p>
          <button
            onClick={triggerRefresh}
            className="mt-6 px-6 py-2.5 bg-[#d4a054]/10 hover:bg-[#d4a054]/20 text-[#d4a054] rounded-xl border border-[#d4a054]/20 text-sm transition-all"
          >
            Fetch News
          </button>
        </div>
      );
    }

    // ─── HOME VIEW ───
    if (activeMenu === 'Home') {
      return (
        <div className="space-y-6">
          {slideshowItems.length > 0 && (
            <Slideshow items={slideshowItems} onItemClick={handleClusterClick} />
          )}

          {selectedSource ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass-panel rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-serif font-semibold text-[#e8e0d8]/80">
                    {selectedSource.split(' ').slice(0, 2).join(' ')} Timeline
                  </h3>
                  <span className="text-[10px] text-[#8a7a6a] font-mono">
                    {getArticlesForDotTimeline.length} articles
                  </span>
                </div>
                <div className="relative max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
                  <div className="space-y-4 pl-8">
                    {getArticlesForDotTimeline.slice(0, 30).map((article, idx) => {
                      const color = getIntensityColor(article.intensity || 0.3);
                      const pubDate = safeParseDate(article.published_at);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                          onClick={() => {
                            const cluster = { 
                              id: article.cluster_id, 
                              label: article.cluster_label || article.title,
                              articles: [article]
                            };
                            handleClusterClick(cluster);
                          }}
                          className="group cursor-pointer relative pl-4"
                        >
                          <div className={`absolute left-[-12px] top-1.5 w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg ${color.dot}`} />
                          <div className="glass-panel rounded-lg p-3 hover:bg-white/5 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#1a1410]">
                                <NewsImage src={article.image_url} alt={article.title} className="w-full h-full" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#e8e0d8]/80 group-hover:text-[#d4a054] transition-colors leading-snug font-medium line-clamp-2">
                                  {article.title || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-[#8a7a6a] flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${getSourceBadge(article.source)}`}>
                                    {article.source?.split(' ').slice(0, 2).join(' ') || 'Unknown'}
                                  </span>
                                  <span className="text-[#8a7a6a]/30">•</span>
                                  <span className="text-[10px] font-mono">
                                    {isValid(pubDate) ? format(pubDate, 'MMM d, HH:mm') : 'Unknown'}
                                  </span>
                                  {article.cluster_label && (
                                    <>
                                      <span className="text-[#8a7a6a]/30">•</span>
                                      <span className="text-[9px] text-[#8a7a6a]/50">
                                        #{article.cluster_label.slice(0, 15)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="glass-panel rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-serif font-semibold text-[#e8e0d8]/80">
                    {selectedSource.split(' ').slice(0, 2).join(' ')} Articles
                  </h3>
                  <span className="text-[10px] text-[#8a7a6a] font-mono">
                    {getArticlesForDotTimeline.length} articles
                  </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scroll">
                  {getArticlesForDotTimeline.slice(0, 20).map((article, idx) => {
                    const pubDate = safeParseDate(article.published_at);
                    return (
                      <motion.a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                        className="block glass-panel rounded-lg p-3 hover:bg-white/5 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#1a1410]">
                            <NewsImage src={article.image_url} alt={article.title} className="w-full h-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#e8e0d8]/80 group-hover:text-[#d4a054] transition-colors leading-snug font-medium line-clamp-2">
                              {article.title || 'Untitled'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#8a7a6a] flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${getSourceBadge(article.source)}`}>
                                {article.source?.split(' ').slice(0, 2).join(' ') || 'Unknown'}
                              </span>
                              <span className="text-[#8a7a6a]/30">•</span>
                              <span className="text-[10px] font-mono">
                                {isValid(pubDate) ? format(pubDate, 'MMM d, HH:mm') : 'Unknown'}
                              </span>
                              {article.cluster_label && (
                                <>
                                  <span className="text-[#8a7a6a]/30">•</span>
                                  <span 
                                    className="text-[9px] text-[#8a7a6a]/50 cursor-pointer hover:text-[#d4a054] transition-colors"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const cluster = { id: article.cluster_id, label: article.cluster_label };
                                      handleClusterClick(cluster);
                                    }}
                                  >
                                    #{article.cluster_label.slice(0, 15)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-serif font-semibold text-[#e8e0d8]/80">
                  All News
                </h3>
                <span className="text-[10px] text-[#8a7a6a] font-mono">
                  {clusters.reduce((acc, c) => acc + (c.articles?.filter(a => a.image_url).length || 0), 0)} articles
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
                {clusters.flatMap(c => 
                  (c.articles || []).filter(a => a.image_url).map(article => ({
                    ...article,
                    cluster_id: c.id,
                    cluster_label: c.label,
                    intensity: c.intensity
                  }))
                ).slice(0, 30).map((article, idx) => {
                  const color = getIntensityColor(article.intensity || 0.3);
                  const pubDate = safeParseDate(article.published_at);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                      onClick={() => {
                        const cluster = { 
                          id: article.cluster_id, 
                          label: article.cluster_label || article.title,
                          articles: [article]
                        };
                        handleClusterClick(cluster);
                      }}
                      className="glass-panel rounded-xl overflow-hidden cursor-pointer card-hover group"
                    >
                      <div className="relative h-40">
                        <NewsImage src={article.image_url} alt={article.title} className="w-full h-full" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-transparent to-transparent" />
                        <div className="absolute top-2 right-2">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getSourceBadge(article.source)}`}>
                            {article.source?.split(' ').slice(0, 2).join(' ') || 'Unknown'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <div className={`status-dot ${color.dot}`} />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-[#e8e0d8]/80 group-hover:text-[#d4a054] transition-colors leading-snug font-medium line-clamp-2">
                          {article.title || 'Untitled'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#8a7a6a] font-mono">
                          <span>{isValid(pubDate) ? format(pubDate, 'MMM d, HH:mm') : 'Unknown'}</span>
                          {article.cluster_label && (
                            <>
                              <span>•</span>
                              <span className="text-[8px] text-[#8a7a6a]/50">
                                #{article.cluster_label.slice(0, 12)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Topics', value: displayData.length },
              { label: 'Articles', value: totalArticles },
              { label: 'Sources', value: sourceList.length },
              { label: 'With Images', value: displayData.filter(c => c.image_url).length },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel-glow rounded-xl p-3 text-center">
                <div className="text-xl font-serif font-bold text-[#d4a054]">{stat.value}</div>
                <div className="text-[9px] text-[#8a7a6a] font-mono uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ─── TOPICS VIEW ───
    if (activeMenu === 'Topics') {
      return (
        <div>
          <h2 className="text-xl font-serif font-bold text-[#e8e0d8] mb-4">All Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayData.filter(item => item.image_url).map((item) => {
              const color = getIntensityColor(item.intensity || 0.3);
              const source = item.articles?.[0]?.source || 'Unknown';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleClusterClick(item)}
                  className="glass-panel rounded-xl overflow-hidden cursor-pointer card-hover"
                >
                  <div className="relative h-32">
                    <NewsImage src={item.image_url} alt={item.label} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                      <span className="text-xs font-serif font-semibold text-white/80 line-clamp-1">
                        {item.label}
                      </span>
                      <div className={`status-dot ${color.dot} flex-shrink-0`} />
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-semibold uppercase ${color.label === 'Hot' ? 'text-[#c0392b]' : color.label === 'Trending' ? 'text-[#d4a054]' : 'text-[#8a7a6a]'}`}>
                        {color.label}
                      </span>
                      <span className="text-[9px] text-[#8a7a6a]">•</span>
                      <span className="text-[9px] text-[#8a7a6a] font-mono">
                        {formatDistanceToNow(item.end, { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#8a7a6a] font-mono">
                      {item.count} articles
                    </span>
                  </div>
                  <div className="px-3 pb-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border ${getSourceBadge(source)}`}>
                      {source.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    // ─── LIVE FEED ───
    if (activeMenu === 'Live Feed') {
      return (
        <div>
          <h2 className="text-xl font-serif font-bold text-[#e8e0d8] mb-4">Live Feed</h2>
          <div className="space-y-2">
            {displayData.filter(item => item.image_url).map((item, idx) => {
              const color = getIntensityColor(item.intensity || 0.3);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleClusterClick(item)}
                  className="glass-panel rounded-xl p-3 cursor-pointer card-hover flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                    <NewsImage src={item.image_url} alt={item.label} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#c0392b] font-mono font-bold uppercase">LIVE</span>
                      <span className="text-[10px] text-[#8a7a6a] font-mono">
                        {formatDistanceToNow(item.end, { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-serif font-medium text-[#e8e0d8]/80">{item.label}</h3>
                    <p className="text-xs text-[#8a7a6a] font-mono">{item.count} articles</p>
                  </div>
                  <span className="text-[10px] text-[#8a7a6a]/30 font-mono">{idx + 1}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    // ─── ANALYTICS ───
    if (activeMenu === 'Analytics') {
      return (
        <div>
          <h2 className="text-xl font-serif font-bold text-[#e8e0d8] mb-4">Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Topics', value: displayData.length },
              { label: 'Total Articles', value: totalArticles },
              { label: 'Sources', value: sourceList.length },
              { label: 'With Images', value: displayData.filter(c => c.image_url).length },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl p-4 text-center">
                <div className="text-2xl font-serif font-bold text-[#d4a054]">{stat.value}</div>
                <div className="text-[10px] text-[#8a7a6a] font-mono uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-serif font-semibold text-[#e8e0d8]/80 mb-3">Source Distribution</h3>
            <div className="space-y-2">
              {sourceList.map((source) => {
                const count = clusters.filter(c => 
                  c.articles?.some(a => a.source === source)
                ).length;
                const percent = displayData.length > 0 ? Math.round((count / displayData.length) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-xs text-[#8a7a6a] w-24 truncate">{source.split(' ')[0]}</span>
                    <div className="flex-1 h-1.5 bg-[#1a1410] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[#d4a054]/60 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8a7a6a] font-mono w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#e8e0d8] font-inter">

      {/* ─── TOP NAVIGATION ─── */}
      <nav className="sticky top-0 z-50 bg-[#0c0a09]/90 backdrop-blur-xl border-b border-[#e8e0d8]/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#d4a054] blur-2xl opacity-10 animate-pulse" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a054]/20 to-[#8a7a6a]/20 border border-[#d4a054]/20 flex items-center justify-center">
                <span className="text-lg font-serif font-bold text-[#d4a054] glow-text tracking-wider">NP</span>
              </div>
            </div>
            <span className="text-xl font-serif font-semibold tracking-tight">
              <span className="text-[#e8e0d8]">News</span>
              <span className="text-[#8a7a6a]">Pulse</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => setActiveMenu(item)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMenu === item
                    ? 'text-[#e8e0d8] bg-white/5 border border-[#d4a054]/20'
                    : 'text-[#8a7a6a] hover:text-[#e8e0d8]/60 hover:bg-white/5'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#8a7a6a] font-mono">
              <span className="live-dot" />
              <span>LIVE</span>
              <span className="mx-1 text-[#8a7a6a]/30">|</span>
              <span>{sourceList.length} sources</span>
            </div>
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium transition-all hover:bg-white/5 hover:border-[#d4a054]/20"
            >
              {refreshing ? (
                <>
                  <svg className="w-3.5 h-3.5 text-[#d4a054] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[#8a7a6a]">Syncing</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-[#d4a054]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[#8a7a6a]">Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── BANNERS ─── */}
      <div className="max-w-7xl mx-auto px-6">
        {error && (
          <div className="mt-4 p-3 bg-[#c0392b]/10 border border-[#c0392b]/20 rounded-xl text-[#c0392b] text-sm flex items-center gap-3 fade-up">
            <span className="text-[#c0392b]">⚠</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-[#c0392b]/50 hover:text-[#c0392b]">✕</button>
          </div>
        )}
        {jobStatus === 'completed' && (
          <div className="mt-4 p-3 bg-[#2d6a4f]/10 border border-[#2d6a4f]/20 rounded-xl text-[#2d6a4f] text-sm flex items-center gap-3 fade-up">
            <span className="text-[#2d6a4f]">✓</span>
            <span className="flex-1">Data synchronized</span>
            <button onClick={() => setJobStatus(null)} className="text-[#2d6a4f]/50 hover:text-[#2d6a4f]">✕</button>
          </div>
        )}
      </div>

      {/* ─── SOURCE FILTERS ─── */}
      {sourceList.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSource(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !selectedSource
                  ? 'bg-[#d4a054]/20 text-[#d4a054] border border-[#d4a054]/30'
                  : 'text-[#8a7a6a] hover:text-[#e8e0d8] hover:bg-white/5 border border-transparent'
              }`}
            >
              All Sources
            </button>
            {sourceList.map((source) => (
              <button
                key={source}
                onClick={() => handleSourceToggle(source)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedSource === source
                    ? 'bg-[#d4a054]/20 text-[#d4a054] border border-[#d4a054]/30'
                    : 'text-[#8a7a6a] hover:text-[#e8e0d8] hover:bg-white/5 border border-transparent'
                }`}
              >
                {source.split(' ').slice(0, 2).join(' ')}
                <span className="ml-1 text-[9px] text-[#8a7a6a]/50">
                  {clusters.filter(c => c.articles?.some(a => a.source === source)).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {renderContent()}
      </div>

      {/* ─── DETAIL SLIDE-OUT ─── */}
      <AnimatePresence>
        {selectedCluster && (
          <motion.div
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCluster(null)}
          >
            <div className="flex-1 bg-black/70 backdrop-blur-sm" />

            <motion.div
              className="w-full max-w-md bg-[#0c0a09] border-l border-[#e8e0d8]/5 flex flex-col h-full overflow-hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 p-5 border-b border-[#e8e0d8]/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`status-dot ${getIntensityColor(selectedCluster.intensity || 0.3).dot}`} />
                      <span className="text-xs text-[#8a7a6a] font-mono">
                        {selectedCluster.count || selectedCluster.article_count || 0} articles
                      </span>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-[#e8e0d8]/90 leading-tight glow-text">
                      {selectedCluster.label || 'Untitled'}
                    </h2>
                    <p className="text-xs text-[#8a7a6a] font-mono mt-1">
                      {selectedCluster.start ? format(selectedCluster.start, 'MMM d, HH:mm') : ''}
                      {selectedCluster.end && ` → ${format(selectedCluster.end, 'MMM d, HH:mm')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCluster(null)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8a7a6a]/50 hover:text-[#e8e0d8] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto modal-scroll px-5 py-4 space-y-2">
                {(selectedCluster.articles || []).filter(a => a.image_url).map((a, i) => (
                  <motion.a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl hover:bg-white/5 transition-all group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#1a1410]">
                        <NewsImage src={a.image_url} alt={a.title} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e8e0d8]/80 group-hover:text-[#d4a054] transition-colors leading-snug font-medium line-clamp-2">
                          {a.title || 'Untitled'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${getSourceBadge(a.source)}`}>
                            {a.source || 'Unknown'}
                          </span>
                          <span className="text-[#8a7a6a]/30">•</span>
                          <span className="text-[#8a7a6a] text-[10px] font-mono">
                            {a.published_at ? format(safeParseDate(a.published_at), 'MMM d, HH:mm') : 'Unknown'}
                          </span>
                        </div>
                        {a.summary && (
                          <p className="text-xs text-[#8a7a6a] mt-1 line-clamp-2">{a.summary}</p>
                        )}
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .glass-panel {
          background: rgba(20, 16, 14, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(180, 150, 120, 0.08);
        }
        .glass-panel-elevated {
          background: rgba(20, 16, 14, 0.8);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(180, 150, 120, 0.1);
          box-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
        }
        .glass-panel-glow {
          background: rgba(20, 16, 14, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(180, 150, 120, 0.06);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
        }
        .card-hover {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          background: rgba(30, 24, 20, 0.6);
          border-color: rgba(200, 170, 140, 0.2);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
        }
        .glow-text {
          text-shadow: 0 0 40px rgba(200, 170, 140, 0.06), 0 0 80px rgba(200, 170, 140, 0.03);
        }
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #c0392b;
          border-radius: 50%;
          animation: live-pulse 1.5s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        .mesh-gradient {
          background: radial-gradient(ellipse at 30% 50%, rgba(200, 170, 140, 0.05) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(180, 120, 90, 0.04) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 20%, rgba(160, 130, 110, 0.03) 0%, transparent 40%);
        }
        .mesh-gradient-hero {
          background: radial-gradient(ellipse at 40% 40%, rgba(180, 120, 90, 0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 60% 60%, rgba(200, 170, 140, 0.06) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(160, 130, 110, 0.04) 0%, transparent 40%);
        }
        .pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.2); }
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .modal-scroll::-webkit-scrollbar { width: 4px; }
        .modal-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .modal-scroll::-webkit-scrollbar-thumb { background: rgba(180,150,120,0.2); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(180,150,120,0.2); border-radius: 10px; }
        .font-serif {
          font-family: 'Playfair Display', 'Georgia', serif;
        }
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .font-mono {
          font-family: 'JetBrains Mono', 'Menlo', monospace;
        }
      `}</style>
    </div>
  );
}