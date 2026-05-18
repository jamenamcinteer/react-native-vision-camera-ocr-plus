"use strict";
describe('Type definitions and edge cases', () => {
    describe('Languages union', () => {
        it('should support all 57 defined language codes', () => {
            const supportedLanguages = [
                'af',
                'sq',
                'ar',
                'be',
                'bn',
                'bg',
                'ca',
                'zh',
                'cs',
                'da',
                'nl',
                'en',
                'eo',
                'et',
                'fi',
                'fr',
                'gl',
                'ka',
                'de',
                'el',
                'gu',
                'ht',
                'he',
                'hi',
                'hu',
                'is',
                'id',
                'ga',
                'it',
                'ja',
                'kn',
                'ko',
                'lv',
                'lt',
                'mk',
                'ms',
                'mt',
                'mr',
                'no',
                'fa',
                'pl',
                'pt',
                'ro',
                'ru',
                'sk',
                'sl',
                'es',
                'sw',
                'tl',
                'ta',
                'te',
                'th',
                'tr',
                'uk',
                'ur',
                'vi',
                'cy',
            ];
            expect(supportedLanguages).toHaveLength(57);
            expect(supportedLanguages).toContain('en');
            expect(supportedLanguages).toContain('zh');
            expect(supportedLanguages).toContain('ja');
            expect(supportedLanguages).toContain('ko');
            expect(supportedLanguages).toContain('ar');
        });
    });
    describe('TextRecognitionOptions script languages', () => {
        it('should support all five recognition scripts', () => {
            const scripts = ['latin', 'chinese', 'devanagari', 'japanese', 'korean'];
            expect(scripts).toHaveLength(5);
            scripts.forEach((script) => {
                expect(typeof script).toBe('string');
            });
        });
    });
    describe('ScanRegion percentage strings', () => {
        it('should construct valid ScanRegion objects', () => {
            const region = {
                left: '10%',
                top: '20%',
                width: '80%',
                height: '30%',
            };
            expect(region.left).toBe('10%');
            expect(region.top).toBe('20%');
            expect(region.width).toBe('80%');
            expect(region.height).toBe('30%');
        });
        it('should support 0% boundary value', () => {
            const region = {
                left: '0%',
                top: '0%',
                width: '100%',
                height: '100%',
            };
            expect(region.left).toBe('0%');
            expect(region.width).toBe('100%');
        });
    });
    describe('Text result shape', () => {
        it('should match the expected Text structure', () => {
            const text = {
                resultText: 'Hello World',
                blocks: [
                    {
                        blockText: 'Hello World',
                        blockFrame: {
                            boundingCenterX: 50,
                            boundingCenterY: 50,
                            height: 20,
                            width: 100,
                            x: 0,
                            y: 40,
                        },
                        blockCornerPoints: [
                            { x: 0, y: 40 },
                            { x: 100, y: 40 },
                            { x: 100, y: 60 },
                            { x: 0, y: 60 },
                        ],
                        lines: [
                            {
                                lineText: 'Hello World',
                                lineFrame: {
                                    boundingCenterX: 50,
                                    boundingCenterY: 50,
                                    height: 20,
                                    width: 100,
                                    x: 0,
                                    y: 40,
                                },
                                lineCornerPoints: [],
                                lineLanguages: ['en'],
                                elements: [
                                    {
                                        elementText: 'Hello',
                                        elementFrame: {
                                            boundingCenterX: 25,
                                            boundingCenterY: 50,
                                            height: 20,
                                            width: 50,
                                            x: 0,
                                            y: 40,
                                        },
                                        elementCornerPoints: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(text).toHaveProperty('resultText', 'Hello World');
            expect(text.blocks).toHaveLength(1);
            expect(text.blocks[0]).toHaveProperty('blockText', 'Hello World');
            expect(text.blocks[0].lines).toHaveLength(1);
            expect(text.blocks[0].lines[0].elements).toHaveLength(1);
            expect(text.blocks[0].lines[0].elements[0].elementText).toBe('Hello');
        });
        it('should handle empty text result', () => {
            const emptyText = { resultText: '', blocks: [] };
            expect(emptyText.resultText).toBe('');
            expect(emptyText.blocks).toHaveLength(0);
        });
    });
    describe('PhotoOptions', () => {
        it('should accept all valid orientation values', () => {
            const orientations = [
                'portrait',
                'portraitUpsideDown',
                'landscapeLeft',
                'landscapeRight',
            ];
            orientations.forEach((orientation) => {
                const options = { uri: 'file:///test.jpg', orientation };
                expect(options.orientation).toBe(orientation);
            });
        });
        it('should accept options with only a URI', () => {
            const options = { uri: 'file:///test.jpg' };
            expect(options.uri).toBe('file:///test.jpg');
            expect(options).not.toHaveProperty('orientation');
        });
    });
    describe('Nitro TextRecognitionConfig', () => {
        it('should construct a valid config object', () => {
            const config = {
                language: 'latin',
                frameSkipThreshold: 10,
                useLightweightMode: false,
            };
            expect(config.language).toBe('latin');
            expect(config.frameSkipThreshold).toBe(10);
            expect(config.useLightweightMode).toBe(false);
        });
        it('should support a scanRegion in the config', () => {
            const config = {
                language: 'latin',
                frameSkipThreshold: 10,
                useLightweightMode: false,
                scanRegion: { left: 10, top: 20, width: 80, height: 30 },
            };
            expect(config.scanRegion).toEqual({
                left: 10,
                top: 20,
                width: 80,
                height: 30,
            });
        });
    });
    describe('Nitro RecognizedText shape', () => {
        it('should match the HybridObject result structure', () => {
            const result = {
                resultText: 'OCR output',
                blocks: [
                    {
                        blockText: 'OCR output',
                        blockFrame: {
                            boundingCenterX: 100,
                            boundingCenterY: 50,
                            height: 40,
                            width: 200,
                            x: 0,
                            y: 30,
                        },
                        blockCornerPoints: [{ x: 0, y: 30 }],
                        lines: [],
                    },
                ],
            };
            expect(result.resultText).toBe('OCR output');
            expect(result.blocks[0].blockFrame.width).toBe(200);
        });
    });
});
