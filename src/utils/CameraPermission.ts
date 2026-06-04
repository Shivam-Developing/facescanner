import { Alert } from 'react-native';
import { isMockEnvironment } from './Environment';

let VisionCamera: any = null;
let ExpoCamera: any = null;

try {
  if (!isMockEnvironment()) {
    VisionCamera = require('react-native-vision-camera').Camera;
  } else {
    ExpoCamera = require('expo-camera');
  }
} catch (e) {
  console.warn('[CameraPermission] Native camera libraries missing, using default permission resolution.');
}

export const requestCameraPermission = async (): Promise<boolean> => {
  // Snack / Expo Go Fallback
  if (isMockEnvironment() && ExpoCamera) {
    try {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings to use face authentication.',
        );
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[CameraPermission] Failed to request Expo Camera permission, falling back:', e);
    }
  }

  // Stand-alone Production EAS builds
  if (VisionCamera) {
    try {
      const status = await VisionCamera.requestCameraPermission();
      if (status === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings to use face authentication.',
        );
        return false;
      }
      return status === 'granted';
    } catch (e) {
      console.warn('[CameraPermission] Failed to request Vision Camera permission, falling back:', e);
    }
  }

  // Web Browser / Simulator fallback
  if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (e) {
      console.log('[CameraPermission] Web camera access denied.');
      return false;
    }
  }

  console.log('[CameraPermission] Automatically resolving permission as granted.');
  return true;
};
