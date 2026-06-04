import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated, Easing
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FaceNetService from '../services/FaceNetService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Warm up the face recognition model in background
    FaceNetService.initialize().catch(console.error);

    // Pulse glow animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.00, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      ])
    ).start();

    // Radar scanning rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Futuristic Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color={COLORS.accent} />
          <Text style={styles.appTitle}>SHIELD</Text>
          <Text style={[styles.appTitle, { color: COLORS.accent }]}>AUTH</Text>
        </View>
        <Text style={styles.appSubtitle}>Offline Face Verification Pipeline</Text>
        <View style={styles.accentLine} />
      </View>

      {/* Central Scanning Radar Area */}
      <View style={styles.iconArea}>
        {/* Layer 1: Outer Pulse Glow */}
        <Animated.View style={[
          styles.outerGlow, 
          { 
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity
          }
        ]} />

        {/* Layer 2: Rotating Radar Ring */}
        <Animated.View style={[
          styles.radarRing,
          { transform: [{ rotate: spin }] }
        ]}>
          <View style={styles.radarDot} />
        </Animated.View>

        {/* Layer 3: Central Biometric Button */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="face-recognition" size={76} color={COLORS.accent} />
        </View>

        <Text style={styles.iconLabel}>Offline Security Core</Text>
        <Text style={styles.iconDesc}>
          Local 512D Vector Embeddings · Anti-Spoof Liveness
        </Text>
      </View>

      {/* Cyber Offline Indicator Badge */}
      <View style={styles.offlineBadge}>
        <View style={styles.glowingDot} />
        <Text style={styles.offlineBadgeText}>SECURE LOCAL BOUNDARY</Text>
      </View>

      {/* Dashboard Actions */}
      <View style={styles.buttonsArea}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Authentication')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="fingerprint" size={22} color={COLORS.bgPrimary} />
          <Text style={styles.primaryBtnText}>Authenticate Identity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Enrollment')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-plus-outline" size={20} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Enroll New Operator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('SyncStatus')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="database-sync-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.ghostBtnText}>System Cloud Logs</Text>
        </TouchableOpacity>
      </View>

      {/* System Footer Info */}
      <Text style={styles.footer}>DATALAKE 3.0 BIOMETRICS · VERSION 1.1.2</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: SPACING.lg },
  header:        { alignItems: 'center', marginTop: SPACING.xl },
  logoRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  appTitle:      { ...FONTS.heading, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  appSubtitle:   { ...FONTS.body, fontSize: 13, marginTop: SPACING.xs, color: COLORS.textSecondary, letterSpacing: 0.5 },
  accentLine:    { width: 80, height: 2, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: SPACING.md },
  
  iconArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  outerGlow:     { position: 'absolute', width: 220, height: 220, borderRadius: RADIUS.full, backgroundColor: COLORS.accentGlow, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.25)' },
  radarRing:     { position: 'absolute', width: 170, height: 170, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(138, 43, 226, 0.4)', borderStyle: 'dashed', justifyContent: 'flex-start', alignItems: 'center' },
  radarDot:      { width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.accentSecondary, top: -4 },
  iconCircle:    { width: 130, height: 130, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.accent, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  iconLabel:     { ...FONTS.heading, fontSize: 18, marginTop: SPACING.xl, color: '#FFF' },
  iconDesc:      { ...FONTS.body, fontSize: 13, textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xs, paddingHorizontal: SPACING.lg },
  
  offlineBadge:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(16, 185, 129, 0.08)', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  glowingDot:    { width: 6, height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.success },
  offlineBadgeText: { fontSize: 10, color: COLORS.success, fontWeight: '800', letterSpacing: 1.5 },
  
  buttonsArea:   { gap: SPACING.md, marginBottom: SPACING.xl },
  primaryBtn:    { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  primaryBtnText:{ ...FONTS.button },
  secondaryBtn:  { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.accentGlow },
  secondaryBtnText: { ...FONTS.button, color: COLORS.accent },
  ghostBtn:      { paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  ghostBtnText:  { ...FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  footer:        { textAlign: 'center', ...FONTS.label, paddingBottom: SPACING.md, color: COLORS.textMuted },
});
