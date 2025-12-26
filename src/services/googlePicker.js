/**
 * Google Drive Picker Service
 * Allows users to explicitly select files shared with them.
 */

const PICKER_API_URL = 'https://apis.google.com/js/api.js';

export const loadPicker = () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PICKER_API_URL;
        script.onload = () => {
            window.gapi.load('picker', { callback: resolve });
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
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
