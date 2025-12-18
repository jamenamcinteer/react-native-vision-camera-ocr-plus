const memoStore: { deps?: ReadonlyArray<unknown>; value: unknown }[] = [];
let memoIndex = 0;
const resetMemoIndex = (): void => {
  memoIndex = 0;
};

const useMemoMock = <T,>(
  factory: () => T,
  deps?: ReadonlyArray<unknown>
): T => {
  const index = memoIndex++;
  const previous = memoStore[index];

  if (
    previous &&
    deps &&
    previous.deps &&
    deps.length === previous.deps.length &&
    deps.every((dep, depIndex) => dep === previous.deps?.[depIndex])
  ) {
    return previous.value as T;
  }

  const value = factory();
  memoStore[index] = { deps, value };
  return value;
};

const forwardRefMock = (render: any) => (props: any) => {
  resetMemoIndex();
  return render(props, null);
};

const createElementMock = (type: any, props: any, ...children: any[]) => ({
  type,
  props: { ...props, children },
});

jest.mock('react', () => {
  const reactMock = {
    createElement: createElementMock,
    Fragment: 'Fragment',
    forwardRef: forwardRefMock,
    useMemo: useMemoMock,
    __reset: (): void => {
      memoStore.length = 0;
      memoIndex = 0;
    },
  };

  return {
    __esModule: true,
    ...reactMock,
    default: reactMock,
  };
});

jest.mock('react/jsx-runtime', () => ({
  Fragment: 'Fragment',
  jsx: (type: any, props: any) => ({ type, props }),
  jsxs: (type: any, props: any) => ({ type, props }),
  jsxDEV: (type: any, props: any) => ({ type, props }),
}));

// Test the hooks and plugin creation functions directly
const mockCreateTextRecognitionPlugin = jest.fn(() => ({
  scanText: jest.fn(),
}));

const mockCreateTranslatorPlugin = jest.fn(() => ({
  translate: jest.fn(),
}));

const mockUseFrameProcessor = jest.fn();
const mockVisionCamera = jest.fn();
jest.mock('react-native-vision-camera', () => ({
  Camera: (props: any) => {
    mockVisionCamera(props);
    return null;
  },
  useFrameProcessor: (...args: any[]) => mockUseFrameProcessor(...args),
}));

const mockUseRunOnJS = jest.fn();
jest.mock('react-native-worklets-core', () => ({
  useRunOnJS: (...args: any[]) => mockUseRunOnJS(...args),
}));

jest.mock('../scanText', () => ({
  createTextRecognitionPlugin: mockCreateTextRecognitionPlugin,
}));

jest.mock('../translateText', () => ({
  createTranslatorPlugin: mockCreateTranslatorPlugin,
}));

describe('Camera Module Tests', () => {
  let lastFrameProcessor: ((frame: any) => void) | null;
  let lastFrameProcessorDeps: ReadonlyArray<unknown> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    (require('react') as any).__reset?.();

    lastFrameProcessor = null;
    lastFrameProcessorDeps = undefined;

    mockUseFrameProcessor.mockImplementation(
      (
        processor: (frame: unknown) => unknown,
        deps?: ReadonlyArray<unknown>
      ) => {
        lastFrameProcessor = processor;
        lastFrameProcessorDeps = deps;
        return processor;
      }
    );

    mockUseRunOnJS.mockImplementation(
      (
        fn: (...args: unknown[]) => unknown,
        deps?: ReadonlyArray<unknown>
      ): jest.Mock => {
        const runner = jest.fn((...args: unknown[]) => fn(...args));
        (mockUseRunOnJS as any).lastDeps = deps;
        return runner;
      }
    );
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

  describe('Camera Frame Processor Updates', () => {
    const textOptions = { language: 'latin' as const };
    const translationOptions = { from: 'en' as const, to: 'es' as const };

    it('refreshes the frame processor when mode changes', () => {
      const callback = jest.fn();
      const translateCallback = jest.fn();
      const scanText = jest.fn(() => 'scanned');
      const translate = jest.fn(() => 'translated');

      mockCreateTextRecognitionPlugin.mockReturnValue({ scanText });
      mockCreateTranslatorPlugin.mockReturnValue({ translate });

      const { Camera } = require('../Camera');

      Camera({
        device: {},
        mode: 'recognize',
        options: textOptions,
        callback,
      });

      const frame = { id: 'frame' } as const;

      expect(lastFrameProcessorDeps).toEqual(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          'recognize',
          textOptions,
        ])
      );

      lastFrameProcessor?.(frame);

      expect(scanText).toHaveBeenCalledWith(frame);
      expect(callback).toHaveBeenCalledWith('scanned');

      Camera({
        device: {},
        mode: 'translate',
        options: translationOptions,
        callback: translateCallback,
      });

      expect(lastFrameProcessorDeps).toEqual(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          'translate',
          translationOptions,
        ])
      );

      lastFrameProcessor?.(frame);

      expect(scanText).toHaveBeenCalledTimes(1);
      expect(translate).toHaveBeenCalledWith(frame);
      expect(translateCallback).toHaveBeenCalledWith('translated');
    });

    it('updates the processor when callback changes', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const scanText = jest.fn(() => 'scanned again');

      mockCreateTextRecognitionPlugin.mockReturnValue({ scanText });

      const { Camera } = require('../Camera');

      Camera({
        device: {},
        mode: 'recognize',
        options: textOptions,
        callback: firstCallback,
      });

      const frame = { id: 'frame' } as const;

      lastFrameProcessor?.(frame);

      expect(firstCallback).toHaveBeenCalledWith('scanned again');
      expect(mockUseRunOnJS).toHaveBeenLastCalledWith(expect.any(Function), [
        firstCallback,
      ]);

      Camera({
        device: {},
        mode: 'recognize',
        options: textOptions,
        callback: secondCallback,
      });

      lastFrameProcessor?.(frame);

      expect(secondCallback).toHaveBeenCalledWith('scanned again');
      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(mockUseRunOnJS).toHaveBeenLastCalledWith(expect.any(Function), [
        secondCallback,
      ]);
      expect(lastFrameProcessorDeps).toEqual(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          'recognize',
          textOptions,
        ])
      );
    });
  });
});
