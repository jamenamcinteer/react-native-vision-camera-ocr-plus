import type { Frame } from '../types';

const mockScanFrame = jest.fn();
const mockConfigure = jest.fn();
const mockTranslate = jest.fn();

const mockRecognizer = { scanFrame: mockScanFrame, configure: mockConfigure };
const mockTranslator = { translate: mockTranslate };

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn((name: string) =>
      name === 'TextRecognizer' ? mockRecognizer : mockTranslator
    ),
  },
}));

const { createTranslatorPlugin } = require('../translateText');

describe('createTranslatorPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { NitroModules } = require('react-native-nitro-modules');
    NitroModules.createHybridObject.mockImplementation((name: string) =>
      name === 'TextRecognizer' ? mockRecognizer : mockTranslator
    );
  });

  describe('Plugin creation', () => {
    it('creates both a recognizer and a translator', () => {
      const { NitroModules } = require('react-native-nitro-modules');
      createTranslatorPlugin({ from: 'en', to: 'es' });
      expect(NitroModules.createHybridObject).toHaveBeenCalledWith(
        'TextRecognizer'
      );
      expect(NitroModules.createHybridObject).toHaveBeenCalledWith(
        'Translator'
      );
    });

    it('configures the recognizer with default settings', () => {
      createTranslatorPlugin({ from: 'en', to: 'es' });
      expect(mockConfigure).toHaveBeenCalledWith({
        language: 'latin',
        frameSkipThreshold: 10,
        useLightweightMode: false,
      });
    });

    it('returns a handle with scanText, translate, recognizer, translator, from, to', () => {
      const handle = createTranslatorPlugin({ from: 'en', to: 'fr' });
      expect(handle).toHaveProperty('scanText');
      expect(handle).toHaveProperty('translate');
      expect(handle).toHaveProperty('recognizer');
      expect(handle).toHaveProperty('translator');
      expect(handle).toHaveProperty('from', 'en');
      expect(handle).toHaveProperty('to', 'fr');
    });

    it('defaults from/to to "en" when no options provided', () => {
      const handle = createTranslatorPlugin();
      expect(handle.from).toBe('en');
      expect(handle.to).toBe('en');
    });

    it('creates plugin for common language pairs', () => {
      const pairs = [
        { from: 'en' as const, to: 'es' as const },
        { from: 'en' as const, to: 'fr' as const },
        { from: 'zh' as const, to: 'en' as const },
        { from: 'ja' as const, to: 'en' as const },
        { from: 'ko' as const, to: 'en' as const },
        { from: 'de' as const, to: 'en' as const },
        { from: 'ar' as const, to: 'en' as const },
        { from: 'ru' as const, to: 'en' as const },
      ];
      pairs.forEach(({ from, to }) => {
        const handle = createTranslatorPlugin({ from, to });
        expect(handle.from).toBe(from);
        expect(handle.to).toBe(to);
      });
    });
  });

  describe('scanText function', () => {
    const makeFrame = (): Frame => {
      const nb = { pointer: BigInt(99999), release: jest.fn() };
      return {
        getNativeBuffer: jest.fn(() => nb),
        orientation: 'portrait',
        width: 1920,
        height: 1080,
      } as unknown as Frame;
    };

    it('calls recognizer.scanFrame with pointer and orientation', () => {
      mockScanFrame.mockReturnValue({ resultText: 'Bonjour', blocks: [] });
      const frame = makeFrame();
      const handle = createTranslatorPlugin({ from: 'fr', to: 'en' });

      handle.scanText(frame);

      expect(mockScanFrame).toHaveBeenCalledWith(BigInt(99999), 'portrait');
    });

    it('releases the native buffer', () => {
      mockScanFrame.mockReturnValue({ resultText: 'ok', blocks: [] });
      const frame = makeFrame();
      const handle = createTranslatorPlugin({ from: 'en', to: 'es' });
      handle.scanText(frame);
      const nb = (frame as any).getNativeBuffer();
      expect(nb.release).toHaveBeenCalled();
    });

    it('returns empty text when scanFrame returns null', () => {
      mockScanFrame.mockReturnValue(null);
      const frame = makeFrame();
      const handle = createTranslatorPlugin({ from: 'en', to: 'es' });
      const result = handle.scanText(frame);
      expect(result).toEqual({ resultText: '', blocks: [] });
    });
  });

  describe('translate function', () => {
    it('calls translator.translate with text, from, to', async () => {
      mockTranslate.mockResolvedValue('Hola mundo');
      const handle = createTranslatorPlugin({ from: 'en', to: 'es' });
      const result = await handle.translate('Hello world');
      expect(mockTranslate).toHaveBeenCalledWith('Hello world', 'en', 'es');
      expect(result).toBe('Hola mundo');
    });

    it('returns empty string for empty input', async () => {
      const handle = createTranslatorPlugin({ from: 'en', to: 'fr' });
      const result = await handle.translate('');
      expect(mockTranslate).not.toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('returns empty string for undefined/null-like input', async () => {
      const handle = createTranslatorPlugin({ from: 'en', to: 'de' });
      const result = await handle.translate(undefined as any);
      expect(result).toBe('');
    });
  });
});
