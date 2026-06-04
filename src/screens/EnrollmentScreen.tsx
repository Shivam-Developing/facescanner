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
    setMessage('Align your face within the scanner oval');
  };

  const handleFaceDetected = useCallback(async (face: any, facePixels: Float32Array | null) => {
    if (step !== 'SCANNING') return;

    // Quality gate parameters
    const { headEulerAngleY = 0, leftEyeOpenProbability = 1.0, rightEyeOpenProbability = 1.0 } = face;
    
    // Validate posture/eyes
    if (Math.abs(headEulerAngleY) > 15) {
      setMessage('Align face: Look straight forward');
      return;
    }
    if (leftEyeOpenProbability < 0.5 || rightEyeOpenProbability < 0.5) {
      setMessage('Align face: Keep eyes fully open');
      return;
    }

    setMessage(`Biometric Captured [Frame ${captureCount + 1}/${REQUIRED_FRAMES}]`);

    // Use actual face pixels if available (native mode), or fallback to simulated frame (mock/Snack mode)
    const inputFrame = facePixels || new Float32Array(112 * 112 * 3).fill(0.1);
    
    const newFrames = [...faceFrames, inputFrame];
    setFaceFrames(newFrames);
    setCaptureCount(newFrames.length);

    if (newFrames.length >= REQUIRED_FRAMES) {
      setStep('CAPTURED');
      setMessage('Compiling facial vector keys...');
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
      setMessage(`Biometric vector registered successfully for ID: ${id}`);
    } catch (e) {
      console.error('[Enrollment] Save failed:', e);
      setStep('ERROR');
      setMessage('Biometric compile failed. System index error.');
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
              <View style={styles.badgeCircle}>
                <MaterialCommunityIcons name="account-key-outline" size={48} color={COLORS.accent} />
              </View>
              
              <Text style={styles.heading}>Biometric Setup</Text>
              <Text style={styles.body}>
                Enroll your operator ID to generate a secure 512D facial key vector. Data remains 100% on-device and fully encrypted.
              </Text>

              {/* ID Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Operator ID / Employee Code</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="badge-account-outline" size={20} color={COLORS.textSecondary} style={{ marginLeft: SPACING.md }} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. NHAI_EMP_102"
                    placeholderTextColor={COLORS.textMuted}
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                </View>
              </View>

              {/* Quality Tips */}
              <View style={styles.tipsList}>
                <Text style={styles.tipsHeader}>ENROLLMENT COMPLIANCE</Text>
                {[
                  'Ensure neutral, bright lighting',
                  'Align face directly centered in oval',
                  'Keep eyes fully open and blink naturally',
                  'Remove glasses or hats during capture'
                ].map(tip => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startScanning}>
                <Text style={styles.primaryBtnText}>Initialize Scanner</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.ghostBtnText}>Return to Terminal</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'SAVED') {
    return (
      <SafeAreaView style={[styles.container, styles.resultLayout]}>
        <View style={[styles.successGlow, { borderColor: COLORS.success }]}>
          <MaterialCommunityIcons name="check-decagram-outline" size={80} color={COLORS.success} />
        </View>
        <Text style={[styles.heading, { marginTop: SPACING.xl, textAlign: 'center' }]}>Operator Registered</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: SPACING.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg }]}>
          {message}
        </Text>
        
        <View style={styles.resultActions}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.success }]} onPress={() => navigation.navigate('Authentication', { userId })}>
            <Text style={[styles.primaryBtnText, { color: COLORS.bgPrimary }]}>Execute Verify Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryBtn} onPress={resetEnrollment}>
            <Text style={[styles.secondaryBtnText, { color: COLORS.textSecondary }]}>Add Another Operator</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'ERROR') {
    return (
      <SafeAreaView style={[styles.container, styles.resultLayout]}>
        <View style={[styles.successGlow, { borderColor: COLORS.danger }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={80} color={COLORS.danger} />
        </View>
        <Text style={[styles.heading, { marginTop: SPACING.xl, textAlign: 'center', color: COLORS.danger }]}>Scanner Timeout</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: SPACING.sm, color: COLORS.textSecondary }]}>
          {message}
        </Text>
        
        <View style={styles.resultActions}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.danger }]} onPress={resetEnrollment}>
            <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>Restart Enrollment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicators */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.progressLabel}>OPERATOR ID</Text>
          <Text style={styles.progressTitle}>{userId}</Text>
        </View>
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
  instructionCard:   { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.05)' },
  badgeCircle:       { width: 90, height: 90, borderRadius: RADIUS.full, backgroundColor: COLORS.accentGlow, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.15)' },
  heading:           { ...FONTS.heading, textAlign: 'center', color: '#FFF' },
  body:              { ...FONTS.body, lineHeight: 22, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  
  inputContainer:    { marginBottom: SPACING.xl },
  inputLabel:        { ...FONTS.label, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  inputWrapper:      { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, borderColor: 'rgba(0, 229, 255, 0.1)', borderWidth: 1 },
  input:             { flex: 1, height: '100%', color: '#FFF', paddingHorizontal: SPACING.md, fontSize: 16 },
  
  tipsList:          { backgroundColor: 'rgba(28, 34, 54, 0.3)', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xl, borderLeftWidth: 3, borderLeftColor: COLORS.accentSecondary },
  tipsHeader:        { ...FONTS.label, color: COLORS.accentSecondary, marginBottom: SPACING.sm },
  tipRow:            { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 8 },
  statusDot:         { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.accent },
  tipText:           { ...FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  
  primaryBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  primaryBtnText:    { ...FONTS.button },
  secondaryBtn:      { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.textMuted, marginTop: SPACING.sm },
  secondaryBtnText:  { ...FONTS.button, color: COLORS.textSecondary },
  ghostBtn:          { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.md },
  ghostBtnText:      { ...FONTS.body, color: COLORS.textSecondary, fontSize: 13 },
  
  headerRow:         { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  headerTextWrapper: { flex: 1 },
  progressLabel:     { ...FONTS.label, color: COLORS.textSecondary, fontSize: 9 },
  progressTitle:     { ...FONTS.heading, fontSize: 18, color: '#FFF' },
  progressBar:       { flexDirection: 'row', gap: SPACING.xs },
  progressDot:       { width: 16, height: 16, borderRadius: RADIUS.full, backgroundColor: COLORS.bgSurface, borderWidth: 2, borderColor: COLORS.textMuted },
  progressDotFilled: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  progressDotActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  ovalOverlay:       { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '20%', borderRadius: 999, borderWidth: 2, borderColor: COLORS.ovalBorder, borderStyle: 'dashed', pointerEvents: 'none' },
  processingOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgPrimary + 'F2', justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  processingText:    { ...FONTS.subhead, color: COLORS.accent },
  
  resultLayout:      { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  successGlow:       { width: 140, height: 140, borderRadius: RADIUS.full, borderWidth: 3.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28, 34, 54, 0.25)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15 },
  resultActions:     { width: '100%', marginTop: SPACING.xxl, gap: SPACING.sm },
});
