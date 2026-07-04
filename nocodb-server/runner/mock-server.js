// 零依賴 mock，模擬 NocoDB v1 Data API，供 my-shop 前端使用
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, '..', 'products.json');

function loadProducts() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  // NocoDB 會自動配置遞增 Id，前端用 product.Id 當 key 與排序
  return raw.map((p, i) => ({ Id: i + 1, ...p }));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  const parsed = url.parse(req.url, true);

  // GET /api/v1/db/data/noco/:base/:table
  if (/^\/api\/v1\/db\/data\/noco\/[^/]+\/[^/]+$/.test(parsed.pathname)) {
    let list = loadProducts();
    const where = parsed.query.where;
    if (where) {
      const m = decodeURIComponent(where).match(/like,%([^%)]+)%/i);
      if (m) {
        const kw = m[1].toLowerCase();
        list = list.filter(p =>
          (p.title || '').toLowerCase().includes(kw) ||
          (p.description || '').toLowerCase().includes(kw)
        );
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      list,
      pageInfo: { totalRows: list.length, page: 1, pageSize: list.length, isFirstPage: true, isLastPage: true },
    }));
    return;
  }

  if (parsed.pathname === '/') {
    res.end('mock NocoDB API running');
    return;
  }
  res.statusCode = 404;
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`mock NocoDB API -> http://localhost:${PORT}`);
});
