import { DECRYPTION_API_URL } from '../constants/config';
import { getAuth } from 'firebase/auth';

/**
 * Service to handle server-side decryption of public lessons.
 * strictly adheres to the Client/Server security boundary.
 */
export const decryptionService = {
    /**
     * Sends an encrypted lesson blob to the server for decryption.
     * @param {string} encryptedBlob - The raw encrypted string (v1:iv:ciphertext:tag)
     * @returns {Promise<Object>} - The decrypted lesson JSON
     */
    /**
     * Sends an encrypted lesson blob to the server for decryption.
     * @param {string} encryptedBlob - The raw encrypted string (v1:iv:ciphertext:tag)
     * @param {string} lessonId - The ID of the lesson to bind to (Anti-Replay)
     * @param {string} idToken - Valid Firebase ID Token from authenticated user
     * @returns {Promise<Object>} - The decrypted lesson JSON
     */
    decryptPublicLesson: async (encryptedBlob, lessonId, idToken) => {
        if (!DECRYPTION_API_URL) {
            throw new Error('Decryption Service unavailable: API URL not configured.');
        }

        if (!idToken) {
            throw new Error('User must be authenticated to decrypt lessons.');
        }

        if (!lessonId) {
            throw new Error('Lesson ID is required for secure decryption.');
        }

        try {
            const response = await fetch(DECRYPTION_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    lessonId: lessonId,
                    data: encryptedBlob
                })
            });

            if (!response.ok) {
                let serverError = response.statusText;
                try {
                    const errorJson = await response.json();
                    serverError = errorJson.error || errorJson.message || serverError;
                } catch (e) {
                    // Fallback to status text
                }

                if (response.status === 401) throw new Error(`Unauthorized: ${serverError}`);
                if (response.status === 403) throw new Error(`Forbidden: ${serverError}`);
                if (response.status === 429) throw new Error('Rate Limit Exceeded. Please try again later.');
                throw new Error(`Decryption Server Error: ${serverError}`);
            }

            const result = await response.json();
            return result.data || result; // Handle { data: ... } or direct object response
        } catch (error) {
            console.error('[DecryptionService] Remote decryption failed:', error);
            throw error; // Propagate to UI for handling
        }
    }
};
