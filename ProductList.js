import React, { useEffect } from 'react';

// Long-form product detail shown as a pop-up, per Business Scenario 1:
// "Displays long form description (either on a page or pop-up) Name, Price, Description etc."
function ProductModal({ product, onClose }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!product) return null;

    const priceNum = parseFloat(product.price) || 0;
    const priceLabel = priceNum === 0 ? 'Free' : `$${priceNum.toFixed(2)}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose} aria-label="Close" title="Close">×</button>

                <div className="modal-body">
                    <div className="modal-img">
                        {product.pic_url
                            ? <img src={product.pic_url} alt={product.title} />
                            : <span className="img-placeholder" aria-hidden="true">No image</span>}
                    </div>
                    <div className="modal-info">
                        <h2 id="modal-title">{product.title}</h2>
                        {product.category && <div className="modal-category">{product.category}</div>}
                        <div className="modal-price">{priceLabel}</div>
                        <p className="modal-desc">{product.description}</p>
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
