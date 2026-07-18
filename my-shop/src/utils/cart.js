const CART_KEY = 'eg_cart_items';
const ORDERS_KEY = 'eg_local_orders';
const ADDRESS_KEY = 'eg_account_address';

const readJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const getCartItems = () => readJson(CART_KEY, []);

export const saveCartItems = (items) => writeJson(CART_KEY, items);

export const addCartItem = (product) => {
    const items = getCartItems();
    const existing = items.find((item) => item.ID === product.ID);
    const next = existing
        ? items.map((item) => item.ID === product.ID ? { ...item, cartQty: item.cartQty + 1 } : item)
        : [...items, {
            ID: product.ID,
            Name: product.Name,
            Author: product.Author,
            Genre: product.Genre,
            genreName: product.genreName,
            price: product.price || 0,
            stocktakeItemId: product.stocktakeItemId || null,
            cartQty: 1,
        }];
    saveCartItems(next);
    return next;
};

export const clearCart = () => {
    localStorage.removeItem(CART_KEY);
};

export const getLocalOrders = () => readJson(ORDERS_KEY, []);

export const saveLocalOrder = (order) => {
    const orders = getLocalOrders();
    const next = [order, ...orders];
    writeJson(ORDERS_KEY, next);
    return next;
};

export const getSavedAddress = () => readJson(ADDRESS_KEY, {
    streetAddress: '',
    suburb: '',
    state: 'NSW',
    postCode: '',
});

export const saveAddress = (address) => {
    writeJson(ADDRESS_KEY, address);
    return address;
};
