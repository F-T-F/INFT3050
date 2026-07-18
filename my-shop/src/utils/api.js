import axios from 'axios';
import { makeSalt, sha256Hex } from './hash';
import { getCurrentUser } from './session';

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

export const getSources = async () => fetchAll('Source');

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
            map[pid] = { price, quantity: s.Quantity, itemId: s.ItemId, sourceId: s.SourceId };
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
            stocktakeItemId: priceInfo ? priceInfo.itemId : null,
            sourceId: priceInfo ? priceInfo.sourceId : 1,
            genreName: GENRE_LABEL[p.Genre] || 'Other',
            subGenreName: (subMaps[p.Genre] && subMaps[p.Genre][p.SubGenre]) || '',
        };
    });
};

const todayIso = () => new Date().toISOString();

const requireAdminSession = () => {
    if (!getCurrentUser()?.isAdmin) {
        const error = new Error('Administrator access required.');
        error.code = 'ADMIN_REQUIRED';
        throw error;
    }
};

const productPayload = (item, username = 'adminAccount') => ({
    Name: item.name.trim(),
    Author: item.author.trim(),
    Description: item.description.trim(),
    Genre: Number(item.category),
    SubGenre: Number(item.subGenre || 1),
    Published: item.published || new Date().toISOString().slice(0, 10),
    LastUpdatedBy: username,
    LastUpdated: todayIso(),
});

const stocktakePayload = (productId, item) => ({
    SourceId: Number(item.sourceId || 1),
    ProductId: Number(productId),
    Quantity: Number(item.stock || 0),
    Price: Number(item.price || 0),
});

export const getStocktakeRowsForProduct = async (productId) => {
    const res = await apiClient.get('/Stocktake', {
        params: { where: `(ProductId,eq,${productId})`, limit: 1000 },
    });
    return res.data.list || [];
};

export const getAdminProduct = async (productId) => {
    const [productRes, stockRows, subMaps] = await Promise.all([
        apiClient.get(`/Product/${productId}`),
        getStocktakeRowsForProduct(productId),
        getSubgenreMaps(),
    ]);
    const product = productRes.data;
    const genreId = Number(product.Genre?.GenreID || product.Genre || 1);
    const stock = stockRows[0] || {};
    return {
        ...product,
        Genre: genreId,
        genreName: GENRE_LABEL[genreId] || 'Other',
        subGenreName: (subMaps[genreId] && subMaps[genreId][product.SubGenre]) || '',
        price: stock.Price != null ? Number(stock.Price) : 0,
        quantity: stock.Quantity != null ? Number(stock.Quantity) : 0,
        stocktakeItemId: stock.ItemId || null,
        sourceId: stock.SourceId || 1,
    };
};

export const createProduct = async (item, username) => {
    requireAdminSession();
    const productRes = await apiClient.post('/Product', productPayload(item, username));
    const product = productRes.data;
    await apiClient.post('/Stocktake', stocktakePayload(product.ID, item));
    return product;
};

export const updateProduct = async (productId, item, username) => {
    requireAdminSession();
    const productRes = await apiClient.patch(`/Product/${productId}`, productPayload(item, username));
    const stockRows = await getStocktakeRowsForProduct(productId);
    if (stockRows[0]?.ItemId) {
        await apiClient.patch(`/Stocktake/${stockRows[0].ItemId}`, stocktakePayload(productId, item));
    } else {
        await apiClient.post('/Stocktake', stocktakePayload(productId, item));
    }
    return productRes.data;
};

export const deleteProduct = async (productId) => {
    requireAdminSession();
    const stockRows = await getStocktakeRowsForProduct(productId);
    await Promise.all(stockRows.map((row) => apiClient.delete(`/Stocktake/${row.ItemId}`)));
    await apiClient.delete(`/Product/${productId}`);
};

// ---------- Admin user management ----------
export const getUsers = async () => {
    const rows = await fetchAll('User');
    return rows.map((u) => ({ ...u, isAdmin: Boolean(u.IsAdmin ?? u.isAdmin) }));
};

const userPayload = async (user) => {
    const payload = {
        UserName: user.username.trim(),
        Email: user.email.trim(),
        Name: user.name.trim(),
        IsAdmin: user.isAdmin ? 1 : 0,
    };

    if (user.password) {
        const salt = makeSalt();
        payload.Salt = salt;
        payload.HashPW = await sha256Hex(salt + user.password);
    }

    return payload;
};

export const createUser = async (user) => {
    requireAdminSession();
    const payload = await userPayload(user);
    const res = await apiClient.post('/User', payload);
    return res.data;
};

export const updateUser = async (userId, user) => {
    requireAdminSession();
    const payload = await userPayload(user);
    const res = await apiClient.patch(`/User/${userId}`, payload);
    return res.data;
};

