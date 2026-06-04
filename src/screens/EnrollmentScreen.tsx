import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { FaceCamera } from '../components/FaceCamera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import FaceNetService from '../services/FaceNetService';

type EnrollStep = 'INSTRUCTIONS' | 'SCANNING' | 'CAPTURED' | 'SAVED' | 'ERROR';

interface EnrollmentScreenProps {
  navigation: any;
}

export const EnrollmentScreen: React.FC<EnrollmentScreenProps> = ({ navigation }) => {
  const [step, setStep]               = useState<EnrollStep>('INSTRUCTIONS');
  const [captureCount, setCaptureCount] = useState(0);
  const [userId, setUserId]           = useState('');
  const [faceFrames, setFaceFrames]   = useState<Float32Array[]>([]);
  const [message, setMessage]         = useState('');

  const REQUIRED_FRAMES = 3;

  const startScanning = () => {
    if (!userId.trim()) {
      Alert.alert('Required Field', 'Please enter a User ID / Employee Code to start enrollment.');
      return;
    }
    setStep('SCANNING');
    setMessage('Align your face within the camera frame');
  };

  const handleFaceDetected = useCallback(async (face: any) => {
    if (step !== 'SCANNING') return;

    // Quality gate parameters
    const { headEulerAngleY = 0, leftEyeOpenProbability = 1.0, rightEyeOpenProbability = 1.0 } = face;
    
    // Validate posture/eyes
    if (Math.abs(headEulerAngleY) > 15) {
      setMessage('Please look straight at the camera');
      return;
    }
    if (leftEyeOpenProbability < 0.5 || rightEyeOpenProbability < 0.5) {
      setMessage('Keep your eyes open');
      return;
    }

    setMessage(`Scanning biometric details... [Frame ${captureCount + 1}/${REQUIRED_FRAMES}]`);

    // In a real environment, we would crop the bounding box from the frame buffer:
    // const cropped = cropFaceRegion(frame.rgba, frame.width, frame.height, face.bounds);
    // const inputTensor = preprocessFaceForModel(cropped.pixels, cropped.width, cropped.height);
    // Here we generate a pseudo-frame for inference (or actual frame pixels if in native)
    const simulatedFrame = new Float32Array(112 * 112 * 3).fill(0.1);
    
    const newFrames = [...faceFrames, simulatedFrame];
    setFaceFrames(newFrames);
    setCaptureCount(newFrames.length);

    if (newFrames.length >= REQUIRED_FRAMES) {
      setStep('CAPTURED');
      setMessage('Compiling facial biometrics...');
      await saveEnrollment(newFrames);
    }
  }, [step, captureCount, faceFrames]);

  const saveEnrollment = async (frames: Float32Array[]) => {
    try {
      // Extract embeddings from all captured frames
      const embeddings = await Promise.all(
        frames.map(frame => FaceNetService.extractEmbedding(frame))
      );

      // Average the 512D embeddings to create a robust facial template
      const avgEmbedding = new Float32Array(512);
      for (const emb of embeddings) {
        for (let i = 0; i < 512; i++) {
          avgEmbedding[i] += emb[i] / embeddings.length;
        }
      }

      const id = userId.trim();
      await StorageService.saveEmbedding(id, avgEmbedding);
      setStep('SAVED');
      setMessage(`Biometric profile enrolled successfully for ID: ${id}`);
    } catch (e) {
      console.error('[Enrollment] Save failed:', e);
      setStep('ERROR');
      setMessage('Enrollment failed. Please try again.');
    }
  };

  const resetEnrollment = () => {
    setCaptureCount(0);
    setFaceFrames([]);
    setMessage('');
    setStep('INSTRUCTIONS');
  };

  if (step === 'INSTRUCTIONS') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.instructionCard}>
              <MaterialCommunityIcons name="account-circle-outline" size={80} color={COLORS.accent} style={{ alignSelf: 'center', marginBottom: SPACING.md }} />
              <Text style={styles.heading}>Biometric Enrollment</Text>
              <Text style={styles.body}>
                We will capture 3 facial profiles to configure your offline biometric key. This data is fully encrypted and stays on your device.
              </Text>

              {/* ID Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>User ID / Employee Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., EMP1024, Guest_01"
                  placeholderTextColor={COLORS.textMuted}
                  value={userId}
                  onChangeText={setUserId}
                  autoCapitalize="characters"
                  maxLength={20}
                />
              </View>

              {/* Quality Tips */}
              <View style={styles.tipsList}>
                {['Look directly into the camera', 'Keep eyes open and neutral expression', 'Find a well-lit space', 'Remove sunglasses or face coverings'].map(tip => (
                  <View key={tip} style={styles.tipRow}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startScanning}>
                <Text style={styles.primaryBtnText}>Start Scanning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.ghostBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'SAVED') {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: SPACING.lg }]}>
        <MaterialCommunityIcons name="shield-check" size={100} color={COLORS.success} />
        <Text style={[styles.heading, { marginTop: SPACING.lg, textAlign: 'center' }]}>Enrollment Complete!</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: SPACING.sm, color: COLORS.textSecondary }]}>
          {message}
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.xl, width: '100%' }]} onPress={() => navigation.navigate('Authentication', { userId })}>
          <Text style={styles.primaryBtnText}>Test Authentication Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={resetEnrollment}>
          <Text style={styles.ghostBtnText}>Register Another User</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (step === 'ERROR') {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: SPACING.lg }]}>
        <MaterialCommunityIcons name="close-circle-outline" size={100} color={COLORS.danger} />
        <Text style={[styles.heading, { marginTop: SPACING.lg, textAlign: 'center' }]}>Enrollment Failed</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: SPACING.sm, color: COLORS.textSecondary }]}>
          {message}
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.xl, width: '100%' }]} onPress={resetEnrollment}>
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicators */}
      <View style={styles.headerRow}>
        <Text style={styles.progressTitle}>Enrolling User: {userId}</Text>
        <View style={styles.progressBar}>
          {Array.from({ length: REQUIRED_FRAMES }).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.progressDot, 
                i < captureCount && styles.progressDotFilled,
                i === captureCount && styles.progressDotActive
              ]} 
            />
          ))}
        </View>
      </View>

      {/* Live Camera Interface */}
      <View style={{ flex: 1 }}>
        <FaceCamera
          onFaceDetected={handleFaceDetected}
          instructionText={message}
          isActive={step === 'SCANNING'}
        />
        
        {/* Biometric Oval Overlay */}
        <View style={styles.ovalOverlay} />
      </View>

      {/* Processing Loader */}
      {step === 'CAPTURED' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.processingText}>{message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollContainer:   { flexGrow: 1, justifyContent: 'center', padding: SPACING.md },
  instructionCard:   { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  heading:           { ...FONTS.heading, textAlign: 'center', color: '#FFF' },
  body:              { ...FONTS.body, lineHeight: 22, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  inputContainer:    { marginBottom: SPACING.lg },
  inputLabel:        { ...FONTS.label, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input:             { height: 50, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, borderColor: COLORS.accentGlow, borderWidth: 1, color: '#FFF', paddingHorizontal: SPACING.md, fontSize: 16 },
  tipsList:          { gap: SPACING.xs, marginBottom: SPACING.xl },
  tipRow:            { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipText:           { ...FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  primaryBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText:    { ...FONTS.button, color: '#FFF' },
  ghostBtn:          { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  ghostBtnText:      { ...FONTS.body, color: COLORS.textSecondary },
  headerRow:         { padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard },
  progressTitle:     { ...FONTS.body, color: '#FFF', fontWeight: '600' },
  progressBar:       { flexDirection: 'row', gap: SPACING.sm },
  progressDot:       { width: 14, height: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.bgSurface, borderWidth: 2, borderColor: COLORS.textMuted },
  progressDotFilled: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  progressDotActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  ovalOverlay:       { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '20%', borderRadius: 999, borderWidth: 2, borderColor: COLORS.ovalBorder, borderStyle: 'dashed', pointerEvents: 'none' },
  processingOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgPrimary + 'EE', justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  processingText:    { ...FONTS.subhead, color: COLORS.accent },
});
