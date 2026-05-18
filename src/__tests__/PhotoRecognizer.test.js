"use strict";
// Mock react-native-nitro-modules before importing PhotoRecognizer
const mockRecognizePhoto = jest.fn();
const mockConfigure = jest.fn();
const mockTextRecognizer = {
    recognizePhoto: mockRecognizePhoto,
    configure: mockConfigure,
};
jest.mock('react-native-nitro-modules', () => ({
    NitroModules: {
        createHybridObject: jest.fn((name) => {
            if (name === 'TextRecognizer')
                return mockTextRecognizer;
            throw new Error(`Unknown HybridObject: ${name}`);
        }),
    },
}));
describe('PhotoRecognizer', () => {
    let PhotoRecognizer;
    let NitroModules;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('iOS platform', () => {
        beforeAll(() => {
            jest.doMock('react-native', () => ({
                Platform: { OS: 'ios' },
            }));
            jest.resetModules();
            jest.mock('react-native-nitro-modules', () => ({
                NitroModules: {
                    createHybridObject: jest.fn(() => mockTextRecognizer),
                },
            }));
            PhotoRecognizer = require('../PhotoRecognizer').PhotoRecognizer;
            NitroModules = require('react-native-nitro-modules').NitroModules;
        });
        it('should throw error for empty URI', async () => {
            await expect(PhotoRecognizer({ uri: '' })).rejects.toThrow("Can't resolve img uri");
        });
        it('should strip file:// prefix on iOS', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: 'Hello', blocks: [] });
            await PhotoRecognizer({ uri: 'file:///path/to/photo.jpg' });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('/path/to/photo.jpg', 'portrait');
        });
        it('should use default portrait orientation', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: 'file:///test.jpg' });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('/test.jpg', 'portrait');
        });
        it('should pass custom orientation', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({
                uri: 'file:///test.jpg',
                orientation: 'landscapeLeft',
            });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('/test.jpg', 'landscapeLeft');
        });
        it('should return recognized text result', async () => {
            const expected = { resultText: 'Sample text', blocks: [] };
            mockRecognizePhoto.mockResolvedValue(expected);
            const result = await PhotoRecognizer({ uri: 'file:///test.jpg' });
            expect(result).toEqual(expected);
            expect(result).toHaveProperty('resultText', 'Sample text');
        });
        it('should create a TextRecognizer HybridObject', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: 'file:///test.jpg' });
            expect(NitroModules.createHybridObject).toHaveBeenCalledWith('TextRecognizer');
        });
        it('should handle URI without file:// prefix on iOS', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: '/absolute/path/photo.jpg' });
            // No file:// to strip — passes as-is
            expect(mockRecognizePhoto).toHaveBeenCalledWith('/absolute/path/photo.jpg', 'portrait');
        });
    });
    describe('Android platform', () => {
        beforeAll(() => {
            jest.resetModules();
            jest.doMock('react-native', () => ({
                Platform: { OS: 'android' },
            }));
            jest.mock('react-native-nitro-modules', () => ({
                NitroModules: {
                    createHybridObject: jest.fn(() => mockTextRecognizer),
                },
            }));
            PhotoRecognizer = require('../PhotoRecognizer').PhotoRecognizer;
        });
        it('should add file:// prefix for bare paths on Android', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: '/data/storage/photo.jpg' });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('file:///data/storage/photo.jpg', 'portrait');
        });
        it('should not double-prefix paths that already have a scheme on Android', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: 'file:///data/storage/photo.jpg' });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('file:///data/storage/photo.jpg', 'portrait');
        });
        it('should preserve content:// URIs on Android', async () => {
            mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
            await PhotoRecognizer({ uri: 'content://media/external/images/1234' });
            expect(mockRecognizePhoto).toHaveBeenCalledWith('content://media/external/images/1234', 'portrait');
        });
        it('should throw for empty URI on Android', async () => {
            await expect(PhotoRecognizer({ uri: '' })).rejects.toThrow("Can't resolve img uri");
        });
    });
    describe('All orientation values', () => {
        beforeAll(() => {
            jest.resetModules();
            jest.doMock('react-native', () => ({
                Platform: { OS: 'ios' },
            }));
            jest.mock('react-native-nitro-modules', () => ({
                NitroModules: {
                    createHybridObject: jest.fn(() => mockTextRecognizer),
                },
            }));
            PhotoRecognizer = require('../PhotoRecognizer').PhotoRecognizer;
        });
        const orientations = [
            'portrait',
            'portraitUpsideDown',
            'landscapeLeft',
            'landscapeRight',
        ];
        orientations.forEach((orientation) => {
            it(`should pass "${orientation}" orientation`, async () => {
                mockRecognizePhoto.mockResolvedValue({ resultText: '', blocks: [] });
                await PhotoRecognizer({ uri: 'file:///test.jpg', orientation });
                expect(mockRecognizePhoto).toHaveBeenCalledWith('/test.jpg', orientation);
            });
        });
    });
});
