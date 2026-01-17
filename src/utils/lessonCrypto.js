/**
 * @fileoverview LessonCrypto - App-Bound Encryption Subsystem.
 * 
 * DESIGN PRINCIPLES:
 * 1. App-Bound: Lessons are encrypted using a student-specific key derived from their Firebase UID.
 * 2. High Performance: Uses AES-GCM for fast, in-memory crypto without streaming.
 * 3. Integrity: GCM provides built-in authentication (tamper-proofing).
 * 4. Stateless: Keys are derived on-the-fly from the UID and a persistent salt/master-secret.
 */

// Master Secret for Key Derivation (Keep this in .env or similar in production)
// For this environment, we'll use a hardcoded fallback if env is missing
const MASTER_SECRET = import.meta.env.VITE_CRYPTO_MASTER_SECRET || 'cic_v1_master_secret_2026_antigravity';

const KEY_ALGO = 'AES-GCM';
const KDF_ALGO = 'PBKDF2';
const HASH_ALGO = 'SHA-256';
const ITERATIONSCount = 100000;

/**
 * Derives a CryptoKey from a Firebase UID and Master Secret.
 * @param {string} uid - The Firebase UID
 * @param {string} saltString - Optional salt string
 * @returns {Promise<CryptoKey>}
 */
export const deriveUserKey = async (uid, saltString = 'cic_default_salt') => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(MASTER_SECRET + uid),
        { name: KDF_ALGO },
        false,
        ['deriveBits', 'deriveKey']
    );

    const salt = encoder.encode(saltString);

    return await crypto.subtle.deriveKey(
        {
            name: KDF_ALGO,
            salt: salt,
            iterations: ITERATIONSCount,
            hash: HASH_ALGO
        },
        keyMaterial,
        { name: KEY_ALGO, length: 256 },
        false, // Not extractable
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypts a JS object or string into an encrypted blob.
 * @param {any} data - Data to encrypt
 * @param {CryptoKey} key - Derived User Key
 * @returns {Promise<string>} - Base64 string of IV + CipherText
 */
export const encryptLesson = async (data, key) => {
    const encoder = new TextEncoder();
    const plainText = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await crypto.subtle.encrypt(
        {
            name: KEY_ALGO,
            iv: iv
        },
        key,
        encoder.encode(plainText)
    );

    // Combine IV (12 bytes) + CipherText + Authentication Tag
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    // Convert to Base64 (using a resilient method for browser compat)
    return btoa(String.fromCharCode(...combined));
};

/**
 * Decrypts an encrypted blob back into its original form.
 * @param {string} encryptedBase64 - The IV+CipherText combined base64 string
 * @param {CryptoKey} key - Derived User Key
 * @returns {Promise<any>} - Decrypted data (parsed if JSON)
 */
export const decryptLesson = async (encryptedBase64, key) => {
    try {
        const encryptedData = new Uint8Array(
            atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
        );

        const iv = encryptedData.slice(0, 12);
        const cipherText = encryptedData.slice(12);

        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: KEY_ALGO,
                iv: iv
            },
            key,
            cipherText
        );

        const decoded = new TextDecoder().decode(decryptedBuffer);

        try {
            return JSON.parse(decoded);
        } catch (e) {
            return decoded; // Return as string if not JSON
        }
    } catch (error) {
        console.error('[LessonCrypto] Decryption failed:', error);
        throw new Error('Lesson decryption failed. This content might be owned by another user or corrupted.');
    }
};
