// The auth cookie is httpOnly (JS can't read it), so we keep a copy of the
// logged-in user's public info in localStorage purely for UI state (show name,
// admin controls, etc.). The cookie is what actually authorises API writes.
const KEY = 'eg_current_user';

export const getCurrentUser = () => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setCurrentUser = (user) => {
    localStorage.setItem(KEY, JSON.stringify(user));
};

export const clearCurrentUser = () => {
    localStorage.removeItem(KEY);
};
