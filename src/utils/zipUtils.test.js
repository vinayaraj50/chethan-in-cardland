import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadStackAsZip, uploadStackFromZip } from './zipUtils';
import JSZip from 'jszip';

// Absolute simplest mock
vi.mock('jszip', () => {
    const mockInstance = {
        file: vi.fn(),
        generateAsync: vi.fn(),
        loadAsync: vi.fn()
    };
    function MockConstructor() {
        return mockInstance;
    }
    MockConstructor.loadAsync = vi.fn();
    return {
        default: MockConstructor,
        __esModule: true
    };
});

describe('zipUtils', () => {
    let mockInstance;

    beforeEach(() => {
        vi.clearAllMocks();
        mockInstance = new JSZip(); // This will use our mock constructor

        // Setup default behavior
        mockInstance.file.mockReturnValue({
            async: vi.fn().mockResolvedValue(JSON.stringify({
                id: 'test', title: 'Test Stack', cards: []
            }))
        });
        mockInstance.generateAsync.mockResolvedValue(new Blob(['data']));
        mockInstance.loadAsync.mockResolvedValue(mockInstance);

        // Mock global URL
        global.URL.createObjectURL = vi.fn(() => 'url');
        global.URL.revokeObjectURL = vi.fn();

        // Mock document elements
        const mockA = { click: vi.fn(), remove: vi.fn(), style: {} };
        document.createElement = vi.fn(tag => tag === 'a' ? mockA : {});
        document.body.appendChild = vi.fn();
        document.body.removeChild = vi.fn();
    });

    it('downloadStackAsZip works', async () => {
        const res = await downloadStackAsZip({ id: '1', title: 'T', cards: [] });
        expect(res).toBe(true);
        expect(mockInstance.generateAsync).toHaveBeenCalled();
    });

    it('uploadStackFromZip works', async () => {
        const res = await uploadStackFromZip(new File([], 'test.zip'));
        expect(res.title).toBe('Test Stack');
    });

    it('uploadStackFromZip handles missing file', async () => {
        mockInstance.file.mockReturnValue(null);
        await expect(uploadStackFromZip(new File([], 'test.zip'))).rejects.toThrow(/not found/);
    });
});
