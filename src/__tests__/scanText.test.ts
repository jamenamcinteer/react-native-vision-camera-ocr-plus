import type { Frame } from '../types';

const mockScanFrame = jest.fn();
const mockConfigure = jest.fn();
const mockRecognizer = {
  scanFrame: mockScanFrame,
  configure: mockConfigure,
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockRecognizer),
  },
}));

const { createTextRecognitionPlugin } = require('../scanText');

describe('createTextRecognitionPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { NitroModules } = require('react-native-nitro-modules');
    NitroModules.createHybridObject.mockReturnValue(mockRecognizer);
  });

  describe('Plugin creation', () => {
    it('creates a recognizer with default options', () => {
      const { NitroModules } = require('react-native-nitro-modules');
      createTextRecognitionPlugin();
      expect(NitroModules.createHybridObject).toHaveBeenCalledWith(
        'TextRecognizer'
      );
      expect(mockConfigure).toHaveBeenCalledWith({
        language: 'latin',
        frameSkipThreshold: 10,
        useLightweightMode: false,
      });
    });

    it('creates a recognizer with custom language', () => {
      createTextRecognitionPlugin({ language: 'chinese' });
      expect(mockConfigure).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'chinese' })
      );
    });

    it('creates a recognizer with custom frameSkipThreshold', () => {
      createTextRecognitionPlugin({ frameSkipThreshold: 5 });
      expect(mockConfigure).toHaveBeenCalledWith(
        expect.objectContaining({ frameSkipThreshold: 5 })
      );
    });

    it('creates a recognizer with useLightweightMode', () => {
      createTextRecognitionPlugin({ useLightweightMode: true });
      expect(mockConfigure).toHaveBeenCalledWith(
        expect.objectContaining({ useLightweightMode: true })
      );
    });

    it('handles all supported recognition languages', () => {
      const languages = [
        'latin',
        'chinese',
        'devanagari',
        'japanese',
        'korean',
      ] as const;
      languages.forEach((language) => {
        const plugin = createTextRecognitionPlugin({ language });
        expect(plugin).toHaveProperty('scanText');
      });
    });

    it('parses scanRegion percentage strings into numeric values', () => {
      createTextRecognitionPlugin({
        scanRegion: { left: '25%', top: '50%', width: '12.5%', height: '100%' },
      } as any);
      expect(mockConfigure).toHaveBeenCalledWith(
        expect.objectContaining({
          scanRegion: { left: 25, top: 50, width: 12.5, height: 100 },
        })
      );
    });

    it('parses scanRegion with 0% values', () => {
      createTextRecognitionPlugin({
        scanRegion: { left: '0%', top: '0%', width: '100%', height: '100%' },
      } as any);
      expect(mockConfigure).toHaveBeenCalledWith(
        expect.objectContaining({
          scanRegion: { left: 0, top: 0, width: 100, height: 100 },
        })
      );
    });

    it('returns a handle with scanText function and recognizer', () => {
      const handle = createTextRecognitionPlugin();
      expect(handle).toHaveProperty('scanText');
      expect(handle).toHaveProperty('recognizer');
      expect(typeof handle.scanText).toBe('function');
    });
  });

  describe('scanText function', () => {
    const makeFrame = (extra: Record<string, unknown> = {}): Frame => {
      const nb = { pointer: BigInt(12345), release: jest.fn() };
      return {
        getNativeBuffer: jest.fn(() => nb),
        orientation: 'up',
        width: 1920,
        height: 1080,
        ...extra,
      } as unknown as Frame;
    };

    it('calls scanFrame with the native buffer pointer and orientation', () => {
      const mockResult = { resultText: 'Hello', blocks: [] };
      mockScanFrame.mockReturnValue(mockResult);
      const frame = makeFrame();
      const plugin = createTextRecognitionPlugin();

      const result = plugin.scanText(frame);

      expect((frame as any).getNativeBuffer).toHaveBeenCalled();
      expect(mockScanFrame).toHaveBeenCalledWith(BigInt(12345), 'up');
      expect(result).toEqual(mockResult);
    });

    it('releases the native buffer after scanFrame', () => {
      mockScanFrame.mockReturnValue({ resultText: 'ok', blocks: [] });
      const frame = makeFrame();
      const plugin = createTextRecognitionPlugin();
      plugin.scanText(frame);
      const nb = (frame as any).getNativeBuffer();
      expect(nb.release).toHaveBeenCalled();
    });

    it('releases the native buffer even when scanFrame throws', () => {
      mockScanFrame.mockImplementation(() => {
        throw new Error('OCR failed');
      });
      const frame = makeFrame();
      const plugin = createTextRecognitionPlugin();
      expect(() => plugin.scanText(frame)).toThrow('OCR failed');
      const nb = (frame as any).getNativeBuffer();
      expect(nb.release).toHaveBeenCalled();
    });

    it('returns empty result when scanFrame returns null', () => {
      mockScanFrame.mockReturnValue(null);
      const frame = makeFrame();
      const plugin = createTextRecognitionPlugin();
      const result = plugin.scanText(frame);
      expect(result).toEqual({ resultText: '', blocks: [] });
    });

    it('returns empty result when scanFrame returns undefined', () => {
      mockScanFrame.mockReturnValue(undefined);
      const frame = makeFrame();
      const plugin = createTextRecognitionPlugin();
      const result = plugin.scanText(frame);
      expect(result).toEqual({ resultText: '', blocks: [] });
    });

    it('defaults orientation to "up" when frame has no orientation', () => {
      mockScanFrame.mockReturnValue({ resultText: '', blocks: [] });
      const frame = makeFrame({ orientation: undefined });
      const plugin = createTextRecognitionPlugin();
      plugin.scanText(frame);
      expect(mockScanFrame).toHaveBeenCalledWith(expect.anything(), 'up');
    });
  });
});
