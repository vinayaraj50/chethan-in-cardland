/**
 * Zip Utilities for Stack Download/Upload
 * Handles creating zip files from stacks and extracting stacks from zip files
 */

import JSZip from 'jszip';

/**
 * Download a stack as a zip file
 * @param {Object} stack - The stack object containing title, cards, etc.
 */
export const downloadStackAsZip = async (stack) => {
    try {
        const zip = new JSZip();

        // Create the main stack data file
        const stackData = {
            id: stack.id,
            title: stack.title,
            cards: stack.cards,
            createdAt: stack.createdAt || new Date().toISOString(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        // Add the stack data as JSON
        zip.file('stack.json', JSON.stringify(stackData, null, 2));

        // Add a README for user information
        const readme = `Chethan in Cardland - Flashcard Stack Export

Stack Title: ${stack.title}
Total Cards: ${stack.cards?.length || 0}
Exported: ${new Date().toLocaleString()}

This file contains your flashcard stack including:
- Questions and answers (text)
- Audio recordings (embedded as base64)
- Images (embedded as base64)

To import this stack:
1. Open Chethan in Cardland
2. Click "New Flashcard Stack"
3. Click "Upload from Device"
4. Select this zip file

All your data will be restored exactly as it was.
`;

        zip.file('README.txt', readme);

        // Generate the zip file
        const blob = await zip.generateAsync({ type: 'blob' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${stack.title} - Chethan in Cardland.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Error creating zip file:', error);
        throw new Error('Failed to create zip file');
    }
};

/**
 * Upload and extract a stack from a zip file
 * @param {File} file - The zip file to extract
 * @returns {Object} - The extracted stack data
 */
export const uploadStackFromZip = async (file) => {
    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        // Check if stack.json exists
        const stackFile = contents.file('stack.json');
        if (!stackFile) {
            throw new Error('Invalid zip file: stack.json not found');
        }

        // Extract and parse the stack data
        const stackJson = await stackFile.async('string');
        const stackData = JSON.parse(stackJson);

        // Validate the stack data
        if (!stackData.title || !stackData.cards) {
            throw new Error('Invalid stack data: missing title or cards');
        }

        // Generate a new ID for the imported stack
        const importedStack = {
            ...stackData,
            id: `stack_${Date.now()}`,
            importedAt: new Date().toISOString(),
            originalId: stackData.id
        };

        return importedStack;
    } catch (error) {
        console.error('Error extracting zip file:', error);
        if (error.message.includes('Invalid')) {
            throw error;
        }
        throw new Error('Failed to extract zip file. Please ensure it\'s a valid Chethan in Cardland export.');
    }
};
