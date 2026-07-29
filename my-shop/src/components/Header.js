import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

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
                    <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : undefined}>Products</NavLink>
                    <NavLink to="/categories" className={({ isActive }) => isActive ? 'active' : undefined}>Categories</NavLink>
                </nav>

                <div className="auth-cart">
                    <NavLink to="/login" className={({ isActive }) => `link-btn${isActive ? ' active' : ''}`}>Login</NavLink>
                    <NavLink to="/register" className={({ isActive }) => `register-btn${isActive ? ' active' : ''}`}>Register</NavLink>
                    <NavLink to="/cart" className={({ isActive }) => `cart-icon${isActive ? ' active' : ''}`} title="View cart" aria-label="Shopping cart">
                        Cart <span aria-hidden="true">🛒</span>
                    </NavLink>
                    <NavLink to="/account" className={({ isActive }) => `account-icon${isActive ? ' active' : ''}`} title="Your account" aria-label="Your account">
                        <span aria-hidden="true">👤</span>
                    </NavLink>
                </div>
            </div>
        </header>
    );
}

export default Header;
