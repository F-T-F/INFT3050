import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteProduct, GENRE_LABEL, getProducts, logout } from './utils/api';
import { clearCurrentUser, getCurrentUser } from './utils/session';

const PAGE_SIZE = 4;

const FALLBACK_ITEMS = [
    { ID: 1, Name: 'The Hobbit', Genre: 1, genreName: 'Books', price: 19.99, quantity: 45 },
    { ID: 2, Name: 'Spirited Away', Genre: 2, genreName: 'Movies', price: 14.5, quantity: 12 },
    { ID: 3, Name: 'Portal 2', Genre: 3, genreName: 'Games', price: 29.99, quantity: 0 },
    { ID: 4, Name: 'Dune', Genre: 1, genreName: 'Books', price: 24.99, quantity: 150 },
];

const ADMIN_NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: '▦', to: '/admin', adminOnly: true },
    { key: 'products', label: 'Products', icon: '▣', to: '/admin/products' },
    { key: 'orders', label: 'Orders', icon: '□', to: '/admin/orders', adminOnly: true },
    { key: 'users', label: 'Users', icon: '♙', to: '/admin/users' },
    { key: 'settings', label: 'Settings', icon: '⚙', to: '/admin/settings', adminOnly: true },
];

const formatPrice = (price) => {
    if (price == null || Number.isNaN(Number(price))) return 'N/A';
    return Number(price) === 0 ? 'Free' : `$${Number(price).toFixed(2)}`;
};

const stockStatus = (quantity) => {
    const stock = Number(quantity || 0);
    if (stock <= 0) return { label: 'OUT OF STOCK', className: 'admin-status-out' };
    if (stock <= 15) return { label: 'LOW STOCK', className: 'admin-status-low' };
    return { label: 'IN STOCK', className: 'admin-status-in' };
};

