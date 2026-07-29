const http = require('http');

const PORT = Number(process.env.PORT || 3001);

const genres = [
  { GenreID: 1, Name: 'Books' },
  { GenreID: 2, Name: 'Movies' },
  { GenreID: 3, Name: 'Games' },
];

const subgenres = {
  BookGenre: [
    { SubGenreID: 1, Name: 'Fantasy' },
    { SubGenreID: 2, Name: 'Science Fiction' },
    { SubGenreID: 3, Name: 'Mystery' },
  ],
  MovieGenre: [
    { SubGenreID: 1, Name: 'Animation' },
    { SubGenreID: 2, Name: 'Drama' },
    { SubGenreID: 3, Name: 'Action' },
  ],
  GameGenre: [
    { SubGenreID: 1, Name: 'Puzzle' },
    { SubGenreID: 2, Name: 'Adventure' },
    { SubGenreID: 3, Name: 'Strategy' },
  ],
};

let products = [
  { ID: 1, Name: 'The Hobbit', Author: 'J.R.R. Tolkien', Description: 'A classic fantasy adventure about Bilbo Baggins and a journey beyond the Shire.', Genre: 1, SubGenre: 1, Published: '1937-09-21' },
  { ID: 2, Name: 'Dune', Author: 'Frank Herbert', Description: 'A sweeping science fiction epic of politics, ecology, and power on Arrakis.', Genre: 1, SubGenre: 2, Published: '1965-08-01' },
  { ID: 3, Name: 'The Thursday Murder Club', Author: 'Richard Osman', Description: 'A warm mystery about four unlikely investigators in a retirement village.', Genre: 1, SubGenre: 3, Published: '2020-09-03' },
  { ID: 4, Name: 'Spirited Away', Author: 'Hayao Miyazaki', Description: 'An animated film about courage, friendship, and a strange spirit world.', Genre: 2, SubGenre: 1, Published: '2001-07-20' },
  { ID: 5, Name: 'Arrival', Author: 'Denis Villeneuve', Description: 'A thoughtful drama about language, memory, and first contact.', Genre: 2, SubGenre: 2, Published: '2016-11-11' },
  { ID: 6, Name: 'Mad Max: Fury Road', Author: 'George Miller', Description: 'A relentless action film set across a stark post-apocalyptic desert.', Genre: 2, SubGenre: 3, Published: '2015-05-15' },
  { ID: 7, Name: 'Portal 2', Author: 'Valve', Description: 'A clever puzzle game with portals, test chambers, and sharp writing.', Genre: 3, SubGenre: 1, Published: '2011-04-18' },
  { ID: 8, Name: 'The Legend of Zelda: Breath of the Wild', Author: 'Nintendo', Description: 'An open-world adventure built around exploration and experimentation.', Genre: 3, SubGenre: 2, Published: '2017-03-03' },
  { ID: 9, Name: 'Civilization VI', Author: 'Firaxis Games', Description: 'A turn-based strategy game about building an empire across history.', Genre: 3, SubGenre: 3, Published: '2016-10-21' },
];

let stocktake = products.map((product, index) => ({
  ItemId: index + 1,
  SourceId: 1,
  ProductId: product.ID,
  Quantity: [45, 150, 28, 12, 18, 8, 0, 22, 15][index],
  Price: [19.99, 24.99, 16.5, 14.5, 17.99, 15.0, 29.99, 59.99, 39.99][index],
}));

let users = [
  { UserID: 1, UserName: 'adminAccount', Email: 'admin@shop.local', Name: 'Admin', IsAdmin: 1 },
  { UserID: 2, UserName: 'Admin@admin.com', Email: 'Admin@admin.com', Name: 'Admin', IsAdmin: 1 },
];

let patrons = [];
let checkoutRecords = [];
let orders = [];
let orderLines = [];

const sources = [{ SourceId: 1, Name: 'Local Mock Store' }];

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function tableRows(table) {
  const tables = {
    Genre: genres,
    Product: products,
    Stocktake: stocktake,
    Source: sources,
    User: users,
    Patrons: patrons,
    TO: checkoutRecords,
    Orders: orders,
    ProductsInOrders: orderLines,
    ...subgenres,
  };
  return tables[table] || [];
}

function primaryKey(table) {
  return {
    Genre: 'GenreID',
    Product: 'ID',
    Stocktake: 'ItemId',
    Source: 'SourceId',
    User: 'UserID',
    Patrons: 'UserID',
    TO: 'CustomerID',
    Orders: 'OrderID',
    ProductsInOrders: 'LineID',
    BookGenre: 'SubGenreID',
    MovieGenre: 'SubGenreID',
    GameGenre: 'SubGenreID',
  }[table] || 'ID';
}

function applyWhere(rows, where) {
  if (!where) return rows;
  const decoded = decodeURIComponent(where);
  const eq = decoded.match(/^\(([^,]+),eq,([^)]+)\)$/);
  if (!eq) return rows;
  const field = eq[1];
  const value = eq[2];
  return rows.filter((row) => String(row[field]) === value);
}

