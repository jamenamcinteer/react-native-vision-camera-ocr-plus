describe('PhotoRecognizer', () => {
  let PhotoRecognizer: any;

  beforeAll(() => {
    // Mock React Native before requiring PhotoRecognizer
    jest.doMock('react-native', () => ({
      NativeModules: {
        PhotoRecognizerModule: {
          process: jest.fn().mockResolvedValue({
            blocks: [],
            resultText: 'test result',
          }),
        },
      },
      Platform: {
        OS: 'ios',
      },
    }));

    // Now we can safely import PhotoRecognizer
    PhotoRecognizer = require('../PhotoRecognizer').PhotoRecognizer;
  });

  it('should throw error for invalid URI', async () => {
    await expect(PhotoRecognizer({ uri: '' })).rejects.toThrow(
      "Can't resolve img uri"
    );
  });

  it('should process valid URI', async () => {
    const result = await PhotoRecognizer({ uri: 'file:///test.jpg' });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('resultText');
  });

  it('should handle orientation parameter', async () => {
    const result = await PhotoRecognizer({
      uri: 'file:///test.jpg',
      orientation: 'landscape',
    });
    expect(result).toBeDefined();
  });
});