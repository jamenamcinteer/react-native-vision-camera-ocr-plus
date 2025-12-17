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
const { createTextRecognitionPlugin } = require('../scanText');

describe('createTextRecognitionPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin initialization', () => {
    it('should create plugin with default options', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );

      const plugin = createTextRecognitionPlugin();

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledWith('scanText', {
        frameSkipThreshold: 10,
        useLightweightMode: false,
        language: 'latin' as const,
      });
      expect(plugin).toHaveProperty('scanText');
      expect(typeof plugin.scanText).toBe('function');
    });

    it('should create plugin with custom options', () => {
      const options = {
        language: 'chinese' as const,
        frameSkipThreshold: 10,
        useLightweightMode: true,
      };
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );

      const plugin = createTextRecognitionPlugin(options);

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledWith('scanText', options);
      expect(plugin).toHaveProperty('scanText');
    });

    it('should handle all supported languages', () => {
      const languages = [
        'latin',
        'chinese',
        'devanagari',
        'japanese',
        'korean',
      ] as const;

      languages.forEach((language) => {
        mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
          mockPlugin
        );

        const options = {
          language,
          frameSkipThreshold: 10,
          useLightweightMode: true,
        };
        const plugin = createTextRecognitionPlugin(options);

        expect(
          mockVisionCameraProxy.initFrameProcessorPlugin
        ).toHaveBeenCalledWith('scanText', options);
        expect(plugin).toHaveProperty('scanText');
      });
    });

    it('should parse scanRegion percentage strings into numeric values', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );

      const options = {
        scanRegion: {
          left: '25%',
          top: '50%',
          width: '12.5%',
          height: '100%',
        },
      } as const;

      const plugin = createTextRecognitionPlugin(options);

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledWith('scanText', {
        frameSkipThreshold: 10,
        useLightweightMode: false,
        language: 'latin',
        scanRegion: {
          left: 25,
          top: 50,
          width: 12.5,
          height: 100,
        },
      });
      expect(plugin).toHaveProperty('scanText');
    });

    it('should throw error when plugin initialization fails', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(null);

      expect(() => createTextRecognitionPlugin()).toThrow(
        "Can't load plugin scanText.Try cleaning cache or reinstall plugin."
      );
    });

    it('should throw error when plugin initialization returns undefined', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(undefined);

      expect(() => createTextRecognitionPlugin()).toThrow(
        "Can't load plugin scanText.Try cleaning cache or reinstall plugin."
      );
    });
  });

  describe('scanText function', () => {
    let plugin: any;
    const mockFrame: Frame = {} as Frame;

    beforeEach(() => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      plugin = createTextRecognitionPlugin();
    });

    it('should call plugin with frame and return text array', () => {
      const mockTextResults: any = [
        {
          blocks: [],
          resultText: 'hello world',
        },
      ];

      mockPlugin.call.mockReturnValue(mockTextResults);

      const result = plugin.scanText(mockFrame);

      expect(mockPlugin.call).toHaveBeenCalledWith(mockFrame);
      expect(result).toEqual(mockTextResults);
    });

    it('should return empty array when no text is detected', () => {
      const emptyResults: any = [];
      mockPlugin.call.mockReturnValue(emptyResults);

      const result = plugin.scanText(mockFrame);

      expect(mockPlugin.call).toHaveBeenCalledWith(mockFrame);
      expect(result).toEqual(emptyResults);
    });

    it('should handle multiple text blocks', () => {
      const multipleTextResults: any = [
        {
          blocks: [],
          resultText: 'first block second block',
        },
      ];

      mockPlugin.call.mockReturnValue(multipleTextResults);

      const result = plugin.scanText(mockFrame);

      expect(result).toEqual(multipleTextResults);
    });
  });

  describe('Error handling', () => {
    it('should handle native plugin errors gracefully', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTextRecognitionPlugin();

      mockPlugin.call.mockImplementation(() => {
        throw new Error('Native plugin error');
      });

      const mockFrame: Frame = {} as Frame;

      expect(() => plugin.scanText(mockFrame)).toThrow('Native plugin error');
    });

    it('should handle null return values from native plugin', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTextRecognitionPlugin();

      mockPlugin.call.mockReturnValue(null);

      const mockFrame: Frame = {} as Frame;
      const result = plugin.scanText(mockFrame);

      expect(result).toBeNull();
    });
  });

  describe('Plugin lifecycle', () => {
    it('should create different plugin instances for different options', () => {
      const plugin1 = createTextRecognitionPlugin({
        language: 'latin',
        useLightweightMode: true,
      });
      const plugin2 = createTextRecognitionPlugin({
        language: 'chinese',
        useLightweightMode: true,
      });
      const plugin3 = createTextRecognitionPlugin({
        frameSkipThreshold: 1,
        useLightweightMode: true,
      });
      const plugin4 = createTextRecognitionPlugin({
        useLightweightMode: false,
      });

      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenCalledTimes(4);
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(1, 'scanText', {
        language: 'latin',
        frameSkipThreshold: 10,
        useLightweightMode: true,
      });
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(2, 'scanText', {
        language: 'chinese',
        frameSkipThreshold: 10,
        useLightweightMode: true,
      });
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(3, 'scanText', {
        language: 'latin',
        frameSkipThreshold: 1,
        useLightweightMode: true,
      });
      expect(
        mockVisionCameraProxy.initFrameProcessorPlugin
      ).toHaveBeenNthCalledWith(4, 'scanText', {
        language: 'latin',
        frameSkipThreshold: 10,
        useLightweightMode: false,
      });

      expect(plugin1).not.toBe(plugin2);
      expect(plugin3).not.toBe(plugin4);
    });

    it('should maintain plugin state between calls', () => {
      mockVisionCameraProxy.initFrameProcessorPlugin.mockReturnValue(
        mockPlugin
      );
      const plugin = createTextRecognitionPlugin();

      const mockFrame: Frame = {} as Frame;
      const mockResults: any = [
        {
          blocks: [],
          resultText: 'test',
        },
      ];

      mockPlugin.call.mockReturnValue(mockResults);

      const result1 = plugin.scanText(mockFrame);
      const result2 = plugin.scanText(mockFrame);

      expect(result1).toEqual(mockResults);
      expect(result2).toEqual(mockResults);
      expect(mockPlugin.call).toHaveBeenCalledTimes(2);
    });
  });
});
