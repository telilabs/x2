"use strict";
const fs   = require("fs");
const path = require("path");
const http = require("http");

// fs.watch({ recursive }) is macOS/Windows only — walk the tree manually.
function watchRecursive(dir, cb) {
  try { fs.watch(dir, (_, f) => cb(path.join(dir, f || ""))); } catch {}
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory()) watchRecursive(path.join(dir, e.name), cb);
  } catch {}
}

const LIVE_RELOAD = `<script>(function(){var es=new EventSource("/__x2_sse"),ready=false;es.onmessage=function(){if(!ready){ready=true;return;}location.reload();}})()</script>`;

function inject(html) {
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + LIVE_RELOAD : html.slice(0, i) + LIVE_RELOAD + html.slice(i);
}

function serve(projectDir) {
  projectDir = path.resolve(projectDir || ".");
  const bundle   = require("./bundle");
  const outputDir = bundle(projectDir);
  let clients = [];

  let timer;
  watchRecursive(path.join(projectDir, "app"), () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log("x2: rebuilding...");
      try {
        bundle(projectDir, outputDir);
        clients = clients.filter(r => { try { r.write("data:1\n\n"); return true; } catch { return false; } });
      } catch (e) { console.error("x2: build error:", e.message); }
    }, 150);
  });

  const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html" };

  http.createServer((req, res) => {
    const p = new URL(req.url, "http://x").pathname;

    if (p === "/__x2_sse") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
      res.write("data:0\n\n");
      clients.push(res);
      req.on("close", () => { clients = clients.filter(r => r !== res); });
      return;
    }

    const ext  = path.extname(p);
    const file = path.join(outputDir, ext ? path.basename(p) : "index.html");

    fs.readFile(file, (err, data) => {
      if (err) {
        fs.readFile(path.join(outputDir, "index.html"), (e2, html) => {
          if (e2) { res.writeHead(404); res.end("Not found"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(inject(html.toString()));
        });
        return;
      }
      const ct = MIME[ext] || "text/html";
      res.writeHead(200, { "Content-Type": ct });
      res.end(ct === "text/html" ? inject(data.toString()) : data);
    });
  }).listen(+(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log(`x2: http://127.0.0.1:${process.env.PORT || 3000}`)
  );
}

if (require.main === module) serve(process.argv[2]);
module.exports = serve;
