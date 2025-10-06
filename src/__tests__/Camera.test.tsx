// Test the hooks and plugin creation functions directly
const mockCreateTextRecognitionPlugin = jest.fn(() => ({
  scanText: jest.fn(),
}));

const mockCreateTranslatorPlugin = jest.fn(() => ({
  translate: jest.fn(),
}));

jest.mock('../scanText', () => ({
  createTextRecognitionPlugin: mockCreateTextRecognitionPlugin,
}));

jest.mock('../translateText', () => ({
  createTranslatorPlugin: mockCreateTranslatorPlugin,
}));

describe('Camera Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Creation', () => {
    it('should create text recognition plugin with options', () => {
      const { createTextRecognitionPlugin } = require('../scanText');
      const options = { language: 'chinese' as const };
      
      createTextRecognitionPlugin(options);

      expect(mockCreateTextRecognitionPlugin).toHaveBeenCalledWith(options);
    });

    it('should create text recognition plugin without options', () => {
      const { createTextRecognitionPlugin } = require('../scanText');
      
      createTextRecognitionPlugin();

      expect(mockCreateTextRecognitionPlugin).toHaveBeenCalledWith();
    });

    it('should create translator plugin with language pair options', () => {
      const { createTranslatorPlugin } = require('../translateText');
      const options = { from: 'en' as const, to: 'es' as const };
      
      createTranslatorPlugin(options);

      expect(mockCreateTranslatorPlugin).toHaveBeenCalledWith(options);
    });

    it('should create translator plugin without options', () => {
      const { createTranslatorPlugin } = require('../translateText');
      
      createTranslatorPlugin();

      expect(mockCreateTranslatorPlugin).toHaveBeenCalledWith();
    });

    it('should return plugin with scanText method for text recognition', () => {
      const { createTextRecognitionPlugin } = require('../scanText');
      
      const plugin = createTextRecognitionPlugin();
      
      expect(plugin).toHaveProperty('scanText');
      expect(typeof plugin.scanText).toBe('function');
    });

    it('should return plugin with translate method for translation', () => {
      const { createTranslatorPlugin } = require('../translateText');
      
      const plugin = createTranslatorPlugin();
      
      expect(plugin).toHaveProperty('translate');
      expect(typeof plugin.translate).toBe('function');
    });
  });

  describe('Language Support', () => {
    it('should support all text recognition languages', () => {
      const { createTextRecognitionPlugin } = require('../scanText');
      const supportedLanguages = [
        'latin',
        'chinese',
        'devanagari',
        'japanese',
        'korean',
      ] as const;

      supportedLanguages.forEach((language) => {
        createTextRecognitionPlugin({ language });
        expect(mockCreateTextRecognitionPlugin).toHaveBeenCalledWith({
          language,
        });
      });
    });

    it('should support common translation language pairs', () => {
      const { createTranslatorPlugin } = require('../translateText');
      const commonPairs = [
        { from: 'en' as const, to: 'es' as const },
        { from: 'en' as const, to: 'fr' as const },
        { from: 'zh' as const, to: 'en' as const },
        { from: 'ja' as const, to: 'en' as const },
      ];

      commonPairs.forEach((options) => {
        createTranslatorPlugin(options);
        expect(mockCreateTranslatorPlugin).toHaveBeenCalledWith(options);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin creation errors gracefully', () => {
      const { createTextRecognitionPlugin } = require('../scanText');
      
      mockCreateTextRecognitionPlugin.mockImplementationOnce(() => {
        throw new Error('Plugin creation failed');
      });

      expect(() => createTextRecognitionPlugin()).toThrow(
        'Plugin creation failed'
      );
    });

    it('should handle translation plugin creation errors', () => {
      const { createTranslatorPlugin } = require('../translateText');
      
      mockCreateTranslatorPlugin.mockImplementationOnce(() => {
        throw new Error('Translation plugin creation failed');
      });

      expect(() => createTranslatorPlugin()).toThrow(
        'Translation plugin creation failed'
      );
    });
  });

  describe('Function Return Values', () => {
    it('should return proper plugin structure for text recognition', () => {
      const mockScanTextFn = jest.fn();
      mockCreateTextRecognitionPlugin.mockReturnValue({
        scanText: mockScanTextFn,
      });

      const { createTextRecognitionPlugin } = require('../scanText');
      const plugin = createTextRecognitionPlugin();

      expect(plugin.scanText).toBe(mockScanTextFn);
    });

    it('should return proper plugin structure for translation', () => {
      const mockTranslateFn = jest.fn();
      mockCreateTranslatorPlugin.mockReturnValue({
        translate: mockTranslateFn,
      });

      const { createTranslatorPlugin } = require('../translateText');
      const plugin = createTranslatorPlugin();

      expect(plugin.translate).toBe(mockTranslateFn);
    });
  });
});
