// Password hashing that matches the backend's scheme:
//   HashPW = sha256(salt + password)   (hex), Salt is stored alongside.
// See auth/server.js: crypto.createHash("sha256").update(salt + password).

export const makeSalt = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); // 32 hex chars
};

export const sha256Hex = async (text) => {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''); // 64 hex chars
};
