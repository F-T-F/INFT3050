import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { resetCustomerPassword } from './utils/api';

function RecoveryPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (password.length < 4) {
            setMessage({ type: 'error', text: 'Password must contain at least 4 characters.' });
            return;
        }
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const updated = await resetCustomerPassword({ email, password });
            setMessage(updated
                ? { type: 'success', text: 'Password reset successfully. You can now sign in.' }
                : { type: 'error', text: 'No customer account was found for that email address.' });
            if (updated) {
                setPassword('');
                setConfirmPassword('');
            }
        } catch {
            setMessage({ type: 'error', text: 'Could not reset the password. Check that the backend is running.' });
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
                            <h1>Account Recovery</h1>
                            <p>Enter your customer email and choose a new password.</p>
                        </div>

                        {message && <div className={`auth-message auth-message-${message.type}`} role="status">{message.text}</div>}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label htmlFor="recovery-email">Email Address</label>
                                <input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="recovery-password">New Password</label>
                                <input id="recovery-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="recovery-confirm-password">Confirm New Password</label>
                                <input id="recovery-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={submitting}>{submitting ? 'Resetting...' : 'Reset Password'}</button>
                        </form>

                        <div className="auth-alt">
                            Remembered your details? <Link to="/login">Back to login</Link>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default RecoveryPage;