function nextId(rows, key) {
  return rows.reduce((max, row) => Math.max(max, Number(row[key] || 0)), 0) + 1;
}

function createRow(table, payload) {
  const rows = tableRows(table);
  const key = primaryKey(table);
  const row = { ...payload };
  if (row[key] == null) row[key] = nextId(rows, key);
  rows.push(row);
  return row;
}

function updateRow(table, id, payload) {
  const rows = tableRows(table);
  const key = primaryKey(table);
  const index = rows.findIndex((row) => Number(row[key]) === Number(id));
  if (index < 0) return null;
  rows[index] = { ...rows[index], ...payload };
  return rows[index];
}

function deleteRow(table, id) {
  const rows = tableRows(table);
  const key = primaryKey(table);
  const index = rows.findIndex((row) => Number(row[key]) === Number(id));
  if (index < 0) return false;
  rows.splice(index, 1);
  return true;
}

async function handleAuth(req, res, pathname, headers) {
  if (pathname === '/login' && req.method === 'POST') {
    const body = await readBody(req);
    const adminAccounts = [
      { id: 1, username: 'adminAccount', password: 'adminPW', email: 'admin@shop.local' },
      { id: 2, username: 'Admin@admin.com', password: 'admin', email: 'Admin@admin.com' },
    ];
    const account = adminAccounts.find((item) => (
      item.username === body.username && item.password === body.password
    ));
    if (account) {
      send(res, 200, { id: account.id, username: account.username, email: account.email, isAdmin: true }, {
        ...headers,
        'Set-Cookie': 'shop_session=admin; HttpOnly; Path=/; SameSite=Lax',
      });
      return true;
    }
    send(res, 401, { error: 'Invalid credentials' }, headers);
    return true;
  }

  if (pathname === '/logout' && req.method === 'POST') {
    send(res, 200, { ok: true }, {
      ...headers,
      'Set-Cookie': 'shop_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
    });
    return true;
  }

  if (pathname === '/me' && req.method === 'GET') {
    if ((req.headers.cookie || '').includes('shop_session=admin')) {
      send(res, 200, { id: 1, username: 'adminAccount', email: 'admin@shop.local', isAdmin: true }, headers);
    } else {
      send(res, 401, { error: 'Not signed in' }, headers);
    }
    return true;
  }

  if (pathname === '/order-lines' && req.method === 'POST') {
    const body = await readBody(req);
    (body.lines || []).forEach((line) => {
      orderLines.push({
        LineID: nextId(orderLines, 'LineID'),
        OrderId: Number(body.orderId),
        ProduktId: Number(line.stocktakeItemId),
        Quantity: Number(line.quantity || 1),
      });
    });
    send(res, 200, { ok: true }, headers);
    return true;
  }

  return false;
}

async function handleApi(req, res, pathname, searchParams, headers) {
  const prefix = '/api/inft3050/';
  if (!pathname.startsWith(prefix)) return false;

  const parts = decodeURIComponent(pathname.slice(prefix.length)).split('/');

  if (req.method === 'GET' && parts[0] === 'Genre' && parts[2] === 'hm' && parts[3] === 'Product List') {
    const genreId = Number(parts[1]);
    const list = products.filter((product) => Number(product.Genre) === genreId);
    send(res, 200, { list, pageInfo: { totalRows: list.length } }, headers);
    return true;
  }

  const table = parts[0];
  const id = parts[1];
  const rows = tableRows(table);
  if (!rows) {
    send(res, 404, { error: 'Unknown table' }, headers);
    return true;
  }

  if (req.method === 'GET' && id) {
    const key = primaryKey(table);
    const row = rows.find((item) => Number(item[key]) === Number(id));
    send(res, row ? 200 : 404, row || { error: 'Not found' }, headers);
    return true;
  }

  if (req.method === 'GET') {
    const filtered = applyWhere(rows, searchParams.get('where'));
    send(res, 200, { list: filtered, pageInfo: { totalRows: filtered.length } }, headers);
    return true;
  }

  if (req.method === 'POST') {
    const row = createRow(table, await readBody(req));
    send(res, 201, row, headers);
    return true;
  }

  if (req.method === 'PATCH' && id) {
    const row = updateRow(table, id, await readBody(req));
    send(res, row ? 200 : 404, row || { error: 'Not found' }, headers);
    return true;
  }

  if (req.method === 'DELETE' && id) {
    send(res, deleteRow(table, id) ? 200 : 404, { ok: true }, headers);
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (await handleAuth(req, res, parsed.pathname, headers)) return;
    if (await handleApi(req, res, parsed.pathname, parsed.searchParams, headers)) return;
    if (parsed.pathname === '/') {
      sendText(res, 200, 'course mock backend running on :3001', headers);
      return;
    }
    send(res, 404, { error: 'Not found' }, headers);
  } catch (error) {
    console.error(error);
    send(res, 500, { error: error.message }, headers);
  }
});

server.listen(PORT, () => {
  console.log(`course mock backend -> http://localhost:${PORT}`);
});
