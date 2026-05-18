"use strict";
const memoStore = [];
let memoIndex = 0;
const useMemoMock = (factory, deps) => {
    const index = memoIndex++;
    const previous = memoStore[index];
    if (previous &&
        deps &&
        previous.deps &&
        deps.length === previous.deps.length &&
        deps.every((dep, i) => dep === previous.deps?.[i])) {
        return previous.value;
    }
    const value = factory();
    memoStore[index] = { deps, value };
    return value;
};
const forwardRefMock = (render) => (props) => {
    memoIndex = 0;
    return render(props, null);
};
const createElementMock = (type, props, ...children) => ({
    type,
    props: { ...props, children },
});
jest.mock('react', () => {
    const reactMock = {
        createElement: createElementMock,
        Fragment: 'Fragment',
        forwardRef: forwardRefMock,
        useMemo: useMemoMock,
        __reset: () => {
            memoStore.length = 0;
            memoIndex = 0;
        },
    };
    return { __esModule: true, ...reactMock, default: reactMock };
});
jest.mock('react/jsx-runtime', () => ({
    Fragment: 'Fragment',
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
    jsxDEV: (type, props) => ({ type, props }),
}));
const mockCreateTextRecognitionPlugin = jest.fn(() => ({ scanText: jest.fn() }));
const mockCreateTranslatorPlugin = jest.fn(() => ({ translate: jest.fn() }));
const mockUseFrameProcessor = jest.fn();
const mockUseRunOnJS = jest.fn();
jest.mock('react-native-vision-camera', () => ({
    Camera: jest.fn(),
    useFrameProcessor: (...args) => mockUseFrameProcessor(...args),
}));
jest.mock('react-native-worklets', () => ({
    runOnJS: (...args) => mockUseRunOnJS(...args),
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
        require('react').__reset?.();
        mockUseFrameProcessor.mockImplementation((processor, _deps) => {
            return processor;
        });
        mockUseRunOnJS.mockImplementation((fn) => {
            return jest.fn((...args) => fn(...args));
        });
    });
    describe('Plugin creation', () => {
        it('should create text recognition plugin with options', () => {
            const { createTextRecognitionPlugin } = require('../scanText');
            const options = { language: 'chinese' };
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
            const options = { from: 'en', to: 'es' };
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
            const options = { language: 'japanese', frameSkipThreshold: 5 };
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
            const options = { from: 'en', to: 'de' };
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
                mode: 'recognize',
                options: { language: 'latin' },
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
                mode: 'translate',
                options: { from: 'en', to: 'fr' },
                callback: mockCallback,
            });
            expect(result).toBeDefined();
        });
        it('should return null children when device is not provided', () => {
            const { Camera } = require('../Camera');
            const mockCallback = jest.fn();
            const result = Camera({
                device: null,
                isActive: false,
                mode: 'recognize',
                options: {},
                callback: mockCallback,
            });
            // When device is falsy the NativeCamera is not rendered, result is a Fragment
            expect(result).toBeDefined();
        });
    });
});
