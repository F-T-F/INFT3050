import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminSidebar } from './AdminProductManagement';
import { createProduct, getAdminProduct, getSources, getSubgenreMaps, updateProduct } from './utils/api';
import { getCurrentUser } from './utils/session';

const EMPTY_ITEM = {
    name: '',
    category: '1',
    subGenre: '1',
    author: '',
    price: '',
    stock: '',
    sourceId: '1',
    published: '',
    description: '',
};

function AdminProductForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);
    const [form, setForm] = useState(EMPTY_ITEM);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [subgenreMaps, setSubgenreMaps] = useState({});
    const [sources, setSources] = useState([]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [maps, sourceRows] = await Promise.all([getSubgenreMaps(), getSources()]);
                if (!active) return;
                setSubgenreMaps(maps);
                setSources(sourceRows);
            } catch {
                if (active) {
                    setSubgenreMaps({});
                    setSources([]);
                }
            }
        })();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!isEditing) return;
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const product = await getAdminProduct(id);
                if (!active) return;
                setForm({
                    name: product.Name || '',
                    category: String(product.Genre || 1),
                    subGenre: String(product.SubGenre || 1),
                    author: product.Author || '',
                    price: product.price != null ? String(product.price) : '',
                    stock: product.quantity != null ? String(product.quantity) : '',
                    sourceId: String(product.sourceId || 1),
                    published: product.Published ? product.Published.slice(0, 10) : '',
                    description: product.Description || '',
                });
                setMessage(null);
            } catch {
                if (active) setMessage({ type: 'error', text: 'Could not load this item for editing.' });
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [id, isEditing]);

    const updateField = (field) => (event) => {
        const value = event.target.value;
        setForm((current) => {
            if (field === 'category') {
                const nextMap = subgenreMaps[value] || {};
                const firstSubGenre = Object.keys(nextMap)[0] || '1';
                return { ...current, category: value, subGenre: firstSubGenre };
            }
            return { ...current, [field]: value };
        });
        setMessage(null);
    };

    const currentSubgenres = subgenreMaps[form.category] || {};

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const user = getCurrentUser();
            const username = user?.username || 'adminAccount';
            if (isEditing) {
                await updateProduct(id, form, username);
                setMessage({ type: 'success', text: 'Item updated successfully.' });
            } else {
                await createProduct(form, username);
                setMessage({ type: 'success', text: 'Item created successfully.' });
            }
            setTimeout(() => navigate('/admin/products'), 600);
        } catch {
            setMessage({ type: 'error', text: 'Could not save this item. Check that you are logged in as an admin.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-shell">
            <AdminSidebar />

            <main className="admin-main">
                <div className="admin-page-head">
                    <div>
                        <h1>{isEditing ? 'Edit Item' : 'Add New Item'}</h1>
                        <p>{isEditing ? 'Update catalogue, price, and stock details.' : 'Create a catalogue item with category, price, and stock details.'}</p>
                    </div>
                    <Link to="/admin/products" className="admin-light-btn">Back to Items</Link>
                </div>

                <section className="admin-form-card">
                    {message && <div className={`auth-message auth-message-${message.type}`} role="status">{message.text}</div>}

                    {loading ? (
                        <div className="loading">Loading item...</div>
                    ) : (
                    <form className="admin-item-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="item-name">Item Name</label>
                                <input id="item-name" value={form.name} onChange={updateField('name')} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="item-category">Category</label>
                                <select id="item-category" value={form.category} onChange={updateField('category')} required>
                                    <option value="1">Books</option>
                                    <option value="2">Movies</option>
                                    <option value="3">Games</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="item-subgenre">SubGenre ID</label>
                                <select id="item-subgenre" value={form.subGenre} onChange={updateField('subGenre')} required>
                                    {Object.keys(currentSubgenres).length === 0 ? (
                                        <option value={form.subGenre}>{form.subGenre}</option>
                                    ) : (
                                        Object.entries(currentSubgenres).map(([id, name]) => <option key={id} value={id}>{name}</option>)
                                    )}
                                </select>
                            </div>
                            <div className="form-field">
                                <label htmlFor="item-author">Author / Director / Publisher</label>
                                <input id="item-author" value={form.author} onChange={updateField('author')} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="item-price">Price</label>
                                <input id="item-price" type="number" min="0" step="0.01" value={form.price} onChange={updateField('price')} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="item-stock">Stock</label>
                                <input id="item-stock" type="number" min="0" step="1" value={form.stock} onChange={updateField('stock')} required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="item-source">Source ID</label>
                                <select id="item-source" value={form.sourceId} onChange={updateField('sourceId')} required>
                                    {sources.length === 0 ? (
                                        <option value={form.sourceId}>{form.sourceId}</option>
                                    ) : (
                                        sources.map((source) => <option key={source.Sourceid} value={source.Sourceid}>{source.SourceName}</option>)
                                    )}
                                </select>
                            </div>
                            <div className="form-field">
                                <label htmlFor="item-published">Published Date</label>
                                <input id="item-published" type="date" value={form.published} onChange={updateField('published')} />
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="item-description">Description</label>
                            <textarea id="item-description" value={form.description} onChange={updateField('description')} rows="6" required />
                        </div>

                        <div className="admin-form-actions">
                            <Link to="/admin/products" className="admin-light-btn">Cancel</Link>
                            <button type="submit" className="admin-primary-btn" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Item'}
                            </button>
                        </div>
                    </form>
                    )}
                </section>
            </main>
        </div>
    );
}

export default AdminProductForm;
