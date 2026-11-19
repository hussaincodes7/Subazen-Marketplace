const apiRoot = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://api.subazen.com/api' : 'http://localhost:2000/api');
export const api = apiRoot.replace(/\/$/, '');
const publicRoot = process.env.REACT_APP_PUBLIC_URL || api.replace(/\/api$/, '');
const isLocalHost = (hostname) => {
    const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^(fc|fd|fe[89ab])/i.test(host)) return true;
    const parts = host.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10 || parts[0] === 127 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 169 && parts[1] === 254);
};
export const generatePublicUrl = (fileName) => {
    if (!fileName) return '';
    const value = String(fileName).trim();
    if (/^(blob:|data:)/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (isLocalHost(parsed.hostname)) {
                return `${publicRoot}${parsed.pathname}${parsed.search}${parsed.hash}`;
            }
            return value;
        } catch {
            return value;
        }
    }
    if (value.startsWith('/public/')) return `${publicRoot}${value}`;
    return `${publicRoot}/public/${value.replace(/^\/+/, '')}`;
}