export const deleteUser = async (userId) => {
    requireAdminSession();
    await apiClient.delete(`/User/${userId}`);
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

export const registerCustomer = async ({ name, email, password, address }) => {
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
        try {
            await apiClient.post('/TO', {
                PatronId: Number(created.UserID),
                Email: trimmedEmail,
                PhoneNumber: '',
                ...orderAddressPayload(address),
            });
        } catch (error) {
            await apiClient.delete(`/Patrons/${created.UserID}`).catch(() => {});
            throw error;
        }
    } finally {
        await logout(); // never leave the service cookie in the browser
    }
    return { id: created.UserID, name, email: trimmedEmail, isCustomer: true };
};

// ---------- Orders ----------

const runAsServiceAccount = async (operation) => {
    await login(SERVICE_ACCOUNT.username, SERVICE_ACCOUNT.password);
    try {
        return await operation();
    } finally {
        await logout();
    }
};

const orderAddressPayload = (address) => ({
    StreetAddress: address.streetAddress.trim(),
    PostCode: Number(address.postCode),
    Suburb: address.suburb.trim(),
    State: address.state,
});

const getCustomerCheckoutRecord = async (patronId) => {
    const rows = await fetchAll('TO', { where: `(PatronId,eq,${Number(patronId)})` });
    return rows[0] || null;
};

const emptyAddress = () => ({
    streetAddress: '',
    postCode: '',
    suburb: '',
    state: 'NSW',
});

export const getCustomerProfile = async (patronId) => {
    const [patronResponse, checkoutRecord] = await Promise.all([
        apiClient.get(`/Patrons/${Number(patronId)}`),
        getCustomerCheckoutRecord(patronId),
    ]);
    const patron = patronResponse.data;
    return {
        user: {
            id: patron.UserID,
            name: patron.Name || '',
            email: patron.Email || '',
            isCustomer: true,
        },
        address: checkoutRecord ? {
            streetAddress: checkoutRecord.StreetAddress || '',
            postCode: checkoutRecord.PostCode || '',
            suburb: checkoutRecord.Suburb || '',
            state: checkoutRecord.State || 'NSW',
        } : emptyAddress(),
    };
};

export const updateCustomerProfile = async ({ id, name, email, address = null }) => {
    const trimmedEmail = email.trim();
    const matches = await fetchAll('Patrons', { where: `(Email,eq,${trimmedEmail})` });
    if (matches.some((patron) => Number(patron.UserID) !== Number(id))) {
        const error = new Error('Email already registered.');
        error.code = 'EXISTS';
        throw error;
    }

    return runAsServiceAccount(async () => {
        await apiClient.patch(`/Patrons/${Number(id)}`, {
            Name: name.trim(),
            Email: trimmedEmail,
        });

        let checkoutRecord = await getCustomerCheckoutRecord(id);
        const checkoutPayload = {
            PatronId: Number(id),
            Email: trimmedEmail,
            ...(address ? orderAddressPayload(address) : {}),
        };
        if (checkoutRecord) {
            await apiClient.patch(`/TO/${checkoutRecord.CustomerID}`, checkoutPayload);
        } else if (address) {
            await apiClient.post('/TO', checkoutPayload);
        }

        return { id: Number(id), name: name.trim(), email: trimmedEmail, isCustomer: true };
    });
};

export const resetCustomerPassword = async ({ email, password }) => {
    const matches = await fetchAll('Patrons', { where: `(Email,eq,${email.trim()})` });
    const patron = matches[0];
    if (!patron) return false;

    const salt = makeSalt();
    const hashPW = await sha256Hex(salt + password);
    await runAsServiceAccount(() => apiClient.patch(`/Patrons/${patron.UserID}`, { Salt: salt, HashPW: hashPW }));
    return true;
};

const resolveStocktakeItemId = async (item) => {
    if (item.stocktakeItemId) return Number(item.stocktakeItemId);
    const rows = await getStocktakeRowsForProduct(item.ID);
    const matchingPrice = rows.find((row) => Number(row.Price) === Number(item.price));
    const stocktake = matchingPrice || rows[0];
    if (!stocktake?.ItemId) throw new Error(`No stock record found for ${item.Name}`);
    return Number(stocktake.ItemId);
};

