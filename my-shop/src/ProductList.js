import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from './utils/api';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductModal from './components/ProductModal';

const PAGE_SIZE = 8;
const ALL_CATEGORIES = ['Digital Assets', 'Physical Prints', 'Subscriptions'];

function ProductList() {
    const [searchParams] = useSearchParams();
    const queryFromUrl = searchParams.get('q') || '';

    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState(queryFromUrl);
    const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORIES]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('relevance');
    const [currentPage, setCurrentPage] = useState(1);

    const [tempMinPrice, setTempMinPrice] = useState('');
    const [tempMaxPrice, setTempMaxPrice] = useState('');

    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        const fetchAllProducts = async () => {
            setLoading(true);
            try {
                const data = await getProducts('');
                setAllProducts(data);
            } catch (err) {
                console.error('load error', err);
                setAllProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAllProducts();
    }, []);

    // Keep the body filter in sync when the header search changes the URL.
    useEffect(() => {
        setSearchInput(queryFromUrl);
    }, [queryFromUrl]);

    const totalCategoryStats = useMemo(() => {
        const stats = { 'Digital Assets': 0, 'Physical Prints': 0, 'Subscriptions': 0 };
        allProducts.forEach((product) => {
            const cat = product.category || product.Category;
            if (Object.prototype.hasOwnProperty.call(stats, cat)) stats[cat]++;
        });
        return stats;
    }, [allProducts]);

    const getProductPrice = (product) => {
        const price = product.price;
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const num = parseFloat(price);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    const formatPrice = (num) => (num === 0 ? 'Free' : `$${num.toFixed(2)}`);

    const filteredProducts = useMemo(() => {
        let result = [...allProducts];

        if (searchInput.trim() !== '') {
            const keyword = searchInput.trim().toLowerCase();
            result = result.filter((product) =>
                product.title?.toLowerCase().includes(keyword) ||
                product.description?.toLowerCase().includes(keyword)
            );
        }

        if (selectedCategories.length > 0) {
            result = result.filter((product) => {
                const cat = product.category || product.Category;
                return selectedCategories.includes(cat);
            });
        }

        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        if (!isNaN(min)) result = result.filter((p) => getProductPrice(p) >= min);
        if (!isNaN(max)) result = result.filter((p) => getProductPrice(p) <= max);

        if (sortBy === 'price_asc') {
            result.sort((a, b) => getProductPrice(a) - getProductPrice(b));
        } else if (sortBy === 'price_desc') {
            result.sort((a, b) => getProductPrice(b) - getProductPrice(a));
        } else {
            result.sort((a, b) => (b.Id || 0) - (a.Id || 0));
        }

        return result;
    }, [allProducts, searchInput, selectedCategories, minPrice, maxPrice, sortBy]);

    // Whenever the filter result changes, jump back to the first page.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchInput, selectedCategories, minPrice, maxPrice, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageItems = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const applyPriceFilter = () => {
        setMinPrice(tempMinPrice);
        setMaxPrice(tempMaxPrice);
    };

    const handleClear = () => {
        setSearchInput('');
        setSelectedCategories([...ALL_CATEGORIES]);
        setTempMinPrice('');
        setTempMaxPrice('');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('relevance');
    };

    const handleCategoryChange = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
    };

    const renderPagination = () => {
        if (loading || totalPages <= 1) return null;
        const pages = [];
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return (
            <div className="pagination" role="navigation" aria-label="Pagination">
                <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                >‹</button>
                {pages.map((p) => (
                    <button
                        key={p}
                        className={p === safePage ? 'active' : ''}
                        aria-current={p === safePage ? 'page' : undefined}
                        onClick={() => setCurrentPage(p)}
                    >{p}</button>
                ))}
                <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                >›</button>
            </div>
        );
    };

    const renderProducts = () => {
        if (loading) return <div className="loading">Loading products…</div>;
        if (filteredProducts.length === 0) {
            return (
                <div className="no-results">
                    <h3>No results found</h3>
                    <p>
                        We couldn't find any products
                        {searchInput ? ` matching "${searchInput}"` : ''} with the current filters applied.
                    </p>
                    <button className="clear-filters-btn" onClick={handleClear}>Clear All Filters</button>
                </div>
            );
        }
        return (
            <>
                <div className="products-grid">
                    {pageItems.map((product) => {
                        const priceNum = getProductPrice(product);
                        return (
                            <div key={product.Id} className="product-card">
                                <div className="product-img">
                                    {product.pic_url
                                        ? <img src={product.pic_url} alt={product.title} />
                                        : <span className="img-placeholder" aria-hidden="true">IMG_PLACEHOLDER</span>}
                                </div>
                                <div className="product-title">{product.title}</div>
                                <div className="product-desc">{product.description?.substring(0, 80)}...</div>
                                <div className="product-card-footer">
                                    <span className="product-price">{formatPrice(priceNum)}</span>
                                    <button
                                        className="view-details-btn"
                                        title={`View details for ${product.title}`}
                                        onClick={() => setSelectedProduct(product)}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
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
                    <h1 className="page-title">Search Results</h1>
                    <div className="results-header">
                        <div className="results-summary">
                            {loading
                                ? 'Loading…'
                                : <>Showing {searchInput && <>results for <strong>"{searchInput}"</strong> </>}({filteredProducts.length} items)</>}
                        </div>
                        <div className="sort-by">
                            <label htmlFor="sort-select">Sort by: </label>
                            <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="relevance">Relevance</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="results-wrapper">
                        <aside className="filters">
                            <div className="filter-group">
                                <h3>Category</h3>
                                <div className="filter-options">
                                    {ALL_CATEGORIES.map((cat) => (
                                        <label key={cat}>
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => handleCategoryChange(cat)}
                                            />{' '}
                                            {cat} ({totalCategoryStats[cat]})
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group price-filter">
                                <h3>Price Range</h3>
                                <div className="price-inputs">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        aria-label="Minimum price"
                                        value={tempMinPrice}
                                        onChange={(e) => setTempMinPrice(e.target.value)}
                                        step="0.01"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        aria-label="Maximum price"
                                        value={tempMaxPrice}
                                        onChange={(e) => setTempMaxPrice(e.target.value)}
                                        step="0.01"
                                    />
                                </div>
                                <button className="apply-btn" onClick={applyPriceFilter}>Apply</button>
                            </div>

                            <div className="filter-group">
                                <h3>Rating</h3>
                                <div className="filter-options filter-disabled" title="Ratings are not available in this dataset">
                                    <label><input type="checkbox" disabled /> ★★★★★ &amp; Up</label>
                                    <label><input type="checkbox" disabled /> ★★★★☆ &amp; Up</label>
                                </div>
                            </div>
                        </aside>

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
