import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { loginPatron } from './utils/api';
import { setCurrentUser } from './utils/session';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState(null); // { type, message }
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);
        try {
            const customer = await loginPatron(email, password);
            if (!customer) {
                setStatus({ type: 'error', message: 'Incorrect email or password.' });
                return;
            }
            setCurrentUser(customer);
            setStatus({ type: 'success', message: `Welcome, ${customer.name || 'back'}! Redirecting…` });
            setTimeout(() => navigate('/account'), 700);
        } catch (err) {
            setStatus({ type: 'error', message: 'Could not sign in. Is the backend running on :3001?' });
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
                            <h1>Login</h1>
                            <p>Login to your account to view your profile and orders.</p>
                        </div>

                        {status && (
                            <div className={`auth-message auth-message-${status.type}`} role="status">
                                {status.message}
                            </div>
                        )}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label htmlFor="email">Email Address</label>
                                <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="password">Password</label>
                                <input id="password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={submitting}>
                                {submitting ? 'Signing in…' : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-alt">
                            Don't have an account? <Link to="/register">Create one</Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default LoginPage;
