import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import crypto from "crypto";

const {
  PORT = 3001,
  NODE_ENV = 'development',
  JWT_SECRET = 'change-me',
  JWT_EXPIRES = '3600',
  MSSQL_SERVER = 'mssql',
  MSSQL_DB = 'YourAppDb',
  MSSQL_USER = 'sa',
  MSSQL_PASSWORD = 'YourStrong!Passw0rd',
  MSSQL_ENCRYPT = 'false',
  NOCO_URL = 'http://nocodb:8080',
  NOCO_API_TOKEN = '',
  CORS_ORIGINS = ''
} = process.env;

const app = express();

app.use(cookieParser());

// ---------- PROXY TO NOCODB (protected) ----------
app.use('/api', authRequired, (req, res, next) => {
  next();
}, createProxyMiddleware({
  target: process.env.NOCO_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    let out = path.replace(/^\/inft3050\//, '/api/v1/db/data/v1/inft3050/');
    console.log("Out path=" + out);
    return out;
  },
  headers: { 'xc-token': process.env.NOCO_API_TOKEN },
}));

app.use(express.json());

// CORS for students’ local React dev servers (cookies + credentials)
const origins = CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true
}));

// ---------- MSSQL POOL ----------
const poolPromise = sql.connect({
  server: MSSQL_SERVER,
  database: MSSQL_DB,
  user: MSSQL_USER,
  password: MSSQL_PASSWORD,
  options: {
    encrypt: String(MSSQL_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: true
  }
});

// NocoDB 0.98 cannot insert into ProductsInOrders because the junction table
// has no primary key. Keep this write behind the admin JWT and use a SQL
// transaction so an order either receives every line or none of them.
app.post('/order-lines', authRequired, async (req, res) => {
  const orderId = Number(req.body?.orderId);
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  const validLines = lines.every((line) =>
    Number.isInteger(Number(line.stocktakeItemId)) && Number(line.stocktakeItemId) > 0 &&
    Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0
  );

  if (!Number.isInteger(orderId) || orderId <= 0 || lines.length === 0 || !validLines) {
    return res.status(400).json({ error: 'valid orderId and order lines are required' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    for (const line of lines) {
      await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('productId', sql.Int, Number(line.stocktakeItemId))
        .input('quantity', sql.Int, Number(line.quantity))
        .query(`
          INSERT INTO [ProductsInOrders] ([OrderId], [produktId], [Quantity])
          VALUES (@orderId, @productId, @quantity)
        `);
    }
    await transaction.commit();
    return res.status(201).json({ orderId, inserted: lines.length });
  } catch (error) {
    await transaction.rollback().catch(() => {});
    console.error('Could not insert order lines', error);
    return res.status(500).json({ error: 'could not insert order lines' });
  }
});

// ---------- JWT helpers ----------
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: Number(JWT_EXPIRES) });
}

function extractTableFromPath(pathname) {
  // v2: /api/v2/tables/<tableIdOrSlug>/...
  let m = pathname.match(/^\/inft3050\/([^/]+)/i);
  if (m) return decodeURIComponent(m[1]);

  return null;
}

function authRequired(req, res, next) {
  const token = req.cookies?.token;
  const { pathname } = new URL(req.url, 'http://x'); // safe parse
  const table = extractTableFromPath(pathname);
  console.log("Received request for table: " + table + " on URL " + pathname);

  // User data is private on reads. Product and stock writes are restricted to
  // administrators even when a valid employee cookie is present.
  const PRIVATE_READ_TABLES = new Set([
    'user', 'users', 'dbo.user', 'dbo.users',
  ]);
  const ADMIN_WRITE_TABLES = new Set([
    'user', 'users', 'dbo.user', 'dbo.users',
    'product', 'products', 'dbo.product', 'dbo.products',
    'stocktake', 'dbo.stocktake',
  ]);

  let needAuth = true;
  let needAdmin = true;

  if (req.url == '/login') {
    needAuth = false;
    needAdmin = false;
  } else if (req.url == '/logout') {
    needAuth = true;
    needAdmin = false;
  } else if (req.url == '/me') {
    needAuth = true;
    needAdmin = false;
  } else if (req.url == '/order-lines') {
    needAuth = true;
    needAdmin = true;
  }
  else if (table) {
    const normalisedTable = table.toLowerCase();
    if (req.method === "GET") {
      needAuth = PRIVATE_READ_TABLES.has(normalisedTable);
      needAdmin = false;
    } else {
      needAuth = true;
      needAdmin = ADMIN_WRITE_TABLES.has(normalisedTable);
    }
  } else {
    console.log("Rejected - unknown URL " + pathname);
    return res.status(401).json({ error: 'Forbidden: unknown URL' });
  }

  if (needAuth) {
    if (!token) {
      console.log("Rejected - authentication required but no token found on URL " + pathname);
      return res.status(401).json({ error: 'Forbidden: authentication required' });
    }
    try {
      req.user = jwt.verify(token, JWT_SECRET);

      if (needAdmin) {
        if (req.user.isAdmin === true) {
          console.log("Accepted - admin credentials required on URL " + pathname);
          next();
        }
        else {
          console.log("Rejected - credentials provided but not admin on URL " + pathname);
          return res.status(403).json({ error: 'Forbidden: admin access required' });
        }
      }
      else {
        console.log("Accepted - non admin authenticated request on URL " + pathname);
        next();
      }
    } catch {
      console.log("Rejected - invalid token provided on URL " + pathname);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  else {
    console.log("Accepted - public request on URL " + pathname)
    next();
  }

}

// ---------- AUTH ROUTES ----------
// Expect body: { username, password }
app.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT userid, username, hashpw, salt, email, isAdmin  
        FROM [User]  
        WHERE username = @username
      `);

    const user = result.recordset?.[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const hash = crypto.createHash("sha256").update(user.salt + password, "utf8").digest("hex");
    if (hash != user.hashpw) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({
      sub: user.userid,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: Number(JWT_EXPIRES) * 1000
    });
    res.json({ id: user.userid, email: user.email, username: user.username, isAdmin: user.isAdmin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ ok: true });
});

app.get('/me', authRequired, (req, res) => {
  res.json({
    id: req.user.sub,
    email: req.user.email,
    username: req.user.username,
    isAdmin: req.user.isAdmin === true,
  });
});

app.listen(PORT, () => {
  console.log(`Auth server listening on :${PORT}`);
});
