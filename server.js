const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const DATA_DIR = path.join(__dirname, 'server-data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, '{}', 'utf8');

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
};

const writeState = (state) => {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, updatedAt: Date.now() }, null, 2), 'utf8');
};

const server = http.createServer((req, res) => {
  const isStateRoute = req.url === '/api/state';
  if (!isStateRoute) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (req.method === 'GET') {
    const state = readState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        writeState(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(PORT, () => {
  console.log(`Hospital state API running on http://localhost:${PORT}`);
});
