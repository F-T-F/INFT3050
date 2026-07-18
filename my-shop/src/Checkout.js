import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { createOrder } from './utils/api';
import { clearCart, getCartItems, getSavedAddress, saveAddress } from './utils/cart';
import { getCurrentUser } from './utils/session';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
const PAYMENT_ICONS = [
    { src: '/payment-icons/visa.png', alt: 'Visa' },
    { src: '/payment-icons/mastercard.png', alt: 'Mastercard' },
    { src: '/payment-icons/amex.png', alt: 'American Express' },
    { src: '/payment-icons/jcb.png', alt: 'JCB' },
    { src: '/payment-icons/unionpay.png', alt: 'UnionPay' },
];
const EMPTY_PAYMENT = {
    cardOwner: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
};

const cleanCardNumber = (value) => value.replace(/\D/g, '');

const isFutureExpiry = (expiry) => {
    const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const expiryDate = new Date(year, month, 0, 23, 59, 59);
    return expiryDate >= new Date();
};

function CheckoutPage() {
    const navigate = useNavigate();
    const [items] = useState(getCartItems);
    const [address, setAddress] = useState(getSavedAddress);
    const [payment, setPayment] = useState(EMPTY_PAYMENT);
    const [paymentResult, setPaymentResult] = useState('approved');
    const [message, setMessage] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [customer] = useState(getCurrentUser);

    const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * item.cartQty, 0), [items]);

    const updateAddress = (field) => (event) => {
        setAddress((current) => ({ ...current, [field]: event.target.value }));
        setMessage(null);
    };

    const updatePayment = (field) => (event) => {
        setPayment((current) => ({ ...current, [field]: event.target.value }));
        setMessage(null);
    };

    const validate = () => {
        if (!address.streetAddress || !/[A-Za-z]/.test(address.streetAddress) || !/\d/.test(address.streetAddress)) {
            return 'Street address must contain letters and numbers.';
        }
        if (!address.suburb) return 'Suburb is required.';
        if (!/^\d+$/.test(String(address.postCode))) return 'Postcode must contain numbers only.';
        if (!address.state) return 'State is required.';
        if (!payment.cardOwner.trim()) return 'Cardholder name is required.';
        const cardNumber = cleanCardNumber(payment.cardNumber);
        if (cardNumber.length < 13 || cardNumber.length > 19) return 'Card number must contain 13 to 19 digits.';
        if (!isFutureExpiry(payment.expiry.trim())) return 'Expiry must be MM/YY and cannot be expired.';
        if (!/^\d{3,4}$/.test(payment.cvv.trim())) return 'CVV must contain 3 or 4 digits.';
        return null;
    };

    const completeOrder = async () => {
        if (paymentResult === 'timeout') {
            setMessage({ type: 'error', text: 'Payment timed out. Please try again.' });
            return;
        }
        if (paymentResult === 'declined') {
            setMessage({ type: 'error', text: 'Payment declined. Use another payment method.' });
            return;
        }

        if (!customer?.isCustomer) {
            setMessage({ type: 'error', text: 'Please sign in with a customer account before placing an order.' });
            return;
        }

        setSubmitting(true);
        try {
            const order = await createOrder({
                customer,
                address,
                items,
                payment: {
                    cardOwner: payment.cardOwner,
                    expiry: payment.expiry,
                    last4: cleanCardNumber(payment.cardNumber).slice(-4),
                },
            });
            saveAddress(address);
            clearCart();
            setMessage({ type: 'success', text: `Order #${order.OrderID} placed successfully.` });
            setTimeout(() => navigate('/account'), 900);
        } catch {
            setMessage({ type: 'error', text: 'Could not save this order to the database. Check that the backend is running and try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (items.length === 0) {
            setMessage({ type: 'error', text: 'Your cart is empty.' });
            return;
        }
        const error = validate();
        if (error) {
            setMessage({ type: 'error', text: error });
            return;
        }
        await completeOrder();
    };

    return (
        <div>
            <Header />
            <section className="auth-section">
                <div className="container">
                    <div className="auth-card">
                        <div className="auth-card-header">
                            <h1>Checkout</h1>
                            <p>Confirm delivery details and complete a virtual credit card payment.</p>
                        </div>

                        {message && <div className={`auth-message auth-message-${message.type}`} role="status">{message.text}</div>}

                        {items.length === 0 ? (
                            <div className="no-results">
                                <h3>Your cart is empty</h3>
                                <p>Add items before checkout.</p>
                                <Link to="/products" className="clear-filters-btn">Browse Catalogue</Link>
                            </div>
                        ) : (
                            <form className="auth-form" onSubmit={handleSubmit}>
                                <div className="form-field">
                                    <label htmlFor="checkout-street">Street Address</label>
                                    <input id="checkout-street" value={address.streetAddress} onChange={updateAddress('streetAddress')} required />
                                </div>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label htmlFor="checkout-suburb">Suburb</label>
                                        <input id="checkout-suburb" value={address.suburb} onChange={updateAddress('suburb')} required />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="checkout-postcode">Postcode</label>
                                        <input id="checkout-postcode" value={address.postCode} onChange={updateAddress('postCode')} required />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label htmlFor="checkout-state">State</label>
                                        <select id="checkout-state" value={address.state} onChange={updateAddress('state')} required>
                                            {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="payment-result">Payment Test</label>
                                        <select id="payment-result" value={paymentResult} onChange={(event) => setPaymentResult(event.target.value)}>
                                            <option value="approved">Approved</option>
                                            <option value="timeout">Timed out</option>
                                            <option value="declined">Declined</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="checkout-payment-box">
                                    <h3>Virtual Credit Card</h3>
                                    <p>No real payment is taken. Use the test result above to simulate approved, timed out, or declined payments.</p>
                                    <div className="form-field">
                                        <label htmlFor="card-owner">Cardholder Name</label>
                                        <input id="card-owner" value={payment.cardOwner} onChange={updatePayment('cardOwner')} placeholder="Jane Citizen" required />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="card-number">Card Number</label>
                                        <input id="card-number" inputMode="numeric" value={payment.cardNumber} onChange={updatePayment('cardNumber')} placeholder="4111 1111 1111 1111" required />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="card-expiry">Expiry</label>
                                            <input id="card-expiry" value={payment.expiry} onChange={updatePayment('expiry')} placeholder="12/30" required />
                                        </div>
                                        <div className="form-field">
                                            <label htmlFor="card-cvv">CVV</label>
                                            <input id="card-cvv" inputMode="numeric" value={payment.cvv} onChange={updatePayment('cvv')} placeholder="123" required />
                                        </div>
                                    </div>
                                    <div className="payment-card-logos" aria-label="Accepted card types">
                                        {PAYMENT_ICONS.map((icon) => (
                                            <div className="payment-card-logo" key={icon.alt}>
                                                <img src={icon.src} alt={icon.alt} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="account-panel checkout-summary">
                                    <strong>Total: ${total.toFixed(2)}</strong>
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={submitting}>
                                    {submitting ? 'Saving Order...' : 'Place Order'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default CheckoutPage;
