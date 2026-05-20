jest.mock('../Camera', () => ({
  Camera: jest.fn(),
  useTranslate: jest.fn(),
  useTextRecognition: jest.fn(),
}));

jest.mock('../RemoveLanguageModel', () => ({
  RemoveLanguageModel: jest.fn(),
}));

jest.mock('../PhotoRecognizer', () => ({
  PhotoRecognizer: jest.fn(),
}));

describe('Index Exports', () => {
  let index: any;

  beforeAll(() => {
    index = require('../index');
  });

  describe('React components and hooks', () => {
    it('should export Camera component', () => {
      expect(index).toHaveProperty('Camera');
      expect(typeof index.Camera).toBe('function');
    });

    it('should export useTextRecognition hook', () => {
      expect(index).toHaveProperty('useTextRecognition');
      expect(typeof index.useTextRecognition).toBe('function');
    });

    it('should export useTranslate hook', () => {
      expect(index).toHaveProperty('useTranslate');
      expect(typeof index.useTranslate).toBe('function');
    });
  });

  describe('Async utilities', () => {
    it('should export PhotoRecognizer function', () => {
      expect(index).toHaveProperty('PhotoRecognizer');
      expect(typeof index.PhotoRecognizer).toBe('function');
    });

    it('should export RemoveLanguageModel function', () => {
      expect(index).toHaveProperty('RemoveLanguageModel');
      expect(typeof index.RemoveLanguageModel).toBe('function');
    });
  });

  describe('Expected exports present', () => {
    const expectedExports = [
      'Camera',
      'useTextRecognition',
      'useTranslate',
      'PhotoRecognizer',
      'RemoveLanguageModel',
    ];

    expectedExports.forEach((name) => {
      it(`should export "${name}"`, () => {
        expect(index).toHaveProperty(name);
      });
    });
  });
});
