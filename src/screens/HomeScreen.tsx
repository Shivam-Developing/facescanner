import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FaceNetService from '../services/FaceNetService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Warm up the face recognition model in background
    FaceNetService.initialize().catch(console.error);

    // Pulse glow animation on the central fingerprint/face icon
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>FaceAuth</Text>
        <Text style={styles.appSubtitle}>Offline Facial Recognition & Liveness</Text>
      </View>

      {/* Central Interactive Icon */}
      <View style={styles.iconArea}>
        <Animated.View style={[styles.iconGlow, { transform: [{ scale: pulse }] }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="face-recognition" size={72} color={COLORS.accent} />
          </View>
        </Animated.View>
        <Text style={styles.iconLabel}>Offline Security Bridge</Text>
        <Text style={styles.iconDesc}>
          1:1 Verification · Secure Storage · Zero Latency
        </Text>
      </View>

      {/* Offline Indicator Badge */}
      <View style={styles.offlineBadge}>
        <MaterialCommunityIcons name="wifi-off" size={14} color={COLORS.success} />
        <Text style={styles.offlineBadgeText}>100% On-Device Protection</Text>
      </View>

      {/* Navigation Options */}
      <View style={styles.buttonsArea}>
        <TouchableOpacity
          style={[styles.primaryBtn]}
          onPress={() => navigation.navigate('Authentication')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Authenticate Identity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Enrollment')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Enroll New User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('SyncStatus')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cloud-sync" size={18} color={COLORS.textSecondary} />
          <Text style={styles.ghostBtnText}>AWS Cloud Status</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Branding */}
      <Text style={styles.footer}>Datalake 3.0 Biometrics · Antigravity</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: SPACING.lg },
  header:        { alignItems: 'center', marginTop: SPACING.xxl },
  appTitle:      { ...FONTS.heading, fontSize: 32, letterSpacing: 1.5, color: '#FFF' },
  appSubtitle:   { ...FONTS.body, marginTop: SPACING.xs, color: COLORS.textSecondary },
  iconArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  iconGlow:      { width: 160, height: 160, borderRadius: RADIUS.full, backgroundColor: COLORS.accentGlow, alignItems: 'center', justifyContent: 'center' },
  iconCircle:    { width: 130, height: 130, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.accent },
  iconLabel:     { ...FONTS.heading, fontSize: 18, marginTop: SPACING.md },
  iconDesc:      { ...FONTS.body, textAlign: 'center', paddingHorizontal: SPACING.md },
  offlineBadge:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.lg },
  offlineBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  buttonsArea:   { gap: SPACING.md, marginBottom: SPACING.xl },
  primaryBtn:    { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  primaryBtnText:{ ...FONTS.button },
  secondaryBtn:  { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.accent },
  secondaryBtnText: { ...FONTS.button, color: COLORS.accent },
  ghostBtn:      { paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  ghostBtnText:  { ...FONTS.body, color: COLORS.textSecondary },
  footer:        { textAlign: 'center', ...FONTS.label, paddingBottom: SPACING.md },
});
