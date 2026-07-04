import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Shared site header. `initialQuery` pre-fills the search box (used on the
// results page so the current keyword is shown, matching the wireframe).
function Header({ initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery);
    const navigate = useNavigate();

    const submitSearch = (e) => {
        e.preventDefault();
        navigate(`/products?q=${encodeURIComponent(query.trim())}`);
    };

    return (
        <header>
            <div className="container nav-wrapper">
                <Link to="/" className="logo">Entertainment Guild</Link>

                <form className="search-box" role="search" onSubmit={submitSearch}>
                    <span className="search-icon" aria-hidden="true">🔍</span>
                    <input
                        type="search"
                        className="search-bar"
                        placeholder="Search..."
                        aria-label="Search products"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>

                <nav className="nav-links" aria-label="Main navigation">
                    <Link to="/products">Products</Link>
                    <Link to="/products">Categories</Link>
                </nav>

                <div className="auth-cart">
                    <Link to="/login" className="link-btn">Login</Link>
                    <Link to="/register" className="register-btn">Register</Link>
                    <button type="button" className="cart-icon" title="View cart (coming soon)" aria-label="Shopping cart">
                        Cart <span aria-hidden="true">🛒</span>
                    </button>
                    <Link to="/account" className="account-icon" title="Your account" aria-label="Your account">
                        <span aria-hidden="true">👤</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default Header;
