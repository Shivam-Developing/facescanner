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
      // In mock/Snack environment we assume online by default,
      // but let the user know they are in simulated preview
      setIsOnline(true);
    }
  }, []);

  // Poll local DB state on focus
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
      <View style={[styles.networkBanner, { backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
        <MaterialCommunityIcons
          name={isOnline ? 'wifi' : 'wifi-off'}
          size={20}
          color={isOnline ? COLORS.success : COLORS.danger}
        />
        <Text style={[styles.networkText, { color: isOnline ? COLORS.success : COLORS.danger }]}>
          {isOnline 
            ? 'Online — Ready to synchronize' 
            : 'Offline — Events will queue on device'}
        </Text>
      </View>

      {/* Statistics Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.textSecondary} style={{ marginBottom: 4 }} />
          <Text style={styles.statLabel}>Last Cloud Sync</Text>
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
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#FFF" />
        )}
        <Text style={styles.syncBtnText}>{syncing ? 'Syncing Queue...' : 'Force Sync Now'}</Text>
      </TouchableOpacity>

      {/* Event Logs Header */}
      <Text style={styles.sectionHeader}>On-Device Authentication Log</Text>
      
      {/* Event List */}
      <FlatList
        data={events}
        keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <MaterialCommunityIcons
              name={item.success ? 'check-circle' : 'close-circle'}
              size={22}
              color={item.success ? COLORS.success : COLORS.danger}
            />
            <View style={styles.eventMeta}>
              <Text style={styles.eventUser}>User: {item.userId}</Text>
              <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
              <Text style={styles.eventSimilarity}>
                Similarity: {(item.similarity * 100).toFixed(1)}% ({item.challenge})
              </Text>
            </View>
            <View style={[
              styles.syncBadge, 
              { backgroundColor: item.synced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
            ]}>
              <Text style={[styles.syncBadgeText, { color: item.synced ? COLORS.success : COLORS.warning }]}>
                {item.synced ? 'Synced' : 'Pending'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="card-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No local events recorded yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgPrimary, padding: SPACING.md },
  networkBanner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  networkText:    { ...FONTS.subhead, fontWeight: '700' },
  statsRow:       { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard:       { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', justifyContent: 'center', minHeight: 110, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statValue:      { ...FONTS.heading, fontSize: 38, color: COLORS.accent },
  statLabel:      { ...FONTS.label, color: COLORS.textSecondary, fontWeight: '700' },
  statSubvalue:   { ...FONTS.body, fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  syncBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  syncBtnDisabled:{ opacity: 0.5 },
  syncBtnText:    { ...FONTS.button, color: '#FFF' },
  sectionHeader:  { ...FONTS.heading, fontSize: 16, marginBottom: SPACING.sm, color: '#FFF' },
  eventRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  eventMeta:      { flex: 1 },
  eventUser:      { ...FONTS.body, color: '#FFF', fontWeight: '700' },
  eventTime:      { ...FONTS.label, fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  eventSimilarity:{ ...FONTS.label, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  syncBadge:      { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  syncBadgeText:  { fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xxl, gap: SPACING.sm },
  emptyText:      { ...FONTS.body, color: COLORS.textMuted },
});
