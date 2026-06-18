import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from './utils/api';
import Header from './components/Header';
import Footer from './components/Footer';

function HomePage() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const all = await getProducts('');
                setFeatured(all.slice(0, 4));
            } catch (err) {
                console.error('loading error', err);
                setFeatured([]);
            } finally {
                setLoading(false);
            }
        };
        fetchFeatured();
    }, []);

    const formatPrice = (price) => {
        const num = typeof price === 'number' ? price : parseFloat(price);
        if (isNaN(num)) return '$0.00';
        return num === 0 ? 'Free' : `$${num.toFixed(2)}`;
    };

    // Small card used in the right-hand column of the featured grid.
    const Card = ({ product, variant }) => (
        <div className={`feat-card ${variant}`}>
            <div className="feat-img">
                {product.pic_url
                    ? <img src={product.pic_url} alt={product.title} />
                    : <span className="img-placeholder" aria-hidden="true">No image</span>}
            </div>
            <div className="feat-body">
                <div className="product-title">{product.title}</div>
                {variant !== 'wide' && (
                    <div className="product-price">{formatPrice(product.price)}</div>
                )}
                {variant === 'wide' && (
                    <>
                        <div className="product-desc">{product.description?.substring(0, 90)}...</div>
                        <div className="product-price">{formatPrice(product.price)}</div>
                    </>
                )}
            </div>
        </div>
    );

    const renderFeatured = () => {
        if (loading) {
            return <div className="loading">Loading featured inventory…</div>;
        }
        if (featured.length === 0) {
            return <div className="no-results">No featured products available.</div>;
        }

        const [main, ...rest] = featured;
        const smalls = rest.slice(0, 2);
        const wide = rest[2];

        return (
            <div className="featured-grid">
                <div className="featured-main feat-card">
                    <div className="feat-img feat-img-lg">
                        {main.pic_url
                            ? <img src={main.pic_url} alt={main.title} />
                            : <span className="img-placeholder" aria-hidden="true">No image</span>}
                    </div>
                    <div className="feat-body">
                        <div className="product-title">{main.title}</div>
                        <div className="product-desc">{main.description?.substring(0, 120)}...</div>
                        <div className="product-price">{formatPrice(main.price)}</div>
                        <button className="details-btn" onClick={() => navigate('/products')}>Details</button>
                    </div>
                </div>

                <div className="featured-side">
                    <div className="featured-side-top">
                        {smalls.map((p) => <Card key={p.Id} product={p} variant="small" />)}
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
                            <h1>Hero Content Anchor</h1>
                            <p>Structural block reserved for primary value proposition and call to action.</p>
                            <button className="primary-btn" onClick={() => navigate('/products')}>Primary Action</button>
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
