import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getMe } from '../utils/api';
import { clearCurrentUser, getCurrentUser, setCurrentUser } from '../utils/session';

const getRole = (user) => {
    if (user?.isCustomer) return 'customer';
    if (user?.isAdmin) return 'admin';
    return user ? 'staff' : null;
};

function ProtectedRoute({ roles, children }) {
    const location = useLocation();
    const [storedUser] = useState(getCurrentUser);
    const [user, setUser] = useState(storedUser?.isCustomer ? storedUser : null);
    const [checking, setChecking] = useState(Boolean(storedUser && !storedUser.isCustomer));
    const role = getRole(user);

    useEffect(() => {
        if (!storedUser || storedUser.isCustomer) return;
        let active = true;
        getMe()
            .then((verified) => {
                if (!active) return;
                const verifiedUser = { ...storedUser, ...verified, isCustomer: false };
                setCurrentUser(verifiedUser);
                setUser(verifiedUser);
            })
            .catch(() => {
                if (!active) return;
                clearCurrentUser();
                setUser(null);
            })
            .finally(() => { if (active) setChecking(false); });
        return () => { active = false; };
    }, [storedUser]);

    if (!storedUser || (!checking && !user)) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (checking) return <div className="route-loading" role="status">Checking access...</div>;

    if (roles && !roles.includes(role)) {
        return <Navigate to="/account" replace />;
    }

    return children;
}

export default ProtectedRoute;
