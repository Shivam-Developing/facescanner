import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { FaceCamera } from '../components/FaceCamera';
import LivenessDetector from '../services/LivenessDetector';
import FaceNetService from '../services/FaceNetService';
import StorageService from '../services/StorageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isMockEnvironment } from '../utils/Environment';

type AuthStep = 'IDLE' | 'LIVENESS' | 'MATCHING' | 'SUCCESS' | 'FAIL';

const CHALLENGE_ICONS: Record<string, string> = {
  BLINK:      'eye-outline',
  SMILE:      'emoticon-happy-outline',
  TURN_LEFT:  'rotate-left',
  TURN_RIGHT: 'rotate-right',
};

const CHALLENGE_LABELS: Record<string, string> = {
  BLINK:      'Blink your eyes',
  SMILE:      'Smile naturally',
  TURN_LEFT:  'Turn your head left',
  TURN_RIGHT: 'Turn your head right',
};

interface AuthenticationScreenProps {
  navigation: any;
  route: any;
}

export const AuthenticationScreen: React.FC<AuthenticationScreenProps> = ({ navigation, route }) => {
  const initialUserId = route?.params?.userId || '';

  const [step, setStep]             = useState<AuthStep>('IDLE');
  const [userId, setUserId]           = useState(initialUserId);
  const [challenge, setChallenge]   = useState('');
  const [statusText, setStatusText] = useState('');
  const [timer, setTimer]           = useState(7);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const ringScale = useRef(new Animated.Value(1)).current;

  // Pulse animation on the biometric ring during matching/scanning
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (step === 'LIVENESS' || step === 'MATCHING') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1.00, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      ringScale.setValue(1);
    }
    return () => animation?.stop();
  }, [step]);

  // Clean up timer
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startAuthentication = async () => {
    const id = userId.trim();
    if (!id) {
      Alert.alert('Required Field', 'Please enter your User ID / Employee Code.');
      return;
    }

    // Verify user exists in offline database
    const storedEmbedding = await StorageService.getEmbedding(id);
    if (!storedEmbedding) {
      Alert.alert(
        'User Not Enrolled',
        `No facial template found for ID: ${id}. Please register this user first.`
      );
      return;
    }

    // Start challenge
    LivenessDetector.reset();
    const issued = LivenessDetector.issueChallenge();
    setChallenge(issued);
    setStep('LIVENESS');
    setTimer(7);
    setStatusText(CHALLENGE_LABELS[issued] || 'Authenticate your face');

    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          failAuthentication('Time out. Liveness check failed.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const failAuthentication = async (message: string) => {
    setStep('FAIL');
    setStatusText(message);
    LivenessDetector.reset();
    if (timerRef.current) clearInterval(timerRef.current);

    // Log failed attempt
    await StorageService.logAuthEvent({
      userId: userId.trim(),
      timestamp: Date.now(),
      success: false,
      similarity: 0.0,
      challenge: challenge || 'NONE',
      synced: false,
    });
  };

  const handleFaceDetected = useCallback(async (face: any, facePixels: Float32Array | null) => {
    if (step !== 'LIVENESS') return;

    // Check challenge compliance
    const passed = LivenessDetector.evaluateFace(face);
    if (!passed) return;

    // Liveness passed! Clean up timers and proceed to match
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('MATCHING');
    setStatusText('Liveness verified. Performing matching...');

    try {
      const id = userId.trim();
      const storedEmbedding = await StorageService.getEmbedding(id);
      
      if (!storedEmbedding) {
        setStep('FAIL');
        setStatusText('User template not found.');
        return;
      }

      // Extract raw frame embedding
      // (Uses mock embedding generator inside service if in Expo Go/Snack)
      const inputFrame = facePixels || new Float32Array(112 * 112 * 3).fill(0.1);
      const liveEmbedding = await FaceNetService.extractEmbedding(inputFrame);

      // Cosine similarity matching
      let similarity = FaceNetService.cosineSimilarity(liveEmbedding, storedEmbedding);
      
      // In mock/Snack mode, since liveEmbedding is randomized, it will always fail matching.
      // We simulate a successful match score ONLY in the mock environment.
      if (isMockEnvironment()) {
        // Force successful match score in mock mode for enrolled users
        similarity = 0.82 + Math.random() * 0.1;
      }

      const matched = FaceNetService.isMatch(similarity);

      setStep(matched ? 'SUCCESS' : 'FAIL');
      setStatusText(matched
        ? `Identity Verified: ${(similarity * 100).toFixed(1)}% match`
        : `Access Denied: similarity ${(similarity * 100).toFixed(1)}% too low`
      );

      // Log authentication details
      await StorageService.logAuthEvent({
        userId: id,
        timestamp: Date.now(),
        success: matched,
        similarity,
        challenge,
        synced: false,
      });

    } catch (e) {
      console.error('[Authentication] Matching error:', e);
      setStep('FAIL');
      setStatusText('Authentication error occurred.');
    }
  }, [step, userId, challenge]);

  const resetState = () => {
    setStep('IDLE');
    setStatusText('');
    setChallenge('');
  };

  const ovalColor = step === 'SUCCESS' ? COLORS.ovalSuccess
                  : step === 'FAIL'    ? COLORS.ovalFail
                  : COLORS.ovalBorder;

  if (step === 'IDLE') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.instructionCard}>
              <MaterialCommunityIcons name="face-recognition" size={80} color={COLORS.accent} style={{ alignSelf: 'center', marginBottom: SPACING.md }} />
              <Text style={styles.heading}>Biometric Verification</Text>
              <Text style={styles.body}>
                Please enter your User ID. The application will issue a random liveness challenge to verify you are a live user.
              </Text>

              {/* ID Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>User ID / Employee Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter User ID to verify"
                  placeholderTextColor={COLORS.textMuted}
                  value={userId}
                  onChangeText={setUserId}
                  autoCapitalize="characters"
                  maxLength={20}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startAuthentication}>
                <Text style={styles.primaryBtnText}>Verify Identity</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Enrollment')}>
                <Text style={styles.ghostBtnText}>Or Enroll New User</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Challenge Pill */}
      {step === 'LIVENESS' && challenge && (
        <View style={styles.challengeCard}>
          <MaterialCommunityIcons
            name={CHALLENGE_ICONS[challenge] as any}
            size={32}
            color={COLORS.warning}
          />
          <View style={styles.challengeMeta}>
            <Text style={styles.challengeLabel}>Challenge Issued</Text>
            <Text style={styles.challengeText}>{CHALLENGE_LABELS[challenge]}</Text>
          </View>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{timer}s</Text>
          </View>
        </View>
      )}

      {/* Camera and Visual Guides */}
      <View style={styles.cameraWrapper}>
        <FaceCamera
          onFaceDetected={handleFaceDetected}
          instructionText={statusText}
          isActive={step === 'LIVENESS'}
        />
        
        {/* Animated Oval Ring */}
        <Animated.View style={[
          styles.ovalOverlay, 
          { 
            borderColor: ovalColor, 
            transform: [{ scale: ringScale }] 
          }
        ]} />

        {/* Results Screen Badges */}
        {(step === 'SUCCESS' || step === 'FAIL') && (
          <View style={[styles.resultOverlay, { backgroundColor: step === 'SUCCESS' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
            <MaterialCommunityIcons 
              name={step === 'SUCCESS' ? 'shield-check' : 'shield-alert'} 
              size={120} 
              color={step === 'SUCCESS' ? COLORS.success : COLORS.danger} 
            />
            <Text style={[styles.resultTitle, { color: step === 'SUCCESS' ? COLORS.success : COLORS.danger }]}>
              {step === 'SUCCESS' ? 'Access Granted' : 'Verification Failed'}
            </Text>
            <Text style={styles.resultDesc}>{statusText}</Text>
          </View>
        )}
      </View>

      {/* Action Footer */}
      <View style={styles.footerActions}>
        {step === 'MATCHING' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Comparing face template...</Text>
          </View>
        )}

        {(step === 'SUCCESS' || step === 'FAIL') && (
          <View style={{ gap: SPACING.sm }}>
            <TouchableOpacity 
              style={[styles.primaryBtn, step === 'SUCCESS' && { backgroundColor: COLORS.success }]} 
              onPress={step === 'SUCCESS' ? () => navigation.goBack() : startAuthentication}
            >
              <Text style={styles.primaryBtnText}>
                {step === 'SUCCESS' ? 'Done' : 'Try Again'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.ghostBtn} onPress={resetState}>
              <Text style={styles.ghostBtnText}>Change User ID</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollContainer:{ flexGrow: 1, justifyContent: 'center', padding: SPACING.md },
  instructionCard:{ backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  heading:        { ...FONTS.heading, textAlign: 'center', color: '#FFF' },
  body:           { ...FONTS.body, lineHeight: 22, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  inputContainer: { marginBottom: SPACING.lg },
  inputLabel:     { ...FONTS.label, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input:          { height: 50, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, borderColor: COLORS.accentGlow, borderWidth: 1, color: '#FFF', paddingHorizontal: SPACING.md, fontSize: 16 },
  primaryBtn:     { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...FONTS.button, color: '#FFF' },
  ghostBtn:       { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  ghostBtnText:   { ...FONTS.body, color: COLORS.textSecondary },
  
  challengeCard:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, margin: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  challengeMeta:  { flex: 1 },
  challengeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  challengeText:  { ...FONTS.subhead, fontWeight: '700', color: COLORS.warning, marginTop: 2 },
  timerPill:      { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  timerText:      { fontSize: 14, fontWeight: '700', color: COLORS.warning },
  
  cameraWrapper:  { flex: 1, position: 'relative' },
  ovalOverlay:    { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '20%', borderRadius: 999, borderWidth: 3, borderStyle: 'dashed', pointerEvents: 'none' },
  resultOverlay:  { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  resultTitle:    { ...FONTS.heading, fontSize: 26, marginTop: SPACING.lg, fontWeight: '700' },
  resultDesc:     { ...FONTS.body, textAlign: 'center', marginTop: SPACING.sm, color: '#FFF' },
  
  footerActions:  { padding: SPACING.md, backgroundColor: COLORS.bgPrimary },
  loadingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md },
  loadingText:    { ...FONTS.body, color: COLORS.accent },
});
