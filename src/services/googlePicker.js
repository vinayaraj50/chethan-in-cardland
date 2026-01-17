import { scriptLoader } from '../utils/scriptLoader';

const PICKER_API_URL = 'https://apis.google.com/js/api.js';

export const loadPicker = async () => {
    try {
        const gapi = await scriptLoader.waitForGlobal('gapi', 15000);
        return new Promise((resolve) => {
            gapi.load('picker', { callback: resolve });
        });
    } catch (error) {
        console.warn('[Picker] Google API unavailable:', error.message);
        throw error;
    }
};

export const showPicker = (token, onFilePicked) => {
    if (!window.google) return;

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('application/json');
    view.setQuery('flashcard_stack_'); // Filter to our stacks

    const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY) // You'll need an API Key for the Picker
        .setCallback((data) => {
            if (data.action === window.google.picker.Action.PICKED) {
                const fileId = data.docs[0].id;
                onFilePicked(fileId);
            }
        })
        .build();

    picker.setVisible(true);
};
