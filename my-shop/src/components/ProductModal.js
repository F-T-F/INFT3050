import React, { useEffect } from 'react';
import { genreIcon } from '../ProductList';

// Long-form product detail pop-up, wired to the real Product schema
// (Name, Author, Description, Genre/subGenre names, price from Stocktake).
function ProductModal({ product, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!product) return null;

    const priceLabel =
        product.price == null ? 'Price unavailable'
            : product.price === 0 ? 'Free'
                : `$${product.price.toFixed(2)}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close" title="Close">×</button>

                <div className="modal-body">
                    <div className="modal-img genre-thumb">
                        <span className="genre-emoji-lg" aria-hidden="true">{genreIcon(product.Genre)}</span>
                    </div>
                    <div className="modal-info">
                        <h2 id="modal-title">{product.Name}</h2>
                        {product.Author && <div className="modal-author">by {product.Author}</div>}
                        <div className="modal-category">
                            {product.genreName}{product.subGenreName ? ` · ${product.subGenreName}` : ''}
                        </div>
                        <div className="modal-price">{priceLabel}</div>
                        <p className="modal-desc">{product.Description}</p>
                        <div className="modal-actions">
                            <button className="primary-btn" title="Add to cart (coming soon)">Add to Cart</button>
                            <button className="link-btn" onClick={onClose}>Back to results</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductModal;