function AdminSidebar({ active = 'products' }) {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const canManage = Boolean(currentUser?.isAdmin);
    const visibleNav = ADMIN_NAV.filter((item) => canManage || !item.adminOnly);

    const handleExit = async () => {
        await logout();
        clearCurrentUser();
        navigate('/');
    };

    return (
        <aside className="admin-sidebar">
            <div className="admin-brand">
                <div className="admin-avatar" aria-hidden="true">{canManage ? 'A' : 'S'}</div>
                <div>
                    <h2>{canManage ? 'Admin Panel' : 'Staff Panel'}</h2>
                    <p>{canManage ? 'Store Management' : 'Read-only Access'}</p>
                </div>
            </div>

            <nav className="admin-nav" aria-label="Admin navigation">
                {visibleNav.map((item) => (
                    <Link key={item.label} to={item.to} className={`admin-nav-link ${item.key === active ? 'active' : ''}`}>
                        <span aria-hidden="true">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="admin-sidebar-bottom">
                {canManage && <Link to="/admin/products/new" className="admin-sidebar-action">Add New Product</Link>}
                <button type="button" className="admin-exit-btn" onClick={handleExit}>Logout / Back to Store</button>
            </div>
        </aside>
    );
}

function AdminProductManagement() {
    const navigate = useNavigate();
    const canManage = Boolean(getCurrentUser()?.isAdmin);
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState('');
    const [genreFilter, setGenreFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const products = await getProducts();
                if (active) {
                    setItems(products.length ? products : FALLBACK_ITEMS);
                    setMessage(null);
                }
            } catch {
                if (active) {
                    setItems(FALLBACK_ITEMS);
                    setMessage({ type: 'error', text: 'Could not reach the backend, showing sample items.' });
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const handleDelete = async (item) => {
        if (!canManage) return;
        const confirmed = window.confirm(`Delete "${item.Name}" from the catalogue?`);
        if (!confirmed) return;
        setDeletingId(item.ID);
        setMessage(null);
        try {
            await deleteProduct(item.ID);
            setItems((current) => current.filter((p) => p.ID !== item.ID));
            setMessage({ type: 'success', text: `"${item.Name}" was deleted.` });
        } catch {
            setMessage({ type: 'error', text: 'Could not delete this item. It may be linked to an order.' });
        } finally {
            setDeletingId(null);
        }
    };

    const filteredItems = useMemo(() => {
        const search = query.trim().toLowerCase();
        return items.filter((item) => {
            const matchesSearch = !search ||
                item.Name?.toLowerCase().includes(search) ||
                item.Author?.toLowerCase().includes(search) ||
                item.genreName?.toLowerCase().includes(search);
            const matchesGenre = genreFilter === 'all' || Number(item.Genre) === Number(genreFilter);
            const status = stockStatus(item.quantity).label;
            const matchesStock = stockFilter === 'all' || status === stockFilter;
            return matchesSearch && matchesGenre && matchesStock;
        });
    }, [items, query, genreFilter, stockFilter]);

    const handleExport = () => {
        const rows = [
            ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status'],
            ...filteredItems.map((item) => [
                item.ID,
                item.Name,
                item.genreName || GENRE_LABEL[item.Genre] || 'Other',
                item.price ?? '',
                item.quantity ?? 0,
                stockStatus(item.quantity).label,
            ]),
        ];
        const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'admin-products.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [query]);

    return (
        <div className="admin-shell">
            <AdminSidebar />

            <main className="admin-main">
                <div className="admin-page-head">
                    <div>
                        <h1>Item Management</h1>
                        <p>{canManage ? 'Manage your catalog, prices, and stock levels.' : 'View catalog, prices, and stock levels.'}</p>
                    </div>
                    {canManage && <button type="button" className="admin-primary-btn" onClick={() => navigate('/admin/products/new')}>
                        <span aria-hidden="true">+</span> Add New Item
                    </button>}
                </div>

                {message && (
                    <div className={`auth-message auth-message-${message.type}`} role="status">
                        {message.text}
                    </div>
                )}

                <section className="admin-toolbar" aria-label="Product tools">
                    <label className="admin-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            placeholder="Search items..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </label>
                    <div className="admin-toolbar-actions">
                        <select className="admin-filter-select" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} aria-label="Filter by category">
                            <option value="all">All categories</option>
                            <option value="1">Books</option>
                            <option value="2">Movies</option>
                            <option value="3">Games</option>
                        </select>
                        <select className="admin-filter-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter by stock status">
                            <option value="all">All stock</option>
                            <option value="IN STOCK">In stock</option>
                            <option value="LOW STOCK">Low stock</option>
                            <option value="OUT OF STOCK">Out of stock</option>
                        </select>
                        <button type="button" className="admin-light-btn" onClick={handleExport}>Export</button>
                    </div>
                </section>

                <section className="admin-table-card">
                    <table className="admin-products-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="admin-empty-row">Loading inventory...</td>
                                </tr>
                            ) : pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="admin-empty-row">No matching items found.</td>
                                </tr>
                            ) : (
                                pageItems.map((item) => {
                                    const status = stockStatus(item.quantity);
                                    return (
                                        <tr key={item.ID}>
                                            <td>
                                                <div className="admin-item-cell">
                                                    <div className="admin-item-thumb" aria-hidden="true" />
                                                    <span>{item.Name}</span>
                                                </div>
                                            </td>
                                            <td>{item.genreName || GENRE_LABEL[item.Genre] || 'Other'}</td>
                                            <td>{formatPrice(item.price)}</td>
                                            <td>{Number(item.quantity || 0)}</td>
                                            <td><span className={`admin-status ${status.className}`}>{status.label}</span></td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    {canManage ? (
                                                        <>
                                                            <button type="button" aria-label={`Edit ${item.Name}`} title="Edit item" onClick={() => navigate(`/admin/products/${item.ID}/edit`)}>✎</button>
                                                            <button type="button" aria-label={`Delete ${item.Name}`} title="Delete item" disabled={deletingId === item.ID} onClick={() => handleDelete(item)}>⌫</button>
                                                        </>
                                                    ) : <span className="panel-note">View only</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    <div className="admin-table-footer">
                        <span>Showing {filteredItems.length === 0 ? 0 : ((safePage - 1) * PAGE_SIZE) + 1} to {Math.min(safePage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items</span>
                        <div className="admin-pages">
                            <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
                            {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 3).map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={pageNumber === safePage ? 'active' : ''}
                                    onClick={() => setPage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export { AdminSidebar };
export default AdminProductManagement;
