import { db, firebaseStorage } from './firebase';
import { collection, getDocs, query, where, setDoc, doc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';

/**
 * @fileoverview FirebaseLessonService handles interactions with the authoritative Firestore/Storage catalog.
 * Migrated from GAPI to pure Firebase (2026 Industry Standard).
 */

class FirebaseLessonService {
    /**
     * Lists public lessons from Firestore.
     */
    async listPublicLessons() {
        try {
            console.log('[Firestore] Fetching authoritative lesson catalog...');
            const lessonsRef = collection(db, 'lessons');
            // Query for isActive: true (used by admin panel) 
            const q = query(lessonsRef, where('isActive', '==', true));
            const snapshot = await getDocs(q);

            console.log('[Firestore] Query completed. Documents found:', snapshot.size);
            if (snapshot.empty) {
                console.log('[Firestore] No active lessons found.');
                return [];
            }

            return snapshot.docs.map(doc => this._mapDocToLesson(doc));
        } catch (e) {
            console.error('[Firestore] Catalog fetch failed:', e);
            return [];
        }
    }

    /**
     * Subscribes to public lessons via Firestore real-time listeners.
     * @param {function} onUpdate Callback function receiving the list of lessons
     * @returns {function} Unsubscribe function
     */
    subscribeToPublicLessons(onUpdate) {
        console.log('[Firestore] Subscribing to authoritative lesson catalog...');
        const lessonsRef = collection(db, 'lessons');
        const q = query(lessonsRef, where('isActive', '==', true));

        return onSnapshot(q, (snapshot) => {
            console.log('[Firestore] Real-time update received. Documents:', snapshot.size);
            const lessons = snapshot.docs.map(doc => this._mapDocToLesson(doc));
            onUpdate(lessons);
        }, (error) => {
            console.error('[Firestore] Subscription error:', error);
        });
    }

    _mapDocToLesson(doc) {
        const data = doc.data();
        const isPremium = data.type === 'premium' || data.isPremium;
        const storagePath = data.storagePath || `lessons/${isPremium ? 'premium' : 'free'}/${doc.id}.enc`;

        // Return metadata exactly as stored - the frontend expects exact matches
        return {
            id: doc.id,
            ...data,
            standard: data.standard || null,
            syllabus: data.syllabus || null,
            medium: data.medium || null,
            subject: data.subject || null,
            source: 'firestore',
            isPremium,
            isPublic: true,
            storagePath,
            questionCount: data.questionCount || data.cardsCount || 0
        };
    }

    /**
     * Fetch lesson content from Firebase Storage.
     */
    async getPublicFileContent(storagePathOrId) {
        try {
            // Heuristic to ensure we have a valid storage path
            let path = storagePathOrId;
            if (!path.includes('/')) {
                // If it's just an ID, assume standard lesson path
                path = `lessons/${path}.enc`;
            }

            console.log('[Storage] Fetching content from:', path);
            const storageRef = ref(firebaseStorage, path);
            const url = await getDownloadURL(storageRef);
            const response = await fetch(url);

            if (!response.ok) throw new Error(`Firebase Storage HTTP ${response.status}`);

            const text = await response.text();
            console.log('[Storage] Raw content length:', text?.length);
            try {
                const parsed = JSON.parse(text);
                console.log('[Storage] Successfully parsed JSON. Questions found:', (parsed.questions?.length || parsed.cards?.length || 0));
                return parsed;
            } catch (e) {
                console.log('[Storage] Content is string (likely encrypted)');
                return text; // Return raw encrypted text
            }
        } catch (e) {
            console.error('[Storage] Content Fetch Failed:', e);
            throw new Error(`Failed to download lesson content: ${e.message}`);
        }
    }

    /**
     * Legacy placeholder for public index (now handled by listPublicLessons)
     */
    async getPublicIndex() {
        return this.listPublicLessons();
    }

    /**
     * Save a lesson to Firestore and Storage.
     */
    async savePublicLesson(lesson) {
        try {
            const lessonId = lesson.id || Date.now().toString();
            const isPremium = lesson.cost > 0;
            const storagePath = `lessons/${isPremium ? 'premium' : 'free'}/${lessonId}.enc`;

            console.log(`[LessonService] Publishing to Firebase: ${storagePath}`);

            // 1. Prepare Storage Reference
            const storageRef = ref(firebaseStorage, storagePath);
            const contentBlob = new Blob([JSON.stringify(lesson)], { type: 'application/json' });

            // 2. Upload to Storage
            await uploadBytes(storageRef, contentBlob);

            // 3. Update Firestore Catalog
            const lessonRef = doc(db, 'lessons', lessonId);

            // Clean lesson for metadata (remove heavy fields)
            const metadata = {
                id: lessonId,
                title: lesson.title,
                titleImage: lesson.titleImage || null,
                label: lesson.label || 'No label',
                standard: lesson.standard || null,
                syllabus: lesson.syllabus || null,
                medium: lesson.medium || null,
                subject: lesson.subject || null,
                cost: lesson.cost || 0,
                questionCount: lesson.questions?.length || lesson.cards?.length || 0, // Ensure questionCount is saved
                type: isPremium ? 'premium' : 'free',
                isActive: true,
                storagePath: storagePath,
                updatedAt: serverTimestamp()
            };

            await setDoc(lessonRef, metadata, { merge: true });

            return { ...lesson, ...metadata, source: 'firestore' };
        } catch (e) {
            console.error('[LessonService] Save failed:', e);
            throw e;
        }
    }
    /**
     * Delete (Soft Disable) a public lesson
     */
    async deletePublicLesson(lessonId) {
        try {
            console.log(`[LessonService] Deactivating lesson: ${lessonId}`);
            const lessonRef = doc(db, 'lessons', lessonId);
            await updateDoc(lessonRef, { isActive: false });
            return true;
        } catch (e) {
            console.error('[LessonService] Delete failed:', e);
            throw e;
        }
    }
}

export const apiService = new FirebaseLessonService();

// Standardized exports
export const listPublicLessons = () => apiService.listPublicLessons();
export const subscribeToPublicLessons = (cb) => apiService.subscribeToPublicLessons(cb);
export const listPublicStacks = () => apiService.listPublicLessons(); // Backward compatibility aliasing
export const getPublicFileContent = (fileId) => apiService.getPublicFileContent(fileId);
export const getPublicIndex = () => apiService.getPublicIndex();
export const savePublicLesson = (lesson) => apiService.savePublicLesson(lesson);
export const deletePublicLesson = (lessonId) => apiService.deletePublicLesson(lessonId);
