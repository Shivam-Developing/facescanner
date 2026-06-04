import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../config/DesignTokens';
import { requestCameraPermission } from '../utils/CameraPermission';
import { isMockEnvironment } from '../utils/Environment';
import LivenessDetector from '../services/LivenessDetector';

let VisionCamera: any = null;
let useCameraDevice: any = null;
let useFrameProcessor: any = null;
let runOnJS: any = null;
let useFaceDetector: any = null;
let useResizePlugin: any = null;

let ExpoCameraView: any = null;

try {
  if (!isMockEnvironment()) {
    const vc = require('react-native-vision-camera');
    VisionCamera = vc.Camera;
    useCameraDevice = vc.useCameraDevice;
    useFrameProcessor = vc.useFrameProcessor;

    const wc = require('react-native-worklets-core');
    runOnJS = wc.runOnJS;

    const ml = require('@react-native-ml-kit/face-detection');
    useFaceDetector = ml.useFaceDetector;

    useResizePlugin = require('vision-camera-resize-plugin').useResizePlugin;
  } else {
    ExpoCameraView = require('expo-camera').CameraView;
  }
} catch (e) {
  console.warn('[FaceCamera] Native camera modules failed to load, falling back to mock view.');
}

interface FaceCameraProps {
  onFaceDetected:  (face: any, facePixels: Float32Array | null) => void;
  onNoFace?:       () => void;
  instructionText?: string;
  isActive?:       boolean;
}

export const FaceCamera: React.FC<FaceCameraProps> = ({
  onFaceDetected,
  onNoFace,
  instructionText = 'Position your face in the oval',
  isActive = true,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const mockTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    requestCameraPermission().then(granted => {
      setHasPermission(granted);
      setPermissionChecked(true);
    });
    return () => {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    };
  }, []);

  // ── Mock Face Detection Loop (Expo Snack / Expo Go) ──
  useEffect(() => {
    if (!isMockEnvironment() || !isActive || !hasPermission) {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
      return;
    }

    const triggerMockDetection = () => {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
      
      // Delay before face is "detected" to simulate user positioning
      mockTimeoutRef.current = setTimeout(() => {
        const challenge = LivenessDetector.getCurrentChallenge();
        
        // Construct a mock face object matching the current liveness challenge
        const mockFace: any = {
          leftEyeOpenProbability: 1.0,
          rightEyeOpenProbability: 1.0,
          smilingProbability: 0.1,
          headEulerAngleY: 0.0,
          bounds: { left: 100, top: 150, width: 280, height: 280 },
          frame: { width: 480, height: 640 }
        };

        if (challenge === 'BLINK') {
          mockFace.leftEyeOpenProbability = 0.1;
          mockFace.rightEyeOpenProbability = 0.1;
        } else if (challenge === 'SMILE') {
          mockFace.smilingProbability = 0.95;
        } else if (challenge === 'TURN_LEFT') {
          mockFace.headEulerAngleY = 30; // degrees
        } else if (challenge === 'TURN_RIGHT') {
          mockFace.headEulerAngleY = -30; // degrees
        }

        console.log(`[FaceCamera Mock] Face detected for challenge: ${challenge || 'None'}`);
        onFaceDetected(mockFace);

        // Continue detection loop if still active
        if (isActive) {
          triggerMockDetection();
        }
      }, 2500); // Trigger every 2.5 seconds
    };

    triggerMockDetection();

    return () => {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    };
  }, [isActive, hasPermission, onFaceDetected]);

  // ── Native Face Detection Configuration ──
  const device = useCameraDevice ? useCameraDevice('front') : null;
  const detector = useFaceDetector ? useFaceDetector({
    performanceMode:    'fast',
    landmarkMode:       'all',
    classificationMode: 'all',
    contourMode:        'none',
    minFaceSize:        0.15,
  }) : null;

  // Set up the resize plugin hook at the top level
  const resizePlugin = useResizePlugin ? useResizePlugin() : null;
  const resize = resizePlugin ? resizePlugin.resize : null;

  const handleFacesWithPixels = useCallback((faces: any[], pixels: Float32Array | null) => {
    if (faces.length > 0) {
      onFaceDetected(faces[0], pixels);
    } else {
      onNoFace?.();
    }
  }, [onFaceDetected, onNoFace]);

  const frameProcessor = useFrameProcessor ? useFrameProcessor((frame: any) => {
    'worklet';
    if (detector) {
      const faces = detector.detectFaces(frame);
      if (faces.length > 0 && resize != null) {
        const face = faces[0];
        const bbox = face.bounds;

        // Ensure crop boundaries are within frame bounds
        const cropX = Math.max(0, bbox.left);
        const cropY = Math.max(0, bbox.top);
        const cropW = Math.min(bbox.width, frame.width - cropX);
        const cropH = Math.min(bbox.height, frame.height - cropY);

        // Crop the exact face bounding box and resize to 112x112
        const resized = resize(frame, {
          scale: { width: 112, height: 112 },
          crop: {
            x: cropX,
            y: cropY,
            width: cropW,
            height: cropH,
          },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });
        
        // Normalize RGB values from [0, 255] to [-1.0, 1.0] for MobileFaceNet
        const normalized = new Float32Array(resized.length);
        for (let i = 0; i < resized.length; i++) {
          normalized[i] = (resized[i] - 127.5) / 127.5;
        }
        
        runOnJS(handleFacesWithPixels)(faces, normalized);
      } else {
        runOnJS(handleFacesWithPixels)(faces, null);
      }
    }
  }, [detector, handleFacesWithPixels, resize]) : null;

  if (!permissionChecked) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Camera permission required</Text>
      </View>
    );
  }

  // ── Render Snack Fallback (expo-camera) ──
  if (isMockEnvironment() && ExpoCameraView) {
    return (
      <View style={styles.wrapper}>
        <ExpoCameraView
          style={styles.camera}
          facing="front"
        />
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>{instructionText}</Text>
        </View>
        <View style={styles.snackOverlay}>
          <Text style={styles.snackOverlayText}>[Expo Snack Preview Mode]</Text>
        </View>
      </View>
    );
  }

  // ── Render Native Production Camera (Vision Camera) ──
  if (!device) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Front camera device not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {VisionCamera && (
        <VisionCamera
          style={styles.camera}
          device={device}
          isActive={isActive}
          frameProcessor={frameProcessor}
          fps={15}
        />
      )}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>{instructionText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:          { flex: 1, position: 'relative' },
  camera:           { flex: 1 },
  instructionBanner:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgPrimary + 'CC', padding: SPACING.md },
  instructionText:  { ...FONTS.subhead, textAlign: 'center' },
  placeholder:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCard },
  placeholderText:  { ...FONTS.body },
  snackOverlay:     { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(76, 142, 247, 0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  snackOverlayText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
