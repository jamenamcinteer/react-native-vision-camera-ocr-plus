import type { Languages } from '../types';

// Mock the native modules
const mockRemoveLanguageModel = {
  remove: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    RemoveLanguageModel: mockRemoveLanguageModel,
  },
}));

// Import after mocking
const { RemoveLanguageModel } = require('../RemoveLanguageModel');

describe('RemoveLanguageModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should call native remove method with correct language code', async () => {
      mockRemoveLanguageModel.remove.mockResolvedValue(true);

      const result = await RemoveLanguageModel('en');

      expect(mockRemoveLanguageModel.remove).toHaveBeenCalledWith('en');
      expect(result).toBe(true);
    });

    it('should return false when removal fails', async () => {
      mockRemoveLanguageModel.remove.mockResolvedValue(false);

      const result = await RemoveLanguageModel('fr');

      expect(mockRemoveLanguageModel.remove).toHaveBeenCalledWith('fr');
      expect(result).toBe(false);
    });

    it('should handle native module errors', async () => {
      const errorMessage = 'Native module error';
      mockRemoveLanguageModel.remove.mockRejectedValue(new Error(errorMessage));

      await expect(RemoveLanguageModel('de')).rejects.toThrow(errorMessage);
      expect(mockRemoveLanguageModel.remove).toHaveBeenCalledWith('de');
    });
  });

  describe('Language code validation', () => {
    const validLanguageCodes: Languages[] = [
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

    validLanguageCodes.forEach((languageCode) => {
      it(`should accept valid language code: ${languageCode}`, async () => {
        mockRemoveLanguageModel.remove.mockResolvedValue(true);

        await RemoveLanguageModel(languageCode);

        expect(mockRemoveLanguageModel.remove).toHaveBeenCalledWith(
          languageCode
        );
      });
    });
  });

  describe('Common language codes', () => {
    const commonLanguages = [
      { code: 'en' as Languages, name: 'English' },
      { code: 'es' as Languages, name: 'Spanish' },
      { code: 'fr' as Languages, name: 'French' },
      { code: 'de' as Languages, name: 'German' },
      { code: 'it' as Languages, name: 'Italian' },
      { code: 'pt' as Languages, name: 'Portuguese' },
      { code: 'ru' as Languages, name: 'Russian' },
      { code: 'ja' as Languages, name: 'Japanese' },
      { code: 'ko' as Languages, name: 'Korean' },
      { code: 'zh' as Languages, name: 'Chinese' },
      { code: 'ar' as Languages, name: 'Arabic' },
      { code: 'hi' as Languages, name: 'Hindi' },
    ];

    commonLanguages.forEach(({ code, name }) => {
      it(`should handle ${name} (${code}) language removal`, async () => {
        mockRemoveLanguageModel.remove.mockResolvedValue(true);

        const result = await RemoveLanguageModel(code);

        expect(mockRemoveLanguageModel.remove).toHaveBeenCalledWith(code);
        expect(result).toBe(true);
      });
    });
  });

  describe('Error scenarios', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Operation timed out');
      mockRemoveLanguageModel.remove.mockRejectedValue(timeoutError);

      await expect(RemoveLanguageModel('en')).rejects.toThrow(
        'Operation timed out'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockRemoveLanguageModel.remove.mockRejectedValue(networkError);

      await expect(RemoveLanguageModel('fr')).rejects.toThrow(
        'Network connection failed'
      );
    });

    it('should handle language model not found', async () => {
      const notFoundError = new Error('Language model not found');
      mockRemoveLanguageModel.remove.mockRejectedValue(notFoundError);

      await expect(RemoveLanguageModel('cy')).rejects.toThrow(
        'Language model not found'
      );
    });
  });

  describe('Async behavior', () => {
    it('should handle multiple concurrent removals', async () => {
      mockRemoveLanguageModel.remove
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const promises = [
        RemoveLanguageModel('en'),
        RemoveLanguageModel('fr'),
        RemoveLanguageModel('de'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([true, false, true]);
      expect(mockRemoveLanguageModel.remove).toHaveBeenCalledTimes(3);
    });

    it('should handle slow operations', async () => {
      mockRemoveLanguageModel.remove.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(true), 100);
          })
      );

      const startTime = Date.now();
      const result = await RemoveLanguageModel('en');
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});
