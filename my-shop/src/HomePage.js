import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from './utils/api';
import { genreIcon } from './ProductList';
import Header from './components/Header';
import Footer from './components/Footer';

function HomePage() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const all = await getProducts();
                setFeatured(all.slice(0, 4));
            } catch (err) {
                console.error('loading error', err);
                setFeatured([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const formatPrice = (price) => {
        if (price == null) return '';
        return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    };

    const Card = ({ product, variant }) => (
        <div className={`feat-card ${variant}`}>
            <div className="feat-img genre-thumb">
                <span className="genre-emoji" aria-hidden="true">{genreIcon(product.Genre)}</span>
            </div>
            <div className="feat-body">
                <div className="product-title">{product.Name}</div>
                {variant === 'wide' && (
                    <div className="product-desc">{product.Description?.substring(0, 90)}…</div>
                )}
                <div className="product-price">{formatPrice(product.price)}</div>
            </div>
        </div>
    );

    const renderFeatured = () => {
        if (loading) return <div className="loading">Loading featured inventory…</div>;
        if (featured.length === 0) {
            return <div className="no-results"><p>No products available. Is the backend running on :3001?</p></div>;
        }

        const [main, ...rest] = featured;
        const smalls = rest.slice(0, 2);
        const wide = rest[2];

        return (
            <div className="featured-grid">
                <div className="featured-main feat-card">
                    <div className="feat-img feat-img-lg genre-thumb">
                        <span className="genre-emoji-lg" aria-hidden="true">{genreIcon(main.Genre)}</span>
                    </div>
                    <div className="feat-body">
                        <div className="product-title">{main.Name}</div>
                        {main.Author && <div className="product-author">{main.Author}</div>}
                        <div className="product-desc">{main.Description?.substring(0, 120)}…</div>
                        <div className="product-price">{formatPrice(main.price)}</div>
                        <button className="details-btn primary-btn" onClick={() => navigate('/products')}>Browse Catalogue</button>
                    </div>
                </div>

                <div className="featured-side">
                    <div className="featured-side-top">
                        {smalls.map((p) => <Card key={p.ID} product={p} variant="small" />)}
                    </div>
                    {wide && <Card product={wide} variant="wide" />}
                </div>
            </div>
        );
    };

    return (
        <div>
            <Header />

            <section className="hero-section">
                <div className="container">
                    <div className="hero-banner">
                        <div className="hero-card">
                            <h1>The Entertainment Guild</h1>
                            <p>Books, movies and games — browse our full catalogue and find your next favourite.</p>
                            <button className="primary-btn" onClick={() => navigate('/products')}>Browse Catalogue</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="featured-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Featured Inventory</h2>
                        <Link to="/products" className="view-all">View All</Link>
                    </div>
                    {renderFeatured()}
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default HomePage;
