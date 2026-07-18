import React from 'react';
import { AdminSidebar } from './AdminProductManagement';

const COPY = {
    dashboard: {
        title: 'Dashboard',
        text: 'Quick access to catalogue, order, and user management.',
    },
    orders: {
        title: 'Orders',
        text: 'Order management can be connected here after the customer cart and checkout flow is complete.',
    },
    settings: {
        title: 'Settings',
        text: 'Store configuration and admin preferences can be managed here.',
    },
};

function AdminPlaceholderPage({ type = 'dashboard' }) {
    const copy = COPY[type] || COPY.dashboard;

    return (
        <div className="admin-shell">
            <AdminSidebar active={type} />
            <main className="admin-main">
                <div className="admin-page-head">
                    <div>
                        <h1>{copy.title}</h1>
                        <p>{copy.text}</p>
                    </div>
                </div>

                <section className="admin-form-card">
                    <p className="panel-note">Use the sidebar to manage products or users.</p>
                </section>
            </main>
        </div>
    );
}

export default AdminPlaceholderPage;
