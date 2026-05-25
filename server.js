import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from './dist/server/index.js';

const port = process.env.PORT || 8080;

const server = http.createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '', `${protocol}://${host}`);
    const pathname = url.pathname;

    // 1. Check and serve static files directly from dist/client (Vite build assets)
    const filePath = path.join(process.cwd(), 'dist/client', pathname);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = {
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
      }[ext] || 'application/octet-stream';

      const stat = fs.statSync(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      
      // Highly optimized cache control for immutable hashed assets
      if (pathname.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      return;
    }
    
    // 2. Delegate dynamic requests to TanStack Start SSR Handler
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }
    
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }
    
    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
      duplex: 'half'
    });
    
    const response = await handler.fetch(request, {}, {});
    
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });
    
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('Server error handling request:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`MoodMiles Server is listening on port ${port}`);
});
