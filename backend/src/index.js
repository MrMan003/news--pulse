const Fastify = require('fastify');
const { z } = require('zod');
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

// Validate environment
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  SCRAPER_PATH: z.string().default('../scraper'),
  CORS_ORIGIN: z.string().default('*'),
  PYTHON_PATH: z.string().default('python3'),
  NODE_ENV: z.string().default('development'),
});

const env = envSchema.parse(process.env);

// Setup Fastify
const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
    } : undefined
  }
});

// Database connection - with better timeout handling
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 5 second timeout
  ssl: {
    rejectUnauthorized: false // For Neon SSL
  }
});

// Test database connection - non-blocking
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

// Job tracking with cleanup
const jobs = new Map();

// Clean up old jobs every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, job] of jobs) {
    if (job.completed_at && (now - new Date(job.completed_at).getTime() > 3600000)) {
      jobs.delete(key);
    }
  }
}, 3600000);

// CORS
app.register(require('@fastify/cors'), {
  origin: env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
});

// Helper: Run scraper with timeout
function runScraper(jobId) {
  return new Promise((resolve, reject) => {
    const scraperPath = path.join(__dirname, '..', env.SCRAPER_PATH, 'main.py');
    const pythonPath = env.PYTHON_PATH || 'python3';
    
    console.log(`🐍 Running scraper with: ${pythonPath}`);
    console.log(`📁 Scraper path: ${scraperPath}`);
    console.log(`🔑 Job ID: ${jobId}`);
    
    const python = spawn(pythonPath, [scraperPath, jobId], {
      timeout: 300000,
      env: process.env
    });
    
    let output = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      console.log('📤 Scraper output:', str.trim());
    });
    
    python.stderr.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      console.error('❌ Scraper error:', str.trim());
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Scraper completed successfully');
        try {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          if (lastLine && lastLine.startsWith('Success:')) {
            const result = JSON.parse(lastLine.replace('Success: ', ''));
            resolve({ 
              job_id: jobId, 
              status: 'completed',
              ...result,
              message: 'Scrape completed successfully'
            });
          } else {
            resolve({ 
              job_id: jobId, 
              status: 'completed',
              message: 'Scrape completed successfully'
            });
          }
        } catch (e) {
          resolve({ 
            job_id: jobId, 
            status: 'completed',
            message: 'Scrape completed successfully'
          });
        }
      } else {
        console.error(`❌ Scraper failed with code: ${code}`);
        reject(new Error(`Scraper exited with code ${code}: ${errorOutput || 'Unknown error'}`));
      }
    });
    
    python.on('error', (err) => {
      console.error('❌ Failed to start scraper:', err);
      reject(new Error(`Failed to start scraper: ${err.message}`));
    });
  });
}

// ============ ROUTES ============

// Health check
app.get('/health', async (request, reply) => {
  try {
    // Test database connection
    const client = await pool.connect();
    client.release();
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      python: env.PYTHON_PATH,
      environment: env.NODE_ENV
    };
  } catch (err) {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message,
      python: env.PYTHON_PATH,
      environment: env.NODE_ENV
    };
  }
});

