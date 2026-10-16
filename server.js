// Football Guessing – Spielserver + Website (keine Abhängigkeiten, Node >= 18)
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
// Website liegt in ./public – falls der Ordner beim Hochladen verloren ging, wird auch der Hauptordner akzeptiert
const PUB = fs.existsSync(path.join(__dirname, 'public', 'index.html')) ? path.join(__dirname, 'public') : __dirname;
const HIDDEN = new Set(['server.js', 'package.json', 'package-lock.json', 'render.yaml', 'data.json', '.gitignore', 'README.md']);
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const MAX_AGE = 12 * 3600 * 1000;           // Räume nach 12 h löschen
const docs = new Map(), watchers = new Set();
const PATH_RE = /^rooms\/[A-Z]{4}$/;
let saveT = null;
try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')))) docs.set(k, v); } catch (e) {}
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(Object.fromEntries(docs)), () => {}), 1500); };
const BAD = new Set(['__proto__', 'constructor', 'prototype']);
function merge(t, s) {
  for (const k of Object.keys(s)) {
    if (BAD.has(k)) continue;
    const v = s[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], v);
    else t[k] = v;
  }
  return t;
}
const sse = (res, o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
function sendQ(w) {
  const out = [];
  for (const [p, d] of docs) { if (p.startsWith(w.c + '/') && d.data[w.f] == w.v) { out.push({ id: p.split('/')[1], data: d.data }); if (out.length >= w.limit) break; } }
  sse(w.res, { docs: out });
}
function notify(p) {
  for (const w of watchers) {
    if (w.type === 'doc' && w.path === p) sse(w.res, { exists: true, data: docs.get(p).data });
    else if (w.type === 'q' && p.startsWith(w.c + '/')) sendQ(w);
  }
}
const hits = new Map();
setInterval(() => hits.clear(), 10000);
setInterval(() => { const now = Date.now(); for (const [p, d] of docs) if (now - d.ts > MAX_AGE) docs.delete(p); save(); }, 600000).unref();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.png': 'image/png', '.ico': 'image/x-icon' };
const json = (res, code, o) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  if (u.pathname === '/api/ping') return json(res, 200, { ok: true });
  if (u.pathname === '/api/doc' && req.method === 'POST') {
    const ip = req.socket.remoteAddress, n = (hits.get(ip) || 0) + 1; hits.set(ip, n);
    if (n > 200) return json(res, 429, { error: 'Zu viele Anfragen', code: 'resource_exhausted' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 100000) req.destroy(); });
    req.on('end', () => {
      let m; try { m = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'JSON', code: 'invalid_argument' }); }
      if (!PATH_RE.test(m.path || '')) return json(res, 400, { error: 'Pfad', code: 'invalid_argument' });
      const cur = docs.get(m.path);
      if (m.op === 'get') return json(res, 200, cur ? { exists: true, data: cur.data } : { exists: false });
      if (!m.data || typeof m.data !== 'object') return json(res, 400, { error: 'Daten', code: 'invalid_argument' });
      const clean = JSON.parse(JSON.stringify(m.data));
      if (m.op === 'set') docs.set(m.path, { data: clean, ts: Date.now() });
      else if (m.op === 'update') { if (!cur) return json(res, 404, { error: 'Raum nicht gefunden', code: 'invalid_argument' }); merge(cur.data, clean); cur.ts = Date.now(); }
      else return json(res, 400, { error: 'op', code: 'invalid_argument' });
      notify(m.path); save(); json(res, 200, { ok: true });
    });
    return;
  }
  if (u.pathname === '/api/watch' || u.pathname === '/api/query') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no', 'access-control-allow-origin': '*' });
    let w;
    if (u.pathname === '/api/watch') {
      const p = u.searchParams.get('path') || '';
      if (!PATH_RE.test(p)) return res.end();
      w = { type: 'doc', path: p, res }; const cur = docs.get(p); sse(res, cur ? { exists: true, data: cur.data } : { exists: false });
    } else {
      w = { type: 'q', c: 'rooms', f: 'phase', v: u.searchParams.get('v') || 'lobby', limit: Math.min(+u.searchParams.get('limit') || 20, 50), res }; sendQ(w);
    }
    watchers.add(w);
    const ka = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ka); watchers.delete(w); });
    return;
  }
  let f = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (f === '/' || f === '\\' || f === '.') f = '/index.html';
  const file = path.join(PUB, f);
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  if (HIDDEN.has(path.basename(file))) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Nicht gefunden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=86400' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Football Guessing läuft auf http://localhost:' + PORT));
