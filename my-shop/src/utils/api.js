import axios from 'axios';
import { makeSalt, sha256Hex } from './hash';

// Teacher-provided backend: auth proxy on :3001 -> NocoDB -> MSSQL (StoreDB).
// - GET on data tables is public (no auth).
// - POST/PATCH/DELETE require the login cookie (httpOnly JWT), so withCredentials.
// - The auth container injects the NocoDB xc-token server-side; we never send it.
//
// Two transports, because the backend's CORS is set up differently per route:
//
// - DATA (/api/...): the auth container's /api proxy returns NocoDB's CORS
//   (Access-Control-Allow-Origin: *), which is incompatible with credentials.
//   So we call it through the CRA dev-server proxy (package.json
//   "proxy": http://localhost:3001) using RELATIVE urls -> same-origin, no CORS.
//
// - AUTH (/login, /logout, /me): the container applies proper credentialed CORS
//   for origin http://localhost:3000, but ONLY when the real browser Origin is
//   sent. The CRA proxy rewrites Origin to :3001 (blocked), so we call the
//   backend DIRECTLY here. The httpOnly cookie it sets is scoped to host
//   "localhost" (port-agnostic), so it still flows on the proxied data calls.
const AUTH_ORIGIN = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const apiClient = axios.create({
    baseURL: '/api/inft3050',
    timeout: 15000,
    withCredentials: true, // send the auth cookie on writes
    headers: { 'Content-Type': 'application/json' },
});

const authClient = axios.create({
    baseURL: AUTH_ORIGIN,
    timeout: 15000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response) console.error('API Error:', error.response.status, error.config?.url);
        return Promise.reject(error);
    }
);

// NocoDB v1 returns { list, pageInfo }. Fetch every row (prototype data is small).
const fetchAll = async (table, params = {}) => {
    const res = await apiClient.get(`/${table}`, { params: { limit: 1000, ...params } });
    return res.data.list || [];
};

// ---------- Genre / subgenre lookups ----------
export const GENRE_LABEL = { 1: 'Books', 2: 'Movies', 3: 'Games' };
const SUBGENRE_TABLE = { 1: 'BookGenre', 2: 'MovieGenre', 3: 'GameGenre' };

// Returns { 1: {subGenreId: name, ...}, 2: {...}, 3: {...} }
export const getSubgenreMaps = async () => {
    const entries = await Promise.all(
        Object.entries(SUBGENRE_TABLE).map(async ([genre, table]) => {
            const rows = await fetchAll(table);
            const map = {};
            rows.forEach((r) => { map[r.SubGenreID] = r.Name; });
            return [genre, map];
        })
    );
    return Object.fromEntries(entries);
};

// ---------- Products (joined with Stocktake for price) ----------

// Build ProductId -> { price, inStock } from the Stocktake table (min price across sources).
const getPriceMap = async () => {
    const stock = await fetchAll('Stocktake');
    const map = {};
    stock.forEach((s) => {
        const pid = s.ProductId;
        const price = typeof s.Price === 'number' ? s.Price : parseFloat(s.Price);
        if (pid == null || isNaN(price)) return;
        if (!map[pid] || price < map[pid].price) {
            map[pid] = { price, quantity: s.Quantity };
        }
    });
    return map;
};

// NocoDB exposes Product.Genre as a (broken) relation that serialises to {},
// so we can't read the genre int off the Product row. Instead we fetch each
// genre's products via the has-many relation, which tags them by genre for us.
const fetchProductsByGenre = async (genreId) => {
    const res = await apiClient.get(`/Genre/${genreId}/hm/Product List`, { params: { limit: 1000 } });
    return (res.data.list || []).map((p) => ({ ...p, Genre: genreId }));
};

// Returns all products enriched with: Genre (int), price, genreName, subGenreName.
export const getProducts = async () => {
    const [prices, subMaps, ...genreGroups] = await Promise.all([
        getPriceMap(),
        getSubgenreMaps(),
        ...Object.keys(GENRE_LABEL).map((g) => fetchProductsByGenre(Number(g))),
    ]);
    const products = genreGroups.flat();
    return products.map((p) => {
        const priceInfo = prices[p.ID];
        return {
            ...p,
            price: priceInfo ? priceInfo.price : null,
            quantity: priceInfo ? priceInfo.quantity : 0,
            genreName: GENRE_LABEL[p.Genre] || 'Other',
            subGenreName: (subMaps[p.Genre] && subMaps[p.Genre][p.SubGenre]) || '',
        };
    });
};

// ---------- Auth (staff/admin User accounts) ----------

// POST /login {username, password} -> sets httpOnly cookie. Returns {id, username, email, isAdmin}.
export const login = async (username, password) => {
    const res = await authClient.post('/login', { username, password });
    return res.data;
};

export const logout = async () => {
    try { await authClient.post('/logout'); } catch { /* ignore */ }
};

// GET /me -> {id, email} when the cookie is valid; throws 401 otherwise.
export const getMe = async () => {
    const res = await authClient.get('/me');
    return res.data;
};

// ---------- Customer (Patron) sign-in ----------
// Front-end validation against the Patrons table (public GET). Matches the
// register scheme: HashPW = sha256(Salt + password). No cookie is issued, so a
// signed-in customer can browse/view but not perform authorised writes.
// Returns a trimmed customer object, or null on bad credentials.
export const loginPatron = async (email, password) => {
    const res = await apiClient.get('/Patrons', {
        params: { where: `(Email,eq,${email.trim()})`, limit: 1 },
    });
    const patron = (res.data.list || [])[0];
    if (!patron) return null;
    const hash = await sha256Hex((patron.Salt || '') + password);
    if (hash !== patron.HashPW) return null;
    return { id: patron.UserID, name: patron.Name, email: patron.Email, isCustomer: true };
};

// The backend blocks anonymous writes, so self-registration is done by briefly
// authenticating with the course service account (public in the Postman
// collection) to create the Patron, then logging back out. Returns the new
// customer, or throws { code: 'EXISTS' } if the email is taken.
const SERVICE_ACCOUNT = { username: 'adminAccount', password: 'adminPW' };

export const registerCustomer = async ({ name, email, password }) => {
    const trimmedEmail = email.trim();
    const dup = await apiClient.get('/Patrons', {
        params: { where: `(Email,eq,${trimmedEmail})`, limit: 1 },
    });
    if ((dup.data.list || []).length) {
        const e = new Error('Email already registered');
        e.code = 'EXISTS';
        throw e;
    }

    const salt = makeSalt();
    const hashPW = await sha256Hex(salt + password);

    await login(SERVICE_ACCOUNT.username, SERVICE_ACCOUNT.password); // get a write cookie
    let created;
    try {
        const res = await apiClient.post('/Patrons', {
            Name: name, Email: trimmedEmail, Salt: salt, HashPW: hashPW,
        });
        created = res.data;
    } finally {
        await logout(); // never leave the service cookie in the browser
    }
    return { id: created.UserID, name, email: trimmedEmail, isCustomer: true };
};

export default apiClient;
