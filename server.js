import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { createReply } from './public/replies.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
    if (req.url === '/api/chat' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 16384) {
            res.writeHead(413).end(JSON.stringify({ error: 'メッセージが長すぎます。' }));
            return;
          }
        }
        const { message } = JSON.parse(body);
        if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
          res.writeHead(400).end(JSON.stringify({ error: '1〜1000文字で入力してください。' }));
          return;
        }
        res.end(JSON.stringify({ reply: createReply(message) }));
      } catch {
        if (!res.headersSent) res.writeHead(400).end(JSON.stringify({ error: '入力を確認してください。' }));
      }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const routes = { '/': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js', '/replies.js': 'replies.js', '/ryoko-expressions.png': 'ryoko-expressions.png' };
      const name = routes[pathname];
      if (!name) { res.writeHead(404).end('Not found'); return; }
      const file = await readFile(resolve(root, name));
      res.setHeader('Content-Type', types[extname(name)]);
      res.end(req.method === 'HEAD' ? undefined : file);
    } catch { res.writeHead(500).end('Server error'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`ふたり時間: port ${process.env.PORT || 3000}`));
}
