import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import App from './App';
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(() => null),
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(),
  useFrameProcessor: jest.fn(),
}));

jest.mock('react-native-vision-camera-ocr', () => ({
  useTextRecognition: jest.fn(() => ({
    scanText: jest.fn(),
  })),
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunOnJS: jest.fn((fn) => fn),
  },
}));

describe('App', () => {
  it('renders a message when no camera device is available', () => {
    (useCameraDevice as jest.Mock).mockReturnValue(null);
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    const { getByText } = render(<App />);
    expect(getByText('No camera device')).toBeTruthy();
  });

  it('renders a message when requesting camera permission', () => {
    (useCameraDevice as jest.Mock).mockReturnValue({});
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn(),
    });

    const { getByText } = render(<App />);
    expect(getByText('Requesting camera permission…')).toBeTruthy();
  });

  it('renders the camera and overlay when device and permission are available', () => {
    (useCameraDevice as jest.Mock).mockReturnValue({});
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    const { getByText } = render(<App />);
    expect(getByText('Detected text:')).toBeTruthy();
  });

  it('updates detected text when onText is called', () => {
    (useCameraDevice as jest.Mock).mockReturnValue({});
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    const { getByText, queryByText } = render(<App />);
    expect(queryByText('Sample text')).toBeNull();

    fireEvent(getByText('Detected text:'), 'onText', 'Sample text');
    expect(getByText('Sample text')).toBeTruthy();
  });
});
