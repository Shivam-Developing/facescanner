import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, FlatList, ActivityIndicator
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import SyncService from '../services/SyncService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isMockEnvironment } from '../utils/Environment';

let NetInfo: any = null;
try {
  if (!isMockEnvironment()) {
    NetInfo = require('@react-native-community/netinfo').default;
  }
} catch (e) {}

export const SyncStatusScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [isOnline, setIsOnline]         = useState(true);
  const [pendingCount, setPendingCount]   = useState(0);
  const [lastSync, setLastSync]           = useState<string | null>(null);
  const [syncing, setSyncing]             = useState(false);
  const [events, setEvents]               = useState<any[]>([]);

  useEffect(() => {
    // Check network status
    if (NetInfo) {
      NetInfo.fetch().then((state: any) => setIsOnline(!!state.isConnected));
      const unsubscribe = NetInfo.addEventListener((state: any) => {
        setIsOnline(!!state.isConnected);
      });
      return () => unsubscribe();
    } else {
      setIsOnline(true);
    }
  }, []);

  // Poll local DB state
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 4000); // refresh every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const pending = await SyncService.getPendingCount();
      const last    = await SyncService.getLastSyncTimestamp();
      const recent  = await SyncService.getRecentEvents(15);
      
      setPendingCount(pending);
      setLastSync(last ? new Date(last).toLocaleString() : 'Never');
      setEvents(recent);
    } catch (e) {
      console.error('[SyncScreen] Failed to load data:', e);
    }
  };

  const triggerSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    try {
      await SyncService.syncToAWS();
      await loadStatus();
    } catch (e) {
      console.warn('[SyncScreen] Sync trigger fail:', e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Network banner */}
      <View style={[styles.networkBanner, { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', borderColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' }]}>
        <MaterialCommunityIcons
          name={isOnline ? 'wifi' : 'wifi-off'}
          size={18}
          color={isOnline ? COLORS.success : COLORS.danger}
        />
        <Text style={[styles.networkText, { color: isOnline ? COLORS.success : COLORS.danger }]}>
          {isOnline 
            ? 'ONLINE — READY TO SYNCHRONIZE' 
            : 'OFFLINE — QUEUED ON DEVICE'}
        </Text>
      </View>

      {/* Statistics Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-check-outline" size={24} color={COLORS.accentSecondary} style={{ marginBottom: SPACING.xs }} />
          <Text style={styles.statLabel}>Last Sync</Text>
          <Text style={styles.statSubvalue}>{lastSync}</Text>
        </View>
      </View>

      {/* Sync Action Button */}
      <TouchableOpacity
        style={[styles.syncBtn, (!isOnline || syncing) && styles.syncBtnDisabled]}
        onPress={triggerSync}
        disabled={!isOnline || syncing}
        activeOpacity={0.85}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={COLORS.bgPrimary} />
        ) : (
          <MaterialCommunityIcons name="database-export-outline" size={20} color={COLORS.bgPrimary} />
        )}
        <Text style={styles.syncBtnText}>{syncing ? 'Syncing Queue...' : 'Sync Pending Events'}</Text>
      </TouchableOpacity>

      {/* Event Logs Header */}
      <Text style={styles.sectionHeader}>Audit Trail Logs</Text>
      
      {/* Event List */}
      <FlatList
        data={events}
        keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <View style={[styles.statusGlowRing, { borderColor: item.success ? COLORS.success : COLORS.danger }]}>
              <MaterialCommunityIcons
                name={item.success ? 'shield-check-outline' : 'shield-remove-outline'}
                size={18}
                color={item.success ? COLORS.success : COLORS.danger}
              />
            </View>
            <View style={styles.eventMeta}>
              <Text style={styles.eventUser}>ID: {item.userId}</Text>
              <Text style={styles.eventSimilarity}>
                Match: {(item.similarity * 100).toFixed(1)}% · Challenges: {item.challenge}
              </Text>
              <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <View style={[
              styles.syncBadge, 
              { backgroundColor: item.synced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(251, 191, 36, 0.08)' }
            ]}>
              <Text style={[styles.syncBadgeText, { color: item.synced ? COLORS.success : COLORS.warning }]}>
                {item.synced ? 'Synced' : 'Pending'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No authentication history logged.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgPrimary, padding: SPACING.md },
  networkBanner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1 },
  networkText:    { ...FONTS.label, fontSize: 10 },
  statsRow:       { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard:       { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', justifyContent: 'center', minHeight: 110, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.03)' },
  statValue:      { ...FONTS.heading, fontSize: 38, color: COLORS.accent },
  statLabel:      { ...FONTS.label, color: COLORS.textSecondary },
  statSubvalue:   { ...FONTS.body, fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  syncBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  syncBtnDisabled:{ opacity: 0.5 },
  syncBtnText:    { ...FONTS.button },
  sectionHeader:  { ...FONTS.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.xs },
  eventRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.02)' },
  statusGlowRing: { width: 34, height: 34, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28, 34, 54, 0.15)' },
  eventMeta:      { flex: 1 },
  eventUser:      { ...FONTS.body, color: '#FFF', fontWeight: '700', fontSize: 15 },
  eventSimilarity:{ ...FONTS.body, fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  eventTime:      { ...FONTS.label, fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
  syncBadge:      { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  syncBadgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xxl, gap: SPACING.sm },
  emptyText:      { ...FONTS.body, color: COLORS.textMuted },
});