export const createOrder = async ({ customer, address, payment, items }) => {
    if (!customer?.isCustomer || !customer.id) throw new Error('A customer account is required.');

    const orderLines = await Promise.all(items.map(async (item) => ({
        stocktakeItemId: await resolveStocktakeItemId(item),
        quantity: Number(item.cartQty || 1),
    })));

    return runAsServiceAccount(async () => {
        const checkoutPayload = {
            PatronId: Number(customer.id),
            Email: customer.email.trim(),
            PhoneNumber: '',
            ...orderAddressPayload(address),
            // The prototype database has payment columns, but full card numbers and
            // CVVs should not be persisted. Keep only a masked last-four reference.
            CardNumber: `****${String(payment.last4 || '').slice(-4)}`,
            CardOwner: payment.cardOwner.trim(),
            Expiry: payment.expiry,
        };

        let checkoutRecord = await getCustomerCheckoutRecord(customer.id);
        if (checkoutRecord) {
            const response = await apiClient.patch(`/TO/${checkoutRecord.CustomerID}`, checkoutPayload);
            checkoutRecord = { ...checkoutRecord, ...response.data, ...checkoutPayload };
        } else {
            const response = await apiClient.post('/TO', checkoutPayload);
            checkoutRecord = response.data;
        }

        const customerId = Number(checkoutRecord.CustomerID);
        if (!customerId) throw new Error('The customer checkout record could not be created.');

        const orderResponse = await apiClient.post('/Orders', {
            Customer: customerId,
            ...orderAddressPayload(address),
        });
        const order = orderResponse.data;
        const orderId = Number(order.OrderID);
        if (!orderId) throw new Error('The order could not be created.');

        try {
            await authClient.post('/order-lines', {
                orderId,
                lines: orderLines,
            });
        } catch (error) {
            // Do not leave an empty order if its junction-table rows fail.
            await apiClient.delete(`/Orders/${orderId}`).catch(() => {});
            throw error;
        }

        return { ...order, OrderID: orderId };
    });
};

const fetchOrderLineRows = async (orders) => {
    try {
        return await fetchAll('ProductsInOrders');
    } catch {
        const groups = await Promise.all(orders.map(async (order) => {
            const response = await apiClient.get(`/Orders/${order.OrderID}/hm/ProductsInOrders List`, {
                params: { limit: 1000 },
            });
            if (Array.isArray(response.data)) return response.data;
            return response.data.list || [];
        }));
        return groups.flat();
    }
};

const normaliseOrders = async (patronId = null) => {
    const [orders, customers, stocktake, products] = await Promise.all([
        fetchAll('Orders'),
        fetchAll('TO'),
        fetchAll('Stocktake'),
        fetchAll('Product'),
    ]);
    const orderLines = await fetchOrderLineRows(orders);
    const customersById = Object.fromEntries(customers.map((row) => [Number(row.CustomerID), row]));
    const stockById = Object.fromEntries(stocktake.map((row) => [Number(row.ItemId), row]));
    const productsById = Object.fromEntries(products.map((row) => [Number(row.ID), row]));

    return orders
        .map((order) => {
            const customerId = Number(order.Customer?.CustomerID || order.Customer || order.customer);
            const customer = customersById[customerId] || {};
            const lines = orderLines
                .filter((line) => Number(line.OrderId) === Number(order.OrderID))
                .map((line) => {
                    const stock = stockById[Number(line.ProduktId)] || {};
                    const product = productsById[Number(stock.ProductId)] || stock.Product || {};
                    const quantity = Number(line.Quantity || 1);
                    const price = Number(stock.Price || 0);
                    return {
                        stocktakeItemId: Number(line.ProduktId),
                        productId: Number(stock.ProductId),
                        name: product.Name || `Stock item ${line.ProduktId}`,
                        quantity,
                        price,
                        lineTotal: price * quantity,
                    };
                });

            return {
                id: Number(order.OrderID),
                customerId,
                patronId: Number(customer.PatronId || 0),
                customerName: customer.Patrons?.Name || customer.Email || 'Guest customer',
                customerEmail: customer.Email || '',
                address: {
                    streetAddress: order.StreetAddress || '',
                    postCode: order.PostCode || '',
                    suburb: order.Suburb || '',
                    state: order.State || '',
                },
                lines,
                total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
            };
        })
        .filter((order) => patronId == null || order.patronId === Number(patronId))
        .sort((a, b) => b.id - a.id);
};

export const getCustomerOrders = async (patronId) => normaliseOrders(patronId);

export const getAdminOrders = async () => normaliseOrders();

export const updateCustomerOrder = async ({ orderId, patronId, address }) => {
    const customerOrders = await normaliseOrders(patronId);
    const ownedOrder = customerOrders.find((order) => order.id === Number(orderId));
    if (!ownedOrder) {
        const error = new Error('This order does not belong to the current customer.');
        error.code = 'FORBIDDEN';
        throw error;
    }

    const response = await runAsServiceAccount(() =>
        apiClient.patch(`/Orders/${Number(orderId)}`, orderAddressPayload(address))
    );
    return { ...ownedOrder, address: { ...address }, databaseRecord: response.data };
};

export const updateOrderDelivery = async (orderId, address) => {
    requireAdminSession();
    const response = await apiClient.patch(`/Orders/${orderId}`, orderAddressPayload(address));
    return response.data;
};

export default apiClient;
