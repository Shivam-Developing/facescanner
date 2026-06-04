import axios from 'axios';
import { isMockEnvironment } from '../utils/Environment';
import { FACE_AUTH_CONFIG } from '../config/FaceAuthConfig';
import StorageService from './StorageService';

let MMKV: any = null;
let NetInfo: any = null;
let SecureStore: any = null;

try {
  if (!isMockEnvironment()) {
    MMKV = require('react-native-mmkv').MMKV;
    NetInfo = require('@react-native-community/netinfo').default;
  } else {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  console.warn('[Sync] Native MMKV/NetInfo not available. Using SecureStore fallbacks.');
}

class SyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private static instance: SyncService;
  private kvStore: any = null;
  private mockMap = new Map<string, string>();

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  constructor() {
    this.initKVStore();
  }

  private async initKVStore() {
    if (!isMockEnvironment() && MMKV) {
      try {
        this.kvStore = new MMKV();
        return;
      } catch (e) {
        console.warn('[Sync] Failed to initialize native MMKV, falling back to mock KV.');
      }
    }

    // Mock KV store using JavaScript Map with SecureStore persistence
    this.kvStore = {
      getString: (key: string) => this.mockMap.get(key),
      set: (key: string, value: string) => {
        this.mockMap.set(key, value);
        if (SecureStore) {
          SecureStore.setItemAsync(`mock_kv_${key}`, value).catch(() => {});
        }
      }
    };

    // Load initial values from SecureStore if available
    if (SecureStore) {
      try {
        const cachedId = await SecureStore.getItemAsync('mock_kv_device_id');
        if (cachedId) this.mockMap.set('device_id', cachedId);

        const cachedSync = await SecureStore.getItemAsync('mock_kv_last_sync');
        if (cachedSync) this.mockMap.set('last_sync', cachedSync);
      } catch {}
    }
  }

  async startAutoSync(): Promise<void> {
    if (!isMockEnvironment() && NetInfo) {
      // Listen for connectivity changes natively
      NetInfo.addEventListener((state: any) => {
        if (state.isConnected) {
          console.log('[Sync] Network online — triggering sync');
          this.syncToAWS().catch(console.error);
        }
      });
    }

    // Fallback/Recurring check every 5 minutes (or 30s in mock environment to make tests responsive!)
    const checkInterval = isMockEnvironment() ? 30000 : 5 * 60 * 1000;
    this.syncTimer = setInterval(() => {
      this.checkConnectivityAndSync();
    }, checkInterval);
  }

  private async checkConnectivityAndSync() {
    let isConnected = true;
    if (!isMockEnvironment() && NetInfo) {
      const state = await NetInfo.fetch();
      isConnected = !!state.isConnected;
    }
    
    if (isConnected) {
      this.syncToAWS().catch(console.error);
    }
  }

  async syncToAWS(): Promise<{ synced: number }> {
    const pending = await StorageService.getUnsyncedEvents();
    if (pending.length === 0) {
      console.log('[Sync] Nothing to sync');
      return { synced: 0 };
    }

    let deviceId = this.kvStore.getString('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}`;
      this.kvStore.set('device_id', deviceId);
    }

    console.log(`[Sync] Attempting to sync ${pending.length} events for device: ${deviceId}`);

    // If running in mock environment, simulate sync success after 1 second
    if (isMockEnvironment()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const ids = pending.map((e: any) => e.id).filter(Boolean);
      await StorageService.markEventsSynced(ids);
      await StorageService.purgeOldEvents();
      this.kvStore.set('last_sync', Date.now().toString());
      console.log(`[Sync] Mock Synced ${pending.length} events successfully.`);
      return { synced: pending.length };
    }

    try {
      const response = await axios.post(
        `${FACE_AUTH_CONFIG.AWS_API_URL}/sync`,
        { deviceId, events: pending },
        { timeout: 10000 }
      );

      if (response.status === 200) {
        const ids = pending.map((e: any) => e.id).filter(Boolean);
        await StorageService.markEventsSynced(ids);
        await StorageService.purgeOldEvents();
        this.kvStore.set('last_sync', Date.now().toString());
        console.log(`[Sync] ✅ Synced ${pending.length} events successfully.`);
        return { synced: pending.length };
      }
    } catch (err: any) {
      console.error('[Sync] Sync failed:', err.message);
    }
    return { synced: 0 };
  }

  async getPendingCount(): Promise<number> {
    const events = await StorageService.getUnsyncedEvents();
    return events.length;
  }

  async getLastSyncTimestamp(): Promise<number | null> {
    const stored = this.kvStore ? this.kvStore.getString('last_sync') : null;
    return stored ? parseInt(stored, 10) : null;
  }

  stop(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }
}

export default SyncService.getInstance();
