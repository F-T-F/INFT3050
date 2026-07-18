// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import ProductList from './ProductList';
import CategoriesPage from './CategoriesPage';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';
import ProfilePage from './ProfilePage';
import CartPage from './CartPage';
import CheckoutPage from './Checkout';
import RecoveryPage from './RecoveryPage';
import AdminProductManagement from './AdminProductManagement';
import AdminProductForm from './AdminProductForm';
import AdminUsersManagement from './AdminUsersManagement';
import AdminOrdersManagement from './AdminOrdersManagement';
import AdminPlaceholderPage from './AdminPlaceholderPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/recovery" element={<RecoveryPage />} />
                <Route path="/account" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<ProtectedRoute roles={['customer']}><CheckoutPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPlaceholderPage type="dashboard" /></ProtectedRoute>} />
                <Route path="/admin/products" element={<ProtectedRoute roles={['admin', 'staff']}><AdminProductManagement /></ProtectedRoute>} />
                <Route path="/admin/products/new" element={<ProtectedRoute roles={['admin']}><AdminProductForm /></ProtectedRoute>} />
                <Route path="/admin/products/:id/edit" element={<ProtectedRoute roles={['admin']}><AdminProductForm /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['admin', 'staff']}><AdminUsersManagement /></ProtectedRoute>} />
                <Route path="/admin/customers" element={<ProtectedRoute roles={['admin']}><AdminUsersManagement /></ProtectedRoute>} />
                <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><AdminOrdersManagement /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminPlaceholderPage type="settings" /></ProtectedRoute>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
