// Mock react-native-nitro-modules
const mockRemoveLanguageModel = jest.fn();
const mockTranslator = {
    translate: jest.fn(),
    removeLanguageModel: mockRemoveLanguageModel,
};
jest.mock('react-native-nitro-modules', () => ({
    NitroModules: {
        createHybridObject: jest.fn((name) => {
            if (name === 'Translator')
                return mockTranslator;
            throw new Error(`Unknown HybridObject: ${name}`);
        }),
    },
}));
// Import after mocking
const { RemoveLanguageModel } = require('../RemoveLanguageModel');
const { NitroModules } = require('react-native-nitro-modules');
describe('RemoveLanguageModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Basic functionality', () => {
        it('should create a Translator HybridObject', async () => {
            mockRemoveLanguageModel.mockResolvedValue(true);
            await RemoveLanguageModel('en');
            expect(NitroModules.createHybridObject).toHaveBeenCalledWith('Translator');
        });
        it('should call removeLanguageModel with the correct language code', async () => {
            mockRemoveLanguageModel.mockResolvedValue(true);
            await RemoveLanguageModel('en');
            expect(mockRemoveLanguageModel).toHaveBeenCalledWith('en');
        });
        it('should return true on successful removal', async () => {
            mockRemoveLanguageModel.mockResolvedValue(true);
            const result = await RemoveLanguageModel('fr');
            expect(result).toBe(true);
        });
        it('should return false when model is not found', async () => {
            mockRemoveLanguageModel.mockResolvedValue(false);
            const result = await RemoveLanguageModel('de');
            expect(result).toBe(false);
        });
        it('should propagate errors from the native module', async () => {
            mockRemoveLanguageModel.mockRejectedValue(new Error('Model not found'));
            await expect(RemoveLanguageModel('ja')).rejects.toThrow('Model not found');
        });
    });
    describe('Language code validation', () => {
        const validLanguageCodes = [
            'af',
            'sq',
            'ar',
            'be',
            'bn',
            'bg',
            'ca',
            'zh',
            'cs',
            'da',
            'nl',
            'en',
            'eo',
            'et',
            'fi',
            'fr',
            'gl',
            'ka',
            'de',
            'el',
            'gu',
            'ht',
            'he',
            'hi',
            'hu',
            'is',
            'id',
            'ga',
            'it',
            'ja',
            'kn',
            'ko',
            'lv',
            'lt',
            'mk',
            'ms',
            'mt',
            'mr',
            'no',
            'fa',
            'pl',
            'pt',
            'ro',
            'ru',
            'sk',
            'sl',
            'es',
            'sw',
            'tl',
            'ta',
            'te',
            'th',
            'tr',
            'uk',
            'ur',
            'vi',
            'cy',
        ];
        it('should support all 57 defined language codes', () => {
            expect(validLanguageCodes).toHaveLength(57);
        });
        validLanguageCodes.forEach((code) => {
            it(`should accept language code "${code}"`, async () => {
                mockRemoveLanguageModel.mockResolvedValue(true);
                const result = await RemoveLanguageModel(code);
                expect(mockRemoveLanguageModel).toHaveBeenCalledWith(code);
                expect(typeof result).toBe('boolean');
            });
        });
    });
});
export {};
