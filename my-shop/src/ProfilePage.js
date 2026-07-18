import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { getCustomerOrders, getCustomerProfile, logout, getMe, updateCustomerOrder, updateCustomerProfile } from './utils/api';
import { getCurrentUser, clearCurrentUser, setCurrentUser } from './utils/session';
import { getSavedAddress, saveAddress } from './utils/cart';

const NAV_ITEMS = [
    { key: 'profile', icon: '👤', label: 'Profile' },
    { key: 'catalogue', icon: '📦', label: 'Catalogue', to: '/products' },
    { key: 'security', icon: '🔒', label: 'Security', to: '/recovery' },
];
const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

const validateAddress = (address) => {
    if (!/[A-Za-z]/.test(address.streetAddress) || !/\d/.test(address.streetAddress)) {
        return 'Street address must contain letters and numbers.';
    }
    if (!address.suburb.trim()) return 'Suburb is required.';
    if (!/^\d+$/.test(String(address.postCode))) return 'Postcode must contain numbers only.';
    if (!STATES.includes(address.state)) return 'Select a valid Australian state.';
    return null;
};

function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(getCurrentUser);
    const [details, setDetails] = useState({ name: user?.name || '', email: user?.email || '' });
    const [sessionValid, setSessionValid] = useState(true);
    const [address, setAddress] = useState(getSavedAddress);
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(Boolean(user?.isCustomer));
    const [ordersError, setOrdersError] = useState('');
    const [addressMessage, setAddressMessage] = useState(null);
    const [profileMessage, setProfileMessage] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [orderAddress, setOrderAddress] = useState(null);
    const [orderMessage, setOrderMessage] = useState(null);
    const [savingOrder, setSavingOrder] = useState(false);

    // Admins have an httpOnly cookie we can re-validate; customers (Patron
    // sign-in) don't, so skip the /me check for them.
    useEffect(() => {
        if (!user || user.isCustomer) return;
        let active = true;
        getMe().catch(() => { if (active) setSessionValid(false); });
        return () => { active = false; };
    }, [user]);

    useEffect(() => {
        if (!user?.isCustomer) return;
        let active = true;
        getCustomerProfile(user.id)
            .then(({ user: databaseUser, address: databaseAddress }) => {
                if (!active) return;
                setUser(databaseUser);
                setDetails({ name: databaseUser.name, email: databaseUser.email });
                setAddress(databaseAddress);
                setCurrentUser(databaseUser);
                saveAddress(databaseAddress);
            })
            .catch(() => {
                if (active) setProfileMessage({ type: 'error', text: 'Could not refresh your profile from the database.' });
            });
        return () => { active = false; };
    }, [user?.id, user?.isCustomer]);

    useEffect(() => {
        if (!user?.isCustomer) return;
        let active = true;
        setOrdersLoading(true);
        getCustomerOrders(user.id)
            .then((rows) => { if (active) setOrders(rows); })
            .catch(() => { if (active) setOrdersError('Could not load your orders from the database.'); })
            .finally(() => { if (active) setOrdersLoading(false); });
        return () => { active = false; };
    }, [user]);

    const handleLogout = async () => {
        await logout();
        clearCurrentUser();
        navigate('/');
    };

    const updateAddress = (field) => (event) => {
        setAddress((current) => ({ ...current, [field]: event.target.value }));
        setAddressMessage(null);
    };

    const updateDetails = (field) => (event) => {
        setDetails((current) => ({ ...current, [field]: event.target.value }));
        setProfileMessage(null);
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        if (!details.name.trim()) {
            setProfileMessage({ type: 'error', text: 'Name is required.' });
            return;
        }
        setSavingProfile(true);
        try {
            const updatedUser = await updateCustomerProfile({ id: user.id, ...details });
            setUser(updatedUser);
            setCurrentUser(updatedUser);
            setProfileMessage({ type: 'success', text: 'Personal details updated in the database.' });
        } catch (error) {
            setProfileMessage({
                type: 'error',
                text: error.code === 'EXISTS' ? 'That email address is already registered.' : 'Could not update your personal details.',
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleAddressSave = async (event) => {
        event.preventDefault();
        const validationError = validateAddress(address);
        if (validationError) {
            setAddressMessage({ type: 'error', text: validationError });
            return;
        }
        setSavingAddress(true);
        try {
            const updatedUser = await updateCustomerProfile({ id: user.id, ...details, address });
            setUser(updatedUser);
            setCurrentUser(updatedUser);
            saveAddress(address);
            setAddressMessage({ type: 'success', text: 'Address updated in the database.' });
        } catch (error) {
            setAddressMessage({
                type: 'error',
                text: error.code === 'EXISTS' ? 'That email address is already registered.' : 'Could not update your address.',
            });
        } finally {
            setSavingAddress(false);
        }
    };

    const startOrderEdit = (order) => {
        setEditingOrderId(order.id);
        setOrderAddress({ ...order.address, state: order.address.state || 'NSW' });
        setOrderMessage(null);
    };

    const updateOrderAddress = (field) => (event) => {
        setOrderAddress((current) => ({ ...current, [field]: event.target.value }));
        setOrderMessage(null);
    };

    const handleOrderSave = async (event) => {
        event.preventDefault();
        const validationError = validateAddress(orderAddress);
        if (validationError) {
            setOrderMessage({ type: 'error', text: validationError });
            return;
        }

        setSavingOrder(true);
        try {
            const updatedOrder = await updateCustomerOrder({
                orderId: editingOrderId,
                patronId: user.id,
                address: orderAddress,
            });
            setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
            setEditingOrderId(null);
            setOrderAddress(null);
            setOrderMessage({ type: 'success', text: `Order #${updatedOrder.id} delivery address updated.` });
        } catch (error) {
            setOrderMessage({
                type: 'error',
                text: error.code === 'FORBIDDEN'
                    ? 'You can only update your own orders.'
                    : 'Could not update this order.',
            });
        } finally {
            setSavingOrder(false);
        }
    };

    if (!user) {
        return (
            <div>
                <Header />
                <section className="account-section">
                    <div className="container">
                        <div className="no-results">
                            <h3>You're not signed in</h3>
                            <p>Sign in with your Guild staff account to view your profile.</p>
                        </div>
                    </div>
                </section>
                <Footer />
            </div>
        );
    }

    const initials = (user.username || user.name || '?').substring(0, 2).toUpperCase();

    return (
        <div>
            <Header />

            <section className="account-section">
                <div className="container account-layout">
                    <aside className="account-sidebar">
                        <div className="account-sidebar-head">
                            <h2>Account</h2>
                            <p>Manage Details</p>
                        </div>
                        <nav className="account-nav" aria-label="Account navigation">
                            {NAV_ITEMS.map((item) => (
                                item.to ? (
                                    <Link key={item.key} to={item.to} className="account-nav-item">
                                        <span className="account-nav-icon" aria-hidden="true">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ) : (
                                    <button key={item.key} type="button" className={`account-nav-item ${item.key === 'profile' ? 'active' : ''}`} aria-current={item.key === 'profile' ? 'page' : undefined} title={item.key === 'profile' ? undefined : `${item.label} (coming soon)`}>
                                        <span className="account-nav-icon" aria-hidden="true">{item.icon}</span>
                                        {item.label}
                                    </button>
                                )
                            ))}
                        </nav>
                        <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
                    </aside>

                    <div className="account-content">
                        <div className="account-page-head">
                            <h1>User Profile</h1>
                            <p>{user.isCustomer ? 'Your account details.' : 'Your Guild staff account details.'}</p>
                        </div>

                        {!sessionValid && (
                            <div className="auth-message auth-message-error" role="status">
                                Your session has expired. Please <Link to="/login">sign in again</Link>.
                            </div>
                        )}

                        <div className="account-panel">
                            <h3>Personal Details</h3>
                            {profileMessage && <div className={`auth-message auth-message-${profileMessage.type}`} role="status">{profileMessage.text}</div>}
                            <div className="personal-details">
                                <div className="avatar-block">
                                    <div className="avatar" aria-hidden="true">{initials}</div>
                                    {user.isAdmin && <span className="admin-badge">Admin</span>}
                                </div>
                                {user.isCustomer ? (
                                    <form className="personal-fields" onSubmit={handleProfileSave}>
                                        <div className="form-field">
                                            <label htmlFor="profile-name">Name</label>
                                            <input id="profile-name" type="text" value={details.name} onChange={updateDetails('name')} required />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="profile-email">Email Address</label>
                                            <input id="profile-email" type="email" value={details.email} onChange={updateDetails('email')} required />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="profile-role">Role</label>
                                            <input id="profile-role" type="text" value="Customer" readOnly />
                                        </div>
                                        <div className="panel-actions">
                                            <button type="submit" className="outline-btn" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Details'}</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="personal-fields">
                                        <div className="form-field">
                                            <label htmlFor="staff-username">Username</label>
                                            <input id="staff-username" type="text" value={user.username || ''} readOnly />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="staff-email">Email Address</label>
                                            <input id="staff-email" type="email" value={user.email || '—'} readOnly />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="staff-role">Role</label>
                                            <input id="staff-role" type="text" value={user.isAdmin ? 'Administrator' : 'Staff'} readOnly />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="account-panel">
                            <div className="panel-head">
                                <h3>{user.isCustomer ? 'Browse the Catalogue' : 'Catalogue Management'}</h3>
                                <Link to={user.isCustomer ? '/products' : '/admin/products'} className="link-btn">
                                    {user.isAdmin ? 'Open admin' : user.isCustomer ? 'Open catalogue' : 'Open staff view'}
                                </Link>
                            </div>
                            <p className="panel-note">
                                {user.isCustomer
                                    ? 'Browse books, movies and games in the Guild catalogue.'
                                    : user.isAdmin
                                        ? 'As an administrator you can add, edit and remove products.'
                                        : 'You can view product and account data.'}
                            </p>
                        </div>

                        {user.isCustomer && (
                            <div className="account-panel">
                                <div className="panel-head">
                                    <h3>Delivery Address</h3>
                                </div>
                                {addressMessage && <div className={`auth-message auth-message-${addressMessage.type}`} role="status">{addressMessage.text}</div>}
                                <form className="auth-form" onSubmit={handleAddressSave}>
                                    <div className="form-field">
                                        <label htmlFor="profile-street">Street Address</label>
                                        <input id="profile-street" value={address.streetAddress} onChange={updateAddress('streetAddress')} required />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="profile-suburb">Suburb</label>
                                            <input id="profile-suburb" value={address.suburb} onChange={updateAddress('suburb')} required />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="profile-postcode">Postcode</label>
                                            <input id="profile-postcode" value={address.postCode} onChange={updateAddress('postCode')} required />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="profile-state">State</label>
                                        <select id="profile-state" value={address.state} onChange={updateAddress('state')}>
                                            {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                        </select>
                                    </div>
                                    <div className="panel-actions">
                                        <button type="submit" className="outline-btn" disabled={savingAddress}>{savingAddress ? 'Saving...' : 'Save Address'}</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {user.isCustomer && (
                            <div className="account-panel">
                                <div className="panel-head">
                                    <h3>Order History</h3>
                                    <Link to="/cart" className="link-btn">Open cart</Link>
                                </div>
                                {orderMessage && <div className={`auth-message auth-message-${orderMessage.type}`} role="status">{orderMessage.text}</div>}
                                {ordersError && <div className="auth-message auth-message-error" role="status">{ordersError}</div>}
                                {ordersLoading ? (
                                    <p className="panel-note">Loading orders...</p>
                                ) : orders.length === 0 ? (
                                    <p className="panel-note">No orders yet.</p>
                                ) : (
                                    <table className="orders-table">
                                        <thead>
                                            <tr>
                                                <th>Order</th>
                                                <th>Items</th>
                                                <th>Delivery</th>
                                                <th>Total</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <React.Fragment key={order.id}>
                                                    <tr>
                                                        <td>{order.id}</td>
                                                        <td>{order.lines.map((line) => `${line.name} x${line.quantity}`).join(', ') || 'No items'}</td>
                                                        <td>{[order.address.streetAddress, order.address.suburb, order.address.state, order.address.postCode].filter(Boolean).join(', ')}</td>
                                                        <td>${Number(order.total || 0).toFixed(2)}</td>
                                                        <td><button type="button" className="link-btn" onClick={() => startOrderEdit(order)}>Edit delivery</button></td>
                                                    </tr>
                                                    {editingOrderId === order.id && (
                                                        <tr className="order-edit-row">
                                                            <td colSpan="5">
                                                                <form className="order-edit-form" onSubmit={handleOrderSave}>
                                                                    <div className="form-field order-edit-street">
                                                                        <label htmlFor={`order-${order.id}-street`}>Street Address</label>
                                                                        <input id={`order-${order.id}-street`} value={orderAddress.streetAddress} onChange={updateOrderAddress('streetAddress')} required />
                                                                    </div>
                                                                    <div className="form-field">
                                                                        <label htmlFor={`order-${order.id}-suburb`}>Suburb</label>
                                                                        <input id={`order-${order.id}-suburb`} value={orderAddress.suburb} onChange={updateOrderAddress('suburb')} required />
                                                                    </div>
                                                                    <div className="form-field">
                                                                        <label htmlFor={`order-${order.id}-postcode`}>Postcode</label>
                                                                        <input id={`order-${order.id}-postcode`} inputMode="numeric" value={orderAddress.postCode} onChange={updateOrderAddress('postCode')} required />
                                                                    </div>
                                                                    <div className="form-field">
                                                                        <label htmlFor={`order-${order.id}-state`}>State</label>
                                                                        <select id={`order-${order.id}-state`} value={orderAddress.state} onChange={updateOrderAddress('state')}>
                                                                            {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="order-edit-actions">
                                                                        <button type="button" className="admin-light-btn" onClick={() => { setEditingOrderId(null); setOrderAddress(null); }}>Cancel</button>
                                                                        <button type="submit" className="admin-primary-btn" disabled={savingOrder}>{savingOrder ? 'Saving...' : 'Save'}</button>
                                                                    </div>
                                                                </form>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default ProfilePage;
