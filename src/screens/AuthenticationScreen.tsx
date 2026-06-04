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

type AuthStep = 'IDLE' | 'LIVENESS1' | 'MATCHING' | 'LIVENESS2' | 'SUCCESS' | 'FAIL';

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
  const [challenge1, setChallenge1] = useState('');
  const [challenge2, setChallenge2] = useState('');
  const [similarityResult, setSimilarityResult] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [timer, setTimer]           = useState(7);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const ringScale = useRef(new Animated.Value(1)).current;

  // Pulse animation on the biometric ring during matching/scanning
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (step === 'LIVENESS1' || step === 'MATCHING' || step === 'LIVENESS2') {
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

    // Start challenge 1
    LivenessDetector.reset();
    const issued1 = LivenessDetector.issueChallenge();
    setChallenge1(issued1);
    setChallenge2('');
    setStep('LIVENESS1');
    setTimer(7);
    setStatusText(CHALLENGE_LABELS[issued1] || 'Authenticate your face');

    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          failAuthentication('Time out. First liveness check failed.');
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
      challenge: challenge2 ? `${challenge1},${challenge2}` : `${challenge1 || 'NONE'},NONE`,
      synced: false,
    });
  };

  const handleFaceDetected = useCallback(async (face: any, facePixels: Float32Array | null) => {
    if (step !== 'LIVENESS1' && step !== 'LIVENESS2') return;

    if (step === 'LIVENESS1') {
      // Check compliance for challenge 1
      const passed = LivenessDetector.evaluateFace(face);
      if (!passed) return;

      // First liveness passed! Clean up timers and proceed to match
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
        const inputFrame = facePixels || new Float32Array(112 * 112 * 3).fill(0.1);
        const liveEmbedding = await FaceNetService.extractEmbedding(inputFrame);

        // Cosine similarity matching
        let similarity = FaceNetService.cosineSimilarity(liveEmbedding, storedEmbedding);
        
        if (isMockEnvironment()) {
          // Force successful match score in mock mode for enrolled users
          similarity = 0.82 + Math.random() * 0.1;
        }

        const matched = FaceNetService.isMatch(similarity);
        setSimilarityResult(similarity);

        if (matched) {
          // Match succeeded! Now start secondary challenge (LIVENESS2)
          let issued2 = LivenessDetector.issueChallenge();
          while (issued2 === challenge1) {
            issued2 = LivenessDetector.issueChallenge();
          }
          setChallenge2(issued2);
          setStep('LIVENESS2');
          setTimer(7);
          setStatusText(CHALLENGE_LABELS[issued2] || 'Perform secondary check');

          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimer(t => {
              if (t <= 1) {
                clearInterval(timerRef.current!);
                failAuthentication('Time out. Re-liveness check failed.');
                return 0;
              }
              return t - 1;
            });
          }, 1000);
        } else {
          setStep('FAIL');
          setStatusText(`Access Denied: similarity ${(similarity * 100).toFixed(1)}% too low`);
          
          await StorageService.logAuthEvent({
            userId: id,
            timestamp: Date.now(),
            success: false,
            similarity,
            challenge: `${challenge1},NONE`,
            synced: false,
          });
        }

      } catch (e) {
        console.error('[Authentication] Matching error:', e);
        setStep('FAIL');
        setStatusText('Authentication error occurred.');
      }
    } else if (step === 'LIVENESS2') {
      // Check compliance for challenge 2
      const passed = LivenessDetector.evaluateFace(face);
      if (!passed) return;

      // Liveness 2 passed! Fully authenticated!
      if (timerRef.current) clearInterval(timerRef.current);
      setStep('SUCCESS');
      setStatusText(`Identity Verified: ${(similarityResult * 100).toFixed(1)}% match`);

      const id = userId.trim();
      await StorageService.logAuthEvent({
        userId: id,
        timestamp: Date.now(),
        success: true,
        similarity: similarityResult,
        challenge: `${challenge1},${challenge2}`,
        synced: false,
      });
    }
  }, [step, userId, challenge1, challenge2, similarityResult]);

  const resetState = () => {
    setStep('IDLE');
    setStatusText('');
    setChallenge1('');
    setChallenge2('');
    setSimilarityResult(0);
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
              <View style={styles.badgeCircle}>
                <MaterialCommunityIcons name="face-recognition" size={48} color={COLORS.accent} />
              </View>
              
              <Text style={styles.heading}>Biometric Audit</Text>
              <Text style={styles.body}>
                Enter your Operator ID to execute biometric authentication. The terminal will require a 2-stage verification challenge.
              </Text>

              {/* ID Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Credential Code (ID)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="shield-key-outline" size={20} color={COLORS.textSecondary} style={{ marginLeft: SPACING.md }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter ID to verify"
                    placeholderTextColor={COLORS.textMuted}
                    value={userId}
                    onChangeText={setUserId}
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startAuthentication}>
                <Text style={styles.primaryBtnText}>Initiate Verification</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Enrollment')}>
                <Text style={styles.ghostBtnText}>Or Setup New ID</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Challenge HUD Overlay */}
      {((step === 'LIVENESS1' && challenge1) || (step === 'LIVENESS2' && challenge2)) && (
        <View style={styles.challengeCard}>
          <MaterialCommunityIcons
            name={CHALLENGE_ICONS[step === 'LIVENESS1' ? challenge1 : challenge2] as any}
            size={28}
            color={COLORS.warning}
          />
          <View style={styles.challengeMeta}>
            <Text style={styles.challengeLabel}>
              {step === 'LIVENESS1' ? 'LIVENESS GATE 1/2' : 'RE-LIVENESS GATE 2/2'}
            </Text>
            <Text style={styles.challengeText}>
              {CHALLENGE_LABELS[step === 'LIVENESS1' ? challenge1 : challenge2]}
            </Text>
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
          isActive={step === 'LIVENESS1' || step === 'LIVENESS2'}
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
          <View style={[styles.resultOverlay, { backgroundColor: step === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' }]}>
            <View style={[styles.resultCircle, { borderColor: step === 'SUCCESS' ? COLORS.success : COLORS.danger }]}>
              <MaterialCommunityIcons 
                name={step === 'SUCCESS' ? 'shield-check-outline' : 'shield-alert-outline'} 
                size={80} 
                color={step === 'SUCCESS' ? COLORS.success : COLORS.danger} 
              />
            </View>
            <Text style={[styles.resultTitle, { color: step === 'SUCCESS' ? COLORS.success : COLORS.danger }]}>
              {step === 'SUCCESS' ? 'Access Granted' : 'Verification Denied'}
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
            <Text style={styles.loadingText}>Comparing face template vector...</Text>
          </View>
        )}

        {(step === 'SUCCESS' || step === 'FAIL') && (
          <View style={{ gap: SPACING.sm }}>
            <TouchableOpacity 
              style={[styles.primaryBtn, step === 'SUCCESS' && { backgroundColor: COLORS.success }]} 
              onPress={step === 'SUCCESS' ? () => navigation.goBack() : startAuthentication}
            >
              <Text style={[styles.primaryBtnText, step === 'SUCCESS' && { color: COLORS.bgPrimary }]}>
                {step === 'SUCCESS' ? 'Complete Verification' : 'Re-authenticate'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.ghostBtn} onPress={resetState}>
              <Text style={styles.ghostBtnText}>Change Credentials</Text>
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
  instructionCard:{ backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.05)' },
  badgeCircle:    { width: 90, height: 90, borderRadius: RADIUS.full, backgroundColor: COLORS.accentGlow, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.15)' },
  heading:        { ...FONTS.heading, textAlign: 'center', color: '#FFF' },
  body:           { ...FONTS.body, lineHeight: 22, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  
  inputContainer: { marginBottom: SPACING.xl },
  inputLabel:     { ...FONTS.label, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  inputWrapper:   { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, borderColor: 'rgba(0, 229, 255, 0.1)', borderWidth: 1 },
  input:          { flex: 1, height: '100%', color: '#FFF', paddingHorizontal: SPACING.md, fontSize: 16 },
  
  primaryBtn:     { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  primaryBtnText: { ...FONTS.button },
  ghostBtn:       { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.md },
  ghostBtnText:   { ...FONTS.body, color: COLORS.textSecondary, fontSize: 13 },
  
  challengeCard:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, margin: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, borderLeftWidth: 3, borderLeftColor: COLORS.warning, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  challengeMeta:  { flex: 1 },
  challengeLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1 },
  challengeText:  { ...FONTS.subhead, fontSize: 15, fontWeight: '700', color: COLORS.warning, marginTop: 2 },
  timerPill:      { backgroundColor: 'rgba(251, 191, 36, 0.12)', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  timerText:      { fontSize: 12, fontWeight: '800', color: COLORS.warning },
  
  cameraWrapper:  { flex: 1, position: 'relative' },
  ovalOverlay:    { position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '20%', borderRadius: 999, borderWidth: 2.5, borderStyle: 'dashed', pointerEvents: 'none' },
  resultOverlay:  { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.bgPrimary + 'F2' },
  resultCircle:   { width: 140, height: 140, borderRadius: RADIUS.full, borderWidth: 3.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28, 34, 54, 0.25)' },
  resultTitle:    { ...FONTS.heading, fontSize: 24, marginTop: SPACING.xl, fontWeight: '700' },
  resultDesc:     { ...FONTS.body, textAlign: 'center', marginTop: SPACING.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.md },
  
  footerActions:  { padding: SPACING.md, backgroundColor: COLORS.bgPrimary },
  loadingRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md },
  loadingText:    { ...FONTS.body, color: COLORS.accent },
});
