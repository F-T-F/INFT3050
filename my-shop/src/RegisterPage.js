import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { registerCustomer } from './utils/api';
import { setCurrentUser } from './utils/session';
import { saveAddress } from './utils/cart';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
const EMPTY_FORM = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    streetAddress: '',
    suburb: '',
    postCode: '',
    state: 'NSW',
};

function RegisterPage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [status, setStatus] = useState(null); // { type, message }
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }
        if (!/[A-Za-z]/.test(form.streetAddress) || !/\d/.test(form.streetAddress)) {
            setStatus({ type: 'error', message: 'Street address must contain letters and numbers.' });
            return;
        }
        if (!/^\d+$/.test(form.postCode)) {
            setStatus({ type: 'error', message: 'Postcode must contain numbers only.' });
            return;
        }
        const address = {
            streetAddress: form.streetAddress,
            suburb: form.suburb,
            postCode: form.postCode,
            state: form.state,
        };
        setSubmitting(true);
        setStatus(null);
        try {
            const customer = await registerCustomer({
                name: form.name,
                email: form.email,
                password: form.password,
                address,
            });
            saveAddress(address);
            setCurrentUser(customer); // sign the new customer in
            setStatus({ type: 'success', message: 'Account created! Taking you to your profile…' });
            setTimeout(() => navigate('/account'), 900);
        } catch (err) {
            if (err.code === 'EXISTS') {
                setStatus({ type: 'error', message: 'An account with that email already exists.' });
            } else {
                setStatus({ type: 'error', message: 'Could not create the account. Is the backend running on :3001?' });
            }
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
                            <h1>Create Account</h1>
                        </div>

                        {status && (
                            <div className={`auth-message auth-message-${status.type}`} role="status">
                                {status.message}
                            </div>
                        )}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label htmlFor="name">Full Name</label>
                                <input id="name" type="text" placeholder="Your Name" value={form.name} onChange={handleChange('name')} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="email">Email Address</label>
                                <input id="email" type="email" placeholder="example@example.com" value={form.email} onChange={handleChange('email')} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="register-street">Street Address</label>
                                <input id="register-street" value={form.streetAddress} onChange={handleChange('streetAddress')} placeholder="221 Ring Road" required />
                            </div>
                            <div className="form-row">
                                <div className="form-field">
                                    <label htmlFor="register-suburb">Suburb</label>
                                    <input id="register-suburb" value={form.suburb} onChange={handleChange('suburb')} placeholder="Callaghan" required />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="register-postcode">Postcode</label>
                                    <input id="register-postcode" inputMode="numeric" value={form.postCode} onChange={handleChange('postCode')} placeholder="2308" required />
                                </div>
                            </div>
                            <div className="form-field">
                                <label htmlFor="register-state">State</label>
                                <select id="register-state" value={form.state} onChange={handleChange('state')} required>
                                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-field">
                                    <label htmlFor="password">Password</label>
                                    <input id="password" type="password" placeholder="Create a password" value={form.password} onChange={handleChange('password')} required />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <input id="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} required />
                                </div>
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create Account'}
                            </button>
                        </form>

                        <div className="auth-alt">
                            Already have an account? <Link to="/login">Login</Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default RegisterPage;
