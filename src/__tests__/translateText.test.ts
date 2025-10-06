import type { Frame } from '../types';

// Mock Vision Camera Proxy
const mockPlugin = {
  call: jest.fn(),
};

const mockVisionCameraProxy = {
  initFrameProcessorPlugin: jest.fn(),
};

jest.mock('react-native-vision-camera', () => ({
  VisionCameraProxy: mockVisionCameraProxy,
}));

// Import after mocking
const { createTranslatorPlugin } = require('../translateText');

describe('createTranslatorPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin initialization', () => {
    it('should create plugin with valid translation options', () => {
      const options = { from: 'en' as const, to: 'es' as const };
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );

      const plugin = createTranslatorPlugin(options);

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledWith('translate', options);
      expect(plugin).toHaveProperty('translate');
      expect(typeof plugin.translate).toBe('function');
    });

    it('should create plugin without options', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );

      const plugin = createTranslatorPlugin();

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledWith('translate', {});
      expect(plugin).toHaveProperty('translate');
    });

    it('should throw error when plugin initialization fails', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(null);

      expect(() => createTranslatorPlugin()).toThrow(
        "Can't load plugin translate.Try cleaning cache or reinstall plugin."
      );
    });

    it('should throw error when plugin initialization returns undefined', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(undefined);

      expect(() => createTranslatorPlugin()).toThrow(
        "Can't load plugin translate.Try cleaning cache or reinstall plugin."
      );
    });
  });

  describe('Language pair validation', () => {
    const commonLanguagePairs = [
      {
        from: 'en' as const,
        to: 'es' as const,
        description: 'English to Spanish',
      },
      {
        from: 'en' as const,
        to: 'fr' as const,
        description: 'English to French',
      },
      {
        from: 'zh' as const,
        to: 'en' as const,
        description: 'Chinese to English',
      },
      {
        from: 'ja' as const,
        to: 'en' as const,
        description: 'Japanese to English',
      },
      {
        from: 'ko' as const,
        to: 'en' as const,
        description: 'Korean to English',
      },
      {
        from: 'de' as const,
        to: 'en' as const,
        description: 'German to English',
      },
      {
        from: 'it' as const,
        to: 'en' as const,
        description: 'Italian to English',
      },
      {
        from: 'pt' as const,
        to: 'en' as const,
        description: 'Portuguese to English',
      },
      {
        from: 'ru' as const,
        to: 'en' as const,
        description: 'Russian to English',
      },
      {
        from: 'ar' as const,
        to: 'en' as const,
        description: 'Arabic to English',
      },
    ];

    commonLanguagePairs.forEach(({ from, to, description }) => {
      it(`should handle ${description} translation`, () => {
        const options = { from, to };
        mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
          mockPlugin
        );

        const plugin = createTranslatorPlugin(options);

        expect(
          mockVisionCameraProxy.initFrameProcessorPlugin
        ).toHaveBeenCalledWith('translate', options);
        expect(plugin).toHaveProperty('translate');
      });
    });
  });

  describe('translate function', () => {
    let plugin: any;
    const mockFrame: Frame = {} as Frame;

    beforeEach(() => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      plugin = createTranslatorPlugin({ from: 'en', to: 'es' });
    });

    it('should call plugin with frame and return translated string', () => {
      const mockTranslation = 'Hola mundo';
      mockPlugin.call.mockReturnValue(mockTranslation);

      const result = plugin.translate(mockFrame);

      expect(mockPlugin.call).toHaveBeenCalledWith(mockFrame);
      expect(result).toBe(mockTranslation);
    });

    it('should return empty string when no translation is available', () => {
      mockPlugin.call.mockReturnValue('');

      const result = plugin.translate(mockFrame);

      expect(mockPlugin.call).toHaveBeenCalledWith(mockFrame);
      expect(result).toBe('');
    });

    it('should handle long text translations', () => {
      const longTranslation =
        'Esta es una traducción muy larga que contiene múltiples oraciones y debería ser manejada correctamente por el plugin de traducción.';
      mockPlugin.call.mockReturnValue(longTranslation);

      const result = plugin.translate(mockFrame);

      expect(result).toBe(longTranslation);
    });

    it('should handle special characters and unicode', () => {
      const unicodeTranslation =
        'こんにちは世界 🌍 Привет мир 🌎 مرحبا بالعالم 🌏';
      mockPlugin.call.mockReturnValue(unicodeTranslation);

      const result = plugin.translate(mockFrame);

      expect(result).toBe(unicodeTranslation);
    });
  });

  describe('Error handling', () => {
    it('should handle native plugin errors gracefully', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      mockPlugin.call.mockImplementation(() => {
        throw new Error('Translation service unavailable');
      });

      const mockFrame: Frame = {} as Frame;

      expect(() => plugin.translate(mockFrame)).toThrow(
        'Translation service unavailable'
      );
    });

    it('should handle null return values from native plugin', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      mockPlugin.call.mockReturnValue(null);

      const mockFrame: Frame = {} as Frame;
      const result = plugin.translate(mockFrame);

      expect(result).toBeNull();
    });

    it('should handle undefined return values from native plugin', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      mockPlugin.call.mockReturnValue(undefined);

      const mockFrame: Frame = {} as Frame;
      const result = plugin.translate(mockFrame);

      expect(result).toBeUndefined();
    });
  });

  describe('Plugin lifecycle', () => {
    it('should create different plugin instances for different language pairs', () => {
      const plugin1 = createTranslatorPlugin({ from: 'en', to: 'es' });
      const plugin2 = createTranslatorPlugin({ from: 'fr', to: 'en' });

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledTimes(2);
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(1, 'translate', { from: 'en', to: 'es' });
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(2, 'translate', { from: 'fr', to: 'en' });

      expect(plugin1).not.toBe(plugin2);
    });

    it('should maintain plugin state between calls', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      const mockFrame: Frame = {} as Frame;
      const mockTranslation = 'Hola';

      mockPlugin.call.mockReturnValue(mockTranslation);

      const result1 = plugin.translate(mockFrame);
      const result2 = plugin.translate(mockFrame);

      expect(result1).toBe(mockTranslation);
      expect(result2).toBe(mockTranslation);
      expect(mockPlugin.call).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive translations', async () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      const mockFrame: Frame = {} as Frame;
      
      mockPlugin.call
        .mockReturnValueOnce('Uno')
        .mockReturnValueOnce('Dos')
        .mockReturnValueOnce('Tres');

      const results = [
        plugin.translate(mockFrame),
        plugin.translate(mockFrame),
        plugin.translate(mockFrame),
      ];

      expect(results).toEqual(['Uno', 'Dos', 'Tres']);
      expect(mockPlugin.call).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance considerations', () => {
    it('should handle frame processing efficiently', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTranslatorPlugin({ from: 'en', to: 'es' });

      const mockFrame: Frame = {} as Frame;
      mockPlugin.call.mockReturnValue('Traducido');

      const startTime = performance.now();
      plugin.translate(mockFrame);
      const endTime = performance.now();

      // Should complete quickly (this is more of a smoke test)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockPlugin.call).toHaveBeenCalledWith(mockFrame);
    });
  });
});
