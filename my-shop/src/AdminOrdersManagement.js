import React, { useEffect, useState } from 'react';
import { AdminSidebar } from './AdminProductManagement';
import { getAdminOrders, updateOrderDelivery } from './utils/api';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

function AdminOrdersManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [address, setAddress] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const loadOrders = async () => {
        setLoading(true);
        try {
            setOrders(await getAdminOrders());
            setMessage(null);
        } catch {
            setMessage({ type: 'error', text: 'Could not load orders from the database. Sign in as an admin and check the backend.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const startEdit = (order) => {
        setEditingId(order.id);
        setAddress({ ...order.address });
        setMessage(null);
    };

    const updateField = (field) => (event) => {
        setAddress((current) => ({ ...current, [field]: event.target.value }));
    };

    const saveDelivery = async (event) => {
        event.preventDefault();
        if (!/[A-Za-z]/.test(address.streetAddress) || !/\d/.test(address.streetAddress)) {
            setMessage({ type: 'error', text: 'Street address must contain letters and numbers.' });
            return;
        }
        if (!/^\d+$/.test(String(address.postCode))) {
            setMessage({ type: 'error', text: 'Postcode must contain numbers only.' });
            return;
        }

        setSaving(true);
        try {
            await updateOrderDelivery(editingId, address);
            setOrders((current) => current.map((order) => (
                order.id === editingId ? { ...order, address: { ...address } } : order
            )));
            setEditingId(null);
            setAddress(null);
            setMessage({ type: 'success', text: 'Order delivery details updated.' });
        } catch {
            setMessage({ type: 'error', text: 'Could not update this order.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-shell">
            <AdminSidebar active="orders" />
            <main className="admin-main">
                <div className="admin-page-head">
                    <div>
                        <h1>Order Management</h1>
                        <p>Review customer orders, items, totals, and delivery details.</p>
                    </div>
                    <button type="button" className="admin-light-btn" onClick={loadOrders} disabled={loading}>Refresh</button>
                </div>

                {message && <div className={`auth-message auth-message-${message.type}`} role="status">{message.text}</div>}

                <section className="admin-table-card">
                    <table className="admin-products-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Delivery</th>
                                <th>Total</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="admin-empty-row">Loading orders...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="6" className="admin-empty-row">No orders found.</td></tr>
                            ) : orders.map((order) => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td><strong>{order.customerName}</strong><br />{order.customerEmail}</td>
                                    <td>{order.lines.map((line) => <div key={`${order.id}-${line.stocktakeItemId}`}>{line.name} x{line.quantity}</div>)}</td>
                                    <td>{[order.address.streetAddress, order.address.suburb, order.address.state, order.address.postCode].filter(Boolean).join(', ')}</td>
                                    <td>${order.total.toFixed(2)}</td>
                                    <td><button type="button" className="admin-light-btn" onClick={() => startEdit(order)}>Edit delivery</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {editingId && address && (
                    <section className="admin-form-card admin-order-editor">
                        <h2 className="admin-form-title">Edit Order #{editingId} Delivery</h2>
                        <form className="admin-item-form" onSubmit={saveDelivery}>
                            <div className="admin-form-field">
                                <label htmlFor="order-street">Street Address</label>
                                <input id="order-street" value={address.streetAddress} onChange={updateField('streetAddress')} required />
                            </div>
                            <div className="admin-form-row">
                                <div className="admin-form-field">
                                    <label htmlFor="order-suburb">Suburb</label>
                                    <input id="order-suburb" value={address.suburb} onChange={updateField('suburb')} required />
                                </div>
                                <div className="admin-form-field">
                                    <label htmlFor="order-postcode">Postcode</label>
                                    <input id="order-postcode" value={address.postCode} onChange={updateField('postCode')} required />
                                </div>
                            </div>
                            <div className="admin-form-field">
                                <label htmlFor="order-state">State</label>
                                <select id="order-state" value={address.state} onChange={updateField('state')}>
                                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </div>
                            <div className="admin-form-actions">
                                <button type="button" className="admin-light-btn" onClick={() => { setEditingId(null); setAddress(null); }}>Cancel</button>
                                <button type="submit" className="admin-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Delivery'}</button>
                            </div>
                        </form>
                    </section>
                )}
            </main>
        </div>
    );
}

export default AdminOrdersManagement;
