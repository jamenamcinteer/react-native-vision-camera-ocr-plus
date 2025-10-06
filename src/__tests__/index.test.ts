// Mock all dependencies
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
  it('should export Camera component', () => {
    const index = require('../index');

    expect(index).toHaveProperty('Camera');
    expect(typeof index.Camera).toBe('function');
  });

  it('should export useTranslate hook', () => {
    const index = require('../index');

    expect(index).toHaveProperty('useTranslate');
    expect(typeof index.useTranslate).toBe('function');
  });

  it('should export useTextRecognition hook', () => {
    const index = require('../index');

    expect(index).toHaveProperty('useTextRecognition');
    expect(typeof index.useTextRecognition).toBe('function');
  });

  it('should export RemoveLanguageModel function', () => {
    const index = require('../index');

    expect(index).toHaveProperty('RemoveLanguageModel');
    expect(typeof index.RemoveLanguageModel).toBe('function');
  });

  it('should export PhotoRecognizer function', () => {
    const index = require('../index');

    expect(index).toHaveProperty('PhotoRecognizer');
    expect(typeof index.PhotoRecognizer).toBe('function');
  });

  it('should have exactly the expected exports', () => {
    const index = require('../index');
    const expectedExports = [
      'Camera',
      'useTranslate',
      'useTextRecognition',
      'RemoveLanguageModel',
      'PhotoRecognizer',
    ];

    const actualExports = Object.keys(index);

    expectedExports.forEach((exportName) => {
      expect(actualExports).toContain(exportName);
    });
  });

  it('should not export any unexpected properties', () => {
    const index = require('../index');
    const expectedExports = [
      'Camera',
      'useTranslate',
      'useTextRecognition',
      'RemoveLanguageModel',
      'PhotoRecognizer',
    ];

    const actualExports = Object.keys(index);
    const unexpectedExports = actualExports.filter(
      (exportName) => !expectedExports.includes(exportName)
    );

    expect(unexpectedExports).toEqual([]);
  });

  describe('Import verification', () => {
    it('should import Camera components correctly', () => {
      const { Camera: MockCamera } = require('../Camera');
      const index = require('../index');

      expect(index.Camera).toBe(MockCamera);
    });

    it('should import hooks correctly', () => {
      const {
        useTranslate: MockUseTranslate,
        useTextRecognition: MockUseTextRecognition,
      } = require('../Camera');
      const index = require('../index');

      expect(index.useTranslate).toBe(MockUseTranslate);
      expect(index.useTextRecognition).toBe(MockUseTextRecognition);
    });

    it('should import RemoveLanguageModel correctly', () => {
      const {
        RemoveLanguageModel: MockRemoveLanguageModel,
      } = require('../RemoveLanguageModel');
      const index = require('../index');

      expect(index.RemoveLanguageModel).toBe(MockRemoveLanguageModel);
    });

    it('should import PhotoRecognizer correctly', () => {
      const {
        PhotoRecognizer: MockPhotoRecognizer,
      } = require('../PhotoRecognizer');
      const index = require('../index');

      expect(index.PhotoRecognizer).toBe(MockPhotoRecognizer);
    });
  });
});
