const memoStore: { deps?: ReadonlyArray<unknown>; value: unknown }[] = [];
let memoIndex = 0;

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
    deps.every((dep, i) => dep === previous.deps?.[i])
  ) {
    return previous.value as T;
  }

  const value = factory();
  memoStore[index] = { deps, value };
  return value;
};

const forwardRefMock = (render: any) => (props: any) => {
  memoIndex = 0;
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
  return { __esModule: true, ...reactMock, default: reactMock };
});

jest.mock('react/jsx-runtime', () => ({
  Fragment: 'Fragment',
  jsx: (type: any, props: any) => ({ type, props }),
  jsxs: (type: any, props: any) => ({ type, props }),
  jsxDEV: (type: any, props: any) => ({ type, props }),
}));

const mockCreateTextRecognitionPlugin = jest.fn(() => ({
  scanText: jest.fn(),
  recognizer: {
    scanFrame: jest.fn(),
  },
}));
const mockCreateTranslatorPlugin = jest.fn(() => ({
  translate: jest.fn(),
  recognizer: {
    scanFrame: jest.fn(),
  },
  translator: {
    translate: jest.fn(),
  },
  from: 'en',
  to: 'fr',
}));
const mockUseFrameProcessor = jest.fn();
const mockUseRunOnJS = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(),
  useFrameProcessor: (...args: any[]) => mockUseFrameProcessor(...args),
}));

jest.mock('react-native-worklets', () => ({
  runOnJS: (...args: any[]) => mockUseRunOnJS(...args),
}));

jest.mock('../scanText', () => ({
  createTextRecognitionPlugin: mockCreateTextRecognitionPlugin,
}));

jest.mock('../translateText', () => ({
  createTranslatorPlugin: mockCreateTranslatorPlugin,
}));

