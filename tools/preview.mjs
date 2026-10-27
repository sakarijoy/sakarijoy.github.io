import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '_site');
const port = Number(process.env.PORT || 4173);
try { await stat(resolve(root, 'index.html')); } catch { throw new Error('Run npm run build before starting the preview.'); }
const types = { '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.vtt': 'text/vtt; charset=utf-8', '.ogv': 'video/ogg' };
async function send(req, res, file, status = 200) {
  const data = await readFile(file);
  res.writeHead(status, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : data);
}
const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const allowed = /^\/(?:(?:sitemap|feed)\.xml|robots\.txt|[a-zA-Z0-9_-]+\.html|(?:posts|travel|videos)\/[\p{L}\p{N}_-]+\.html|(?:styles|scripts)\/[a-zA-Z0-9._/-]+\.(?:css|js)|images\/[^\\\u0000-\u001f]+\.(?:png|jpg|jpeg|webp|svg|gif|avif|ico)|media\/[^\\\u0000-\u001f]+\.(?:mp4|webm|ogv|vtt))$/iu.test(pathname);
    const target = resolve(root, '.' + pathname);
    if (!allowed || !target.startsWith(root + sep)) { await send(req, res, resolve(root, '404.html'), 404); return; }
    await send(req, res, target);
  } catch {
    try { await send(req, res, resolve(root, '404.html'), 404); }
    catch { res.writeHead(404); res.end('Not found'); }
  }
});
server.on('error', error => { console.error('Preview failed:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
