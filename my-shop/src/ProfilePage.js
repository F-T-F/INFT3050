import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { logout, getMe } from './utils/api';
import { getCurrentUser, clearCurrentUser } from './utils/session';

const NAV_ITEMS = [
    { key: 'profile', icon: '👤', label: 'Profile' },
    { key: 'catalogue', icon: '📦', label: 'Catalogue' },
    { key: 'security', icon: '🔒', label: 'Security' },
];

function ProfilePage() {
    const navigate = useNavigate();
    const [user] = useState(getCurrentUser);
    const [sessionValid, setSessionValid] = useState(true);

    // Admins have an httpOnly cookie we can re-validate; customers (Patron
    // sign-in) don't, so skip the /me check for them.
    useEffect(() => {
        if (!user || user.isCustomer) return;
        let active = true;
        getMe().catch(() => { if (active) setSessionValid(false); });
        return () => { active = false; };
    }, [user]);

    const handleLogout = async () => {
        await logout();
        clearCurrentUser();
        navigate('/');
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
                                item.key === 'catalogue' ? (
                                    <Link key={item.key} to="/products" className="account-nav-item">
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
                            <div className="personal-details">
                                <div className="avatar-block">
                                    <div className="avatar" aria-hidden="true">{initials}</div>
                                    {user.isAdmin && <span className="admin-badge">Admin</span>}
                                </div>
                                <div className="personal-fields">
                                    <div className="form-field">
                                        <label>{user.isCustomer ? 'Name' : 'Username'}</label>
                                        <input type="text" value={user.username || user.name || ''} readOnly />
                                    </div>
                                    <div className="form-field">
                                        <label>Email Address</label>
                                        <input type="email" value={user.email || '—'} readOnly />
                                    </div>
                                    <div className="form-field">
                                        <label>Role</label>
                                        <input type="text" value={user.isAdmin ? 'Administrator' : user.isCustomer ? 'Customer' : 'Staff'} readOnly />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="account-panel">
                            <div className="panel-head">
                                <h3>{user.isCustomer ? 'Browse the Catalogue' : 'Catalogue Management'}</h3>
                                <Link to="/products" className="link-btn">Open catalogue</Link>
                            </div>
                            <p className="panel-note">
                                {user.isCustomer
                                    ? 'Browse books, movies and games in the Guild catalogue.'
                                    : user.isAdmin
                                        ? 'As an administrator you can add, edit and remove products.'
                                        : 'You can browse and update product data.'}
                            </p>
                        </div>

                        <div className="account-panel">
                            <div className="panel-head">
                                <h3>Account Security</h3>
                                <button type="button" className="link-btn" title="Account recovery (coming soon)">Account Recovery</button>
                            </div>
                            <p className="panel-note">Manage your password and security settings.</p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default ProfilePage;