// ============ IMAGE PROXY ROUTE ============
app.get('/proxy-image', async (request, reply) => {
  try {
    const { url } = request.query;
    if (!url) {
      return reply.status(400).send({ error: 'Missing url parameter' });
    }

    try {
      new URL(url);
    } catch {
      return reply.status(400).send({ error: 'Invalid URL' });
    }

    const response = await fetch(url, {
      headers: {
        'Referer': new URL(url).origin,
        'User-Agent': 'Mozilla/5.0 (compatible; NewsPulseBot/1.0)',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return reply.status(response.status).send({ error: 'Failed to fetch image' });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.send(Buffer.from(buffer));
  } catch (err) {
    app.log.error('Image proxy error:', err);
    return reply.status(500).send({ error: 'Failed to proxy image' });
  }
});

// GET /clusters
app.get('/clusters', async (request, reply) => {
  try {
    const { source, limit = 50 } = request.query;
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          c.id, 
          c.label, 
          c.article_count, 
          c.start_time, 
          c.end_time,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'id', a.id,
              'title', a.title,
              'source', a.source,
              'published_at', a.published_at,
              'url', a.url,
              'image_url', a.image_url,
              'summary', a.summary
            ) ORDER BY a.published_at DESC), '[]'::json)
            FROM articles a
            WHERE a.cluster_id = c.id
            ${source ? 'AND a.source = $2' : ''}
          ) as articles
        FROM clusters c
        WHERE c.article_count > 0
        ORDER BY c.start_time DESC
        LIMIT $1
      `;
      
      const params = [parseInt(limit)];
      if (source) params.push(source);
      
      const result = await client.query(query, params);
      const stats = await client.query('SELECT source, COUNT(*) as count FROM articles GROUP BY source');
      
      return reply.send({
        success: true,
        clusters: result.rows,
        sources: stats.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ 
      success: false,
      error: 'Failed to fetch clusters: ' + err.message
    });
  }
});

// GET /clusters/:id
app.get('/clusters/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          c.id, 
          c.label, 
          c.article_count, 
          c.start_time, 
          c.end_time,
          COALESCE(json_agg(json_build_object(
            'id', a.id,
            'title', a.title,
            'body', a.body,
            'summary', a.summary,
            'source', a.source,
            'published_at', a.published_at,
            'url', a.url,
            'image_url', a.image_url
          ) ORDER BY a.published_at DESC), '[]'::json) as articles
        FROM clusters c
        LEFT JOIN articles a ON a.cluster_id = c.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ 
          success: false,
          error: 'Cluster not found' 
        });
      }
      
      return reply.send({
        success: true,
        cluster: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ 
      success: false,
      error: 'Failed to fetch cluster: ' + err.message
    });
  }
});

// GET /timeline
app.get('/timeline', async (request, reply) => {
  try {
    const { source, limit = 100 } = request.query;
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          c.id,
          c.label,
          c.start_time as start,
          c.end_time as "end",
          c.article_count as count,
          LEAST(c.article_count / 10.0, 1.0) as intensity,
          (
            SELECT a.image_url 
            FROM articles a 
            WHERE a.cluster_id = c.id AND a.image_url IS NOT NULL 
            LIMIT 1
          ) as image_url
        FROM clusters c
        WHERE c.article_count > 0
        ${source ? 'AND EXISTS (SELECT 1 FROM articles a WHERE a.cluster_id = c.id AND a.source = $2)' : ''}
        ORDER BY c.start_time DESC
        LIMIT $1
      `;
      
      const params = [parseInt(limit)];
      if (source) params.push(source);
      
      const result = await client.query(query, params);
      
      return reply.send({
        success: true,
        timeline: result.rows,
        metadata: {
          total: result.rows.length,
          generated_at: new Date().toISOString()
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ 
      success: false,
      error: 'Failed to fetch timeline: ' + err.message
    });
  }
});

// POST /ingest/trigger
app.post('/ingest/trigger', async (request, reply) => {
  try {
    const jobId = nanoid();
    
    jobs.set(jobId, {
      id: jobId,
      status: 'running',
      started_at: new Date().toISOString()
    });
    
    runScraper(jobId)
      .then(result => {
        jobs.set(jobId, {
          ...jobs.get(jobId),
          ...result,
          completed_at: new Date().toISOString()
        });
        app.log.info(`✅ Job ${jobId} completed successfully`);
      })
      .catch(err => {
        app.log.error(`❌ Job ${jobId} failed: ${err.message}`);
        jobs.set(jobId, {
          ...jobs.get(jobId),
          status: 'failed',
          error: err.message,
          completed_at: new Date().toISOString()
        });
      });
    
    return reply.send({
      success: true,
      job_id: jobId,
      status: 'running',
      message: 'Scrape job triggered successfully'
    });
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ 
      success: false,
      error: 'Failed to trigger scrape: ' + err.message
    });
  }
});

// GET /ingest/status/:jobId
app.get('/ingest/status/:jobId', async (request, reply) => {
  try {
    const { jobId } = request.params;
    const job = jobs.get(jobId);
    
    if (!job) {
      return reply.status(404).send({ 
        success: false,
        error: 'Job not found' 
      });
    }
    
    return reply.send({
      success: true,
      ...job
    });
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ 
      success: false,
      error: 'Failed to fetch job status: ' + err.message
    });
  }
});

// Root route
app.get('/', async () => {
  return { 
    name: 'News Pulse API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      clusters: '/clusters',
      timeline: '/timeline',
      ingest: '/ingest/trigger',
      status: '/ingest/status/:jobId',
      proxy: '/proxy-image?url=...'
    }
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 Server running on port ${env.PORT}`);
    app.log.info(`📊 Database: Connected`);
    app.log.info(`🐍 Python: ${env.PYTHON_PATH}`);
    app.log.info(`🖼️  Image proxy: enabled`);
    app.log.info(`🌍 Environment: ${env.NODE_ENV}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();