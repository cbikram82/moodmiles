import http from 'node:http';
import handler from './dist/server/index.js';

const port = process.env.PORT || 8080;

const server = http.createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '', `${protocol}://${host}`);
    
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