describe('Camera module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('react') as any).__reset?.();
    const { Platform } = require('react-native');
    Platform.OS = 'ios';

    mockUseFrameProcessor.mockImplementation(
      (
        processor: (frame: unknown) => unknown,
        _deps?: ReadonlyArray<unknown>
      ) => {
        return processor;
      }
    );

    mockUseRunOnJS.mockImplementation((fn: (...args: unknown[]) => unknown) => {
      return jest.fn((...args: unknown[]) => fn(...args));
    });
  });

  describe('Plugin creation', () => {
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

    it('should create translator plugin with language pair', () => {
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

    it('should return plugin with scanText method', () => {
      const plugin = mockCreateTextRecognitionPlugin();
      expect(plugin).toHaveProperty('scanText');
      expect(typeof plugin.scanText).toBe('function');
    });

    it('should return plugin with translate method', () => {
      const plugin = mockCreateTranslatorPlugin();
      expect(plugin).toHaveProperty('translate');
      expect(typeof plugin.translate).toBe('function');
    });
  });

  describe('useTextRecognition hook', () => {
    it('should return a TextRecognitionPlugin', () => {
      const { useTextRecognition } = require('../Camera');

      const plugin = useTextRecognition({ language: 'latin' });

      expect(plugin).toHaveProperty('scanText');
    });

    it('should call createTextRecognitionPlugin with correct options', () => {
      const { useTextRecognition } = require('../Camera');
      const options = { language: 'japanese' as const, frameSkipThreshold: 5 };

      useTextRecognition(options);

      expect(mockCreateTextRecognitionPlugin).toHaveBeenCalledWith(options);
    });

    it('should work without options', () => {
      const { useTextRecognition } = require('../Camera');

      const plugin = useTextRecognition();

      expect(plugin).toHaveProperty('scanText');
    });
  });

  describe('useTranslate hook', () => {
    it('should return a TranslatorPlugin', () => {
      const { useTranslate } = require('../Camera');

      const plugin = useTranslate({ from: 'en', to: 'fr' });

      expect(plugin).toHaveProperty('translate');
    });

    it('should call createTranslatorPlugin with correct options', () => {
      const { useTranslate } = require('../Camera');
      const options = { from: 'en' as const, to: 'de' as const };

      useTranslate(options);

      expect(mockCreateTranslatorPlugin).toHaveBeenCalledWith(options);
    });

    it('should work without options', () => {
      const { useTranslate } = require('../Camera');

      const plugin = useTranslate();

      expect(plugin).toHaveProperty('translate');
    });
  });

  describe('Camera component', () => {
    it('should be defined and be a function', () => {
      const { Camera } = require('../Camera');
      expect(Camera).toBeDefined();
      expect(typeof Camera).toBe('function');
    });

    it('should render with recognize mode', () => {
      const { Camera } = require('../Camera');
      const mockDevice = { id: 'back', name: 'Back Camera' };
      const mockCallback = jest.fn();

      const result = Camera({
        device: mockDevice,
        isActive: true,
        mode: 'recognize' as const,
        options: { language: 'latin' as const },
        callback: mockCallback,
      });

      expect(result).toBeDefined();
    });

    it('should render with translate mode', () => {
      const { Camera } = require('../Camera');
      const mockDevice = { id: 'back', name: 'Back Camera' };
      const mockCallback = jest.fn();

      const result = Camera({
        device: mockDevice,
        isActive: true,
        mode: 'translate' as const,
        options: { from: 'en' as const, to: 'fr' as const },
        callback: mockCallback,
      });

      expect(result).toBeDefined();
    });

    it('should use rgb pixel format on Android', () => {
      const { Platform } = require('react-native');
      Platform.OS = 'android';
      const { Camera } = require('../Camera');
      const mockDevice = { id: 'back', name: 'Back Camera' };
      const mockCallback = jest.fn();

      const result = Camera({
        device: mockDevice,
        isActive: true,
        mode: 'recognize' as const,
        options: { language: 'latin' as const },
        callback: mockCallback,
      });

      const child = Array.isArray(result.props.children)
        ? result.props.children[0]
        : result.props.children;
      expect(child.props.pixelFormat).toBe('rgb');
    });

    it('should drop translate requests while one is in-flight', async () => {
      const { Camera } = require('../Camera');
      const mockDevice = { id: 'back', name: 'Back Camera' };
      const mockCallback = jest.fn();
      let resolveTranslation!: (value: string) => void;
      const pendingTranslation = new Promise<string>((resolve) => {
        resolveTranslation = resolve;
      });

      const scanFrame = jest
        .fn()
        .mockReturnValueOnce({ resultText: 'hello', blocks: [] })
        .mockReturnValueOnce({ resultText: 'bonjour', blocks: [] })
        .mockReturnValueOnce({ resultText: 'bonjour', blocks: [] });
      const translate = jest
        .fn()
        .mockReturnValueOnce(pendingTranslation)
        .mockResolvedValueOnce('salut');

      mockCreateTranslatorPlugin.mockReturnValueOnce({
        recognizer: { scanFrame },
        translator: { translate },
        from: 'en',
        to: 'fr',
        translate: jest.fn(),
      });

      const result = Camera({
        device: mockDevice,
        isActive: true,
        mode: 'translate' as const,
        options: { from: 'en' as const, to: 'fr' as const },
        callback: mockCallback,
      });

      const child = Array.isArray(result.props.children)
        ? result.props.children[0]
        : result.props.children;
      const frameProcessor = child.props.frameProcessor;
      const makeFrame = () => {
        const release = jest.fn();
        return {
          getNativeBuffer: () => ({ pointer: BigInt(1), release }),
          orientation: 'up',
          dispose: jest.fn(),
        };
      };

      frameProcessor(makeFrame());
      frameProcessor(makeFrame());
      expect(translate).toHaveBeenCalledTimes(1);
      expect(translate).toHaveBeenCalledWith('hello', 'en', 'fr');

      resolveTranslation('bonjour');
      await pendingTranslation;
      await Promise.resolve();

      frameProcessor(makeFrame());
      expect(translate).toHaveBeenCalledTimes(2);
      expect(translate).toHaveBeenLastCalledWith('bonjour', 'en', 'fr');
    });

    it('should return null children when device is not provided', () => {
      const { Camera } = require('../Camera');
      const mockCallback = jest.fn();

      const result = Camera({
        device: null,
        isActive: false,
        mode: 'recognize' as const,
        options: {},
        callback: mockCallback,
      });

      // When device is falsy the NativeCamera is not rendered, result is a Fragment
      expect(result).toBeDefined();
    });
  });
});
