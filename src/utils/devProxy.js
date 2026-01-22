/**
 * @fileoverview DevStorageProxy - Development Gateway for CORS Bypass
 * Standard "BHP" (Backend-for-Frontend Proxy) pattern for Vite development.
 * 
 * NOTE: This is a Development-Only module.
 * In Production, proper CORS configuration on the Bucket is required.
 */

export const tryDevProxyFetch = async (storageRef) => {
    // Structural Guard: Only active in DEV mode
    if (!import.meta.env.DEV) return null;

    console.info('[DevProxy] Attempting proxy fallback for:', storageRef.fullPath);

    try {
        const bucket = storageRef.bucket;
        const fullPath = storageRef.fullPath;
        // Uses the proxy configured in vite.config.js
        const proxyUrl = `/firebase-proxy/v0/b/${bucket}/o/${encodeURIComponent(fullPath)}?alt=media`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Proxy Gateway Error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    } catch (e) {
        console.warn('[DevProxy] Gateway failed:', e);
        throw e;
    }
};
