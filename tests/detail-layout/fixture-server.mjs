import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };

// The callback owns the browser; this helper owns the loopback-only server even
// when browser startup or a layout assertion throws. Never serves repo root.
export async function withFixtureServer(directory, run) {
  const root = resolve(directory);
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
      const pathname = new URL(req.url, 'http://fixture.local').pathname;
      const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  try { return await run(`http://127.0.0.1:${server.address().port}`); }
  finally {
    server.closeAllConnections();
    await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  }
}
