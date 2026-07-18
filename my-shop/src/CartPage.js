import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { getCartItems, saveCartItems } from './utils/cart';

function CartPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState(getCartItems);

    const updateQty = (id, qty) => {
        const nextQty = Math.max(1, Number(qty || 1));
        const next = items.map((item) => item.ID === id ? { ...item, cartQty: nextQty } : item);
        setItems(next);
        saveCartItems(next);
    };

    const removeItem = (id) => {
        const next = items.filter((item) => item.ID !== id);
        setItems(next);
        saveCartItems(next);
    };

    const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * item.cartQty, 0), [items]);

    return (
        <div>
            <Header />
            <section className="account-section">
                <div className="container">
                    <div className="account-page-head">
                        <h1>Shopping Cart</h1>
                        <p>Review your selected items before checkout.</p>
                    </div>

                    {items.length === 0 ? (
                        <div className="no-results">
                            <h3>Your cart is empty</h3>
                            <p>Add books, movies, or games from the catalogue.</p>
                            <Link to="/products" className="clear-filters-btn">Browse Catalogue</Link>
                        </div>
                    ) : (
                        <div className="cart-layout">
                            <section className="account-panel">
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Category</th>
                                            <th>Price</th>
                                            <th>Qty</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.ID}>
                                                <td>{item.Name}</td>
                                                <td>{item.genreName || 'Catalogue'}</td>
                                                <td>${Number(item.price || 0).toFixed(2)}</td>
                                                <td>
                                                    <input className="cart-qty" type="number" min="1" value={item.cartQty} onChange={(event) => updateQty(item.ID, event.target.value)} />
                                                </td>
                                                <td><button type="button" className="link-btn" onClick={() => removeItem(item.ID)}>Remove</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>

                            <aside className="account-panel cart-summary">
                                <h3>Order Summary</h3>
                                <div className="cart-summary-row">
                                    <span>Total</span>
                                    <strong>${total.toFixed(2)}</strong>
                                </div>
                                <button type="button" className="auth-submit-btn" onClick={() => navigate('/checkout')}>Checkout</button>
                            </aside>
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default CartPage;
