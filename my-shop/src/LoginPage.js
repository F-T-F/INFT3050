import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { login, loginPatron } from './utils/api';
import { setCurrentUser } from './utils/session';

function LoginPage() {
    const [loginType, setLoginType] = useState('customer');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState(null); // { type, message }
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const isAdminLogin = loginType === 'admin';

    const switchLoginType = (type) => {
        setLoginType(type);
        setStatus(null);
        setPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);
        try {
            if (isAdminLogin) {
                const staffUser = await login(username, password);
                setCurrentUser({ ...staffUser, isCustomer: false });
                setStatus({ type: 'success', message: `Welcome, ${staffUser.username || 'admin'}! Redirecting…` });
                setTimeout(() => navigate('/admin/products'), 700);
                return;
            }

            const customer = await loginPatron(email, password);
            if (!customer) {
                setStatus({ type: 'error', message: 'Incorrect email or password.' });
                return;
            }
            setCurrentUser(customer);
            setStatus({ type: 'success', message: `Welcome, ${customer.name || 'back'}! Redirecting…` });
            setTimeout(() => navigate('/account'), 700);
        } catch (err) {
            setStatus({
                type: 'error',
                message: isAdminLogin
                    ? 'Could not sign in. Check the staff username and password.'
                    : 'Could not sign in. Is the backend running on :3001?',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <Header />

            <section className="auth-section">
                <div className="container">
                    <div className="auth-card auth-card-narrow">
                        <div className="auth-card-header">
                            <h1>{isAdminLogin ? 'Staff / Admin Login' : 'Login'}</h1>
                            <p>
                                {isAdminLogin
                                    ? 'Sign in with your Guild staff or administrator account.'
                                    : 'Login to your account to view your profile and orders.'}
                            </p>
                        </div>

                        {status && (
                            <div className={`auth-message auth-message-${status.type}`} role="status">
                                {status.message}
                            </div>
                        )}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            {isAdminLogin ? (
                                <div className="form-field">
                                    <label htmlFor="username">Username</label>
                                    <input id="username" type="text" placeholder="adminAccount" value={username} onChange={(e) => setUsername(e.target.value)} required />
                                </div>
                            ) : (
                                <div className="form-field">
                                    <label htmlFor="email">Email Address</label>
                                    <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            )}
                            <div className="form-field">
                                <label htmlFor="password">Password</label>
                                <input id="password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            {!isAdminLogin && (
                                <Link to="/recovery" className="auth-forgot-link">Forgot password?</Link>
                            )}
                            <button type="submit" className="auth-submit-btn" disabled={submitting}>
                                {submitting ? 'Signing in…' : isAdminLogin ? 'Staff / Admin Sign In' : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-alt">
                            {isAdminLogin ? (
                                <>
                                    Customer account?{' '}
                                    <button type="button" className="auth-inline-btn" onClick={() => switchLoginType('customer')}>
                                        Customer login
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don't have an account? <Link to="/register">Create one</Link>
                                    <div className="auth-admin-option">
                                        <button type="button" className="auth-inline-btn" onClick={() => switchLoginType('admin')}>
                                            Staff / Admin login
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default LoginPage;
