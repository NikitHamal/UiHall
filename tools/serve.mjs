/**
 * Zero-dependency static file server for UI Hall.
 *
 *   node tools/serve.mjs            -> http://127.0.0.1:8788
 *   node tools/serve.mjs 9000       -> http://127.0.0.1:9000
 *
 * Serves E:/Stormy/ui-hall so relative asset paths resolve the way they will
 * when the folder is deployed. Range requests are supported because the browser
 * issues them for <video> playback.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)), "ui-hall");
const PORT = Number(process.argv[2] || 8788);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    return send(res, 400, "bad path");
  }
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.join(ROOT, urlPath);

  // Contain the served tree inside ROOT.
  if (!filePath.startsWith(ROOT)) return send(res, 403, "forbidden");

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "not found: " + urlPath);
    const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    const range = req.headers.range;
    if (range && /^bytes=/.test(range)) {
      const [startS, endS] = range.replace(/^bytes=/, "").split("-");
      const start = startS ? Number(startS) : 0;
      const end = endS ? Number(endS) : st.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= st.size) {
        return send(res, 416, "", { "Content-Range": `bytes */${st.size}` });
      }
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${st.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }

    send(res, 200, fs.readFileSync(filePath), {
      "Content-Type": type,
      "Content-Length": st.size,
      "Accept-Ranges": "bytes",
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`UI Hall  ->  http://127.0.0.1:${PORT}/`);
  console.log(`root: ${ROOT}`);
});
