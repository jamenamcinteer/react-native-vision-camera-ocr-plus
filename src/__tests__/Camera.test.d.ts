declare const memoStore: {
    deps?: ReadonlyArray<unknown>;
    value: unknown;
}[];
declare let memoIndex: number;
declare const useMemoMock: <T>(factory: () => T, deps?: ReadonlyArray<unknown>) => T;
declare const forwardRefMock: (render: any) => (props: any) => any;
declare const createElementMock: (type: any, props: any, ...children: any[]) => {
    type: any;
    props: any;
};
declare const mockCreateTextRecognitionPlugin: jest.Mock<{
    scanText: jest.Mock<any, any, any>;
}, [], any>;
declare const mockCreateTranslatorPlugin: jest.Mock<{
    translate: jest.Mock<any, any, any>;
}, [], any>;
declare const mockUseFrameProcessor: jest.Mock<any, any, any>;
declare const mockUseRunOnJS: jest.Mock<any, any, any>;
