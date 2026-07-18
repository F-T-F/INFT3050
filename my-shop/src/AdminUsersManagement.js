import React, { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from './AdminProductManagement';
import { createUser, deleteUser, getUsers, updateUser } from './utils/api';
import { getCurrentUser } from './utils/session';

const EMPTY_USER = {
    username: '',
    name: '',
    email: '',
    password: '',
    isAdmin: false,
};

function AdminUsersManagement() {
    const canManage = Boolean(getCurrentUser()?.isAdmin);
    const [users, setUsers] = useState([]);
    const [query, setQuery] = useState('');
    const [form, setForm] = useState(EMPTY_USER);
    const [editingUserId, setEditingUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            setUsers(await getUsers());
            setMessage(null);
        } catch {
            setMessage({ type: 'error', text: 'Could not load users from the backend.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const search = query.trim().toLowerCase();
        if (!search) return users;
        return users.filter((user) =>
            user.UserName?.toLowerCase().includes(search) ||
            user.Name?.toLowerCase().includes(search) ||
            user.Email?.toLowerCase().includes(search)
        );
    }, [users, query]);

    const updateField = (field) => (event) => {
        const value = field === 'isAdmin' ? event.target.checked : event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setMessage(null);
    };

    const startEdit = (user) => {
        setEditingUserId(user.UserID);
        setForm({
            username: user.UserName || '',
            name: user.Name || '',
            email: user.Email || '',
            password: '',
            isAdmin: Boolean(user.isAdmin),
        });
        setMessage(null);
    };

    const resetForm = () => {
        setEditingUserId(null);
        setForm(EMPTY_USER);
        setMessage(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            if (editingUserId) {
                await updateUser(editingUserId, form);
                setMessage({ type: 'success', text: 'User updated successfully.' });
            } else {
                await createUser(form);
                setMessage({ type: 'success', text: 'User created successfully.' });
            }
            resetForm();
            await loadUsers();
        } catch {
            setMessage({ type: 'error', text: 'Could not save this user. The username may already exist.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete user "${user.UserName}"?`)) return;
        try {
            await deleteUser(user.UserID);
            setUsers((current) => current.filter((item) => item.UserName !== user.UserName));
            setMessage({ type: 'success', text: `User "${user.UserName}" was deleted.` });
        } catch {
            setMessage({ type: 'error', text: 'Could not delete this user. They may be linked to product updates.' });
        }
    };

    return (
        <div className="admin-shell">
            <AdminSidebar active="users" />

            <main className="admin-main">
                <div className="admin-page-head">
                    <div>
                        <h1>User Management</h1>
                        <p>{canManage ? 'Add, edit, and delete staff or admin accounts.' : 'View staff and admin accounts.'}</p>
                    </div>
                </div>

                {message && (
                    <div className={`auth-message auth-message-${message.type}`} role="status">
                        {message.text}
                    </div>
                )}

                <section className={`admin-management-grid ${canManage ? '' : 'admin-readonly-grid'}`}>
                    <div className="admin-table-card">
                        <div className="admin-toolbar admin-toolbar-in-card">
                            <label className="admin-search">
                                <span aria-hidden="true">⌕</span>
                                <input type="search" placeholder="Search users..." value={query} onChange={(event) => setQuery(event.target.value)} />
                            </label>
                        </div>

                        <table className="admin-products-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="admin-empty-row">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="5" className="admin-empty-row">No users found.</td></tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.UserName}>
                                            <td>{user.UserName}</td>
                                            <td>{user.Name || '-'}</td>
                                            <td>{user.Email || '-'}</td>
                                            <td><span className="admin-status admin-status-in">{user.isAdmin ? 'ADMIN' : 'STAFF'}</span></td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    {canManage ? (
                                                        <>
                                                            <button type="button" aria-label={`Edit ${user.UserName}`} title="Edit user" onClick={() => startEdit(user)}>✎</button>
                                                            <button type="button" aria-label={`Delete ${user.UserName}`} title="Delete user" onClick={() => handleDelete(user)}>⌫</button>
                                                        </>
                                                    ) : <span className="panel-note">View only</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {canManage && <section className="admin-form-card">
                        <h2 className="admin-form-title">{editingUserId ? 'Edit User' : 'Add User'}</h2>
                        <form className="admin-item-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label htmlFor="admin-user-username">Username</label>
                                <input id="admin-user-username" value={form.username} onChange={updateField('username')} readOnly={Boolean(editingUserId)} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="admin-user-name">Name</label>
                                <input id="admin-user-name" value={form.name} onChange={updateField('name')} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="admin-user-email">Email</label>
                                <input id="admin-user-email" type="email" value={form.email} onChange={updateField('email')} />
                            </div>
                            <div className="form-field">
                                <label htmlFor="admin-user-password">{editingUserId ? 'New Password' : 'Password'}</label>
                                <input id="admin-user-password" type="password" value={form.password} onChange={updateField('password')} required={!editingUserId} />
                            </div>
                            <label className="admin-check-field">
                                <input type="checkbox" checked={form.isAdmin} onChange={updateField('isAdmin')} />
                                Admin account
                            </label>
                            <div className="admin-form-actions">
                                {editingUserId && <button type="button" className="admin-light-btn" onClick={resetForm}>Cancel</button>}
                                <button type="submit" className="admin-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button>
                            </div>
                        </form>
                    </section>}
                </section>
            </main>
        </div>
    );
}

export default AdminUsersManagement;
