import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from './utils/api';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductModal from './components/ProductModal';

const PAGE_SIZE = 9;
// Genre id -> label, from the teacher DB (1 Books, 2 Movies, 3 Games).
const GENRES = [
    { id: 1, label: 'Books' },
    { id: 2, label: 'Movies' },
    { id: 3, label: 'Games' },
];
const GENRE_ICON = { 1: '📚', 2: '🎬', 3: '🎮' };

export const genreIcon = (genreId) => GENRE_ICON[genreId] || '🛍️';

function ProductList({ pageTitle = 'All Product', showFilters = false }) {
    const [searchParams] = useSearchParams();
    const queryFromUrl = searchParams.get('q') || '';

    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [searchInput, setSearchInput] = useState(queryFromUrl);
    const [selectedGenres, setSelectedGenres] = useState(GENRES.map((g) => g.id));
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('relevance');
    const [currentPage, setCurrentPage] = useState(1);

    const [tempMinPrice, setTempMinPrice] = useState('');
    const [tempMaxPrice, setTempMaxPrice] = useState('');

    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await getProducts();
                setAllProducts(data);
                setError(false);
            } catch (err) {
                console.error('load error', err);
                setAllProducts([]);
                setError(true);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        setSearchInput(queryFromUrl);
    }, [queryFromUrl]);

    const genreStats = useMemo(() => {
        const stats = { 1: 0, 2: 0, 3: 0 };
        allProducts.forEach((p) => { if (stats[p.Genre] != null) stats[p.Genre]++; });
        return stats;
    }, [allProducts]);

    const getPrice = (p) => (typeof p.price === 'number' ? p.price : 0);
    const formatPrice = (p) =>
        p.price == null ? 'N/A' : (p.price === 0 ? 'Free' : `$${p.price.toFixed(2)}`);

    const filteredProducts = useMemo(() => {
        let result = [...allProducts];

        if (searchInput.trim() !== '') {
            const kw = searchInput.trim().toLowerCase();
            result = result.filter((p) =>
                p.Name?.toLowerCase().includes(kw) ||
                p.Author?.toLowerCase().includes(kw) ||
                p.Description?.toLowerCase().includes(kw)
            );
        }

        if (selectedGenres.length > 0) {
            result = result.filter((p) => selectedGenres.includes(p.Genre));
        }

        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        if (!isNaN(min)) result = result.filter((p) => getPrice(p) >= min);
        if (!isNaN(max)) result = result.filter((p) => getPrice(p) <= max);

        if (sortBy === 'price_asc') result.sort((a, b) => getPrice(a) - getPrice(b));
        else if (sortBy === 'price_desc') result.sort((a, b) => getPrice(b) - getPrice(a));
        else if (sortBy === 'name') result.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
        else result.sort((a, b) => (a.ID || 0) - (b.ID || 0));

        return result;
    }, [allProducts, searchInput, selectedGenres, minPrice, maxPrice, sortBy]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchInput, selectedGenres, minPrice, maxPrice, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageItems = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const applyPriceFilter = () => {
        setMinPrice(tempMinPrice);
        setMaxPrice(tempMaxPrice);
    };

    const handleClear = () => {
        setSearchInput('');
        setSelectedGenres(GENRES.map((g) => g.id));
        setTempMinPrice(''); setTempMaxPrice('');
        setMinPrice(''); setMaxPrice('');
        setSortBy('relevance');
    };

    const handleGenreChange = (id) => {
        setSelectedGenres((prev) =>
            prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
        );
    };

    const renderPagination = () => {
        if (loading || totalPages <= 1) return null;
        const pages = [];
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return (
            <div className="pagination" role="navigation" aria-label="Pagination">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page">‹</button>
                {pages.map((p) => (
                    <button key={p} className={p === safePage ? 'active' : ''} aria-current={p === safePage ? 'page' : undefined} onClick={() => setCurrentPage(p)}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page">›</button>
            </div>
        );
    };

    const renderProducts = () => {
        if (loading) return <div className="loading">Loading products…</div>;
        if (error) {
            return (
                <div className="no-results">
                    <h3>Couldn't reach the backend</h3>
                    <p>Make sure the course backend is running (docker compose up -d) on http://localhost:3001.</p>
                </div>
            );
        }
        if (filteredProducts.length === 0) {
            return (
                <div className="no-results">
                    <h3>No results found</h3>
                    <p>We couldn't find any products{searchInput ? ` matching "${searchInput}"` : ''} with the current filters.</p>
                    <button className="clear-filters-btn" onClick={handleClear}>Clear All Filters</button>
                </div>
            );
        }
        return (
            <>
                <div className="products-grid">
                    {pageItems.map((product) => (
                        <div key={product.ID} className="product-card">
                            <div className="product-img genre-thumb">
                                <span className="genre-emoji" aria-hidden="true">{genreIcon(product.Genre)}</span>
                            </div>
                            <div className="product-title">{product.Name}</div>
                            {product.Author && <div className="product-author">{product.Author}</div>}
                            <div className="product-desc">{product.Description?.substring(0, 90)}…</div>
                            <div className="product-card-footer">
                                <span className="product-price">{formatPrice(product)}</span>
                                <button className="view-details-btn" title={`View details for ${product.Name}`} onClick={() => setSelectedProduct(product)}>
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {renderPagination()}
            </>
        );
    };

    return (
        <div>
            <Header initialQuery={queryFromUrl} />

            <section className="search-results-section">
                <div className="container">
                    <h1 className="page-title">{pageTitle}</h1>
                    <div className="results-header">
                        <div className="results-summary">
                            {loading ? 'Loading…' : <>Showing {searchInput && <>results for <strong>"{searchInput}"</strong> </>}({filteredProducts.length} items)</>}
                        </div>
                        <div className="sort-by">
                            <label htmlFor="sort-select">Sort by: </label>
                            <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="relevance">Relevance</option>
                                <option value="name">Name (A–Z)</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    <div className={`results-wrapper ${showFilters ? '' : 'no-filters'}`}>
                        {showFilters && <aside className="filters">
                            <div className="filter-group">
                                <h3>Category</h3>
                                <div className="filter-options">
                                    {GENRES.map((g) => (
                                        <label key={g.id}>
                                            <input type="checkbox" checked={selectedGenres.includes(g.id)} onChange={() => handleGenreChange(g.id)} />{' '}
                                            {GENRE_ICON[g.id]} {g.label} ({genreStats[g.id]})
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group price-filter">
                                <h3>Price Range</h3>
                                <div className="price-inputs">
                                    <input type="number" placeholder="Min" aria-label="Minimum price" value={tempMinPrice} onChange={(e) => setTempMinPrice(e.target.value)} step="0.01" />
                                    <input type="number" placeholder="Max" aria-label="Maximum price" value={tempMaxPrice} onChange={(e) => setTempMaxPrice(e.target.value)} step="0.01" />
                                </div>
                                <button className="apply-btn" onClick={applyPriceFilter}>Apply</button>
                            </div>
                        </aside>}

                        <div className="results-content">{renderProducts()}</div>
                    </div>
                </div>
            </section>

            <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

            <Footer />
        </div>
    );
}

export default ProductList;
