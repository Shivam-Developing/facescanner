import { isMockEnvironment } from '../utils/Environment';

let openSQL: any = null;
let EncryptedStorage: any = null;
let SecureStore: any = null;

try {
  if (!isMockEnvironment()) {
    openSQL = require('@op-engineering/op-sqlite').open;
    EncryptedStorage = require('react-native-encrypted-storage').default;
  } else {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  console.warn('[Storage] Native SQLite or EncryptedStorage not available. Falling back to Expo SecureStore.');
}

interface AuthEvent {
  id?:        number;
  userId:     string;
  timestamp:  number;
  success:    boolean;
  similarity: number;
  challenge:  string;
  synced:     boolean;
}

// ── Pure JS Base64 / Float32 Array Helpers (Safe from Node global dependencies) ──
const float32ArrayToBase64 = (array: Float32Array): string => {
  const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = uint8.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = uint8[i];
    const b2 = i + 1 < len ? uint8[i + 1] : 0;
    const b3 = i + 2 < len ? uint8[i + 2] : 0;
    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = i + 1 < len ? (((b2 & 15) << 2) | (b3 >> 6)) : 64;
    const c4 = i + 2 < len ? (b3 & 63) : 64;
    base64 += chars.charAt(c1) + chars.charAt(c2) +
              (c3 === 64 ? '=' : chars.charAt(c3)) +
              (c4 === 64 ? '=' : chars.charAt(c4));
  }
  return base64;
};

const base64ToFloat32Array = (base64: string): Float32Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const base64code1 = lookup[base64.charCodeAt(i)];
    const base64code2 = lookup[base64.charCodeAt(i + 1)];
    const base64code3 = lookup[base64.charCodeAt(i + 2)];
    const base64code4 = lookup[base64.charCodeAt(i + 3)];
    
    bytes[p++] = (base64code1 << 2) | (base64code2 >> 4);
    if (p < bufferLength) bytes[p++] = ((base64code2 & 15) << 4) | (base64code3 >> 2);
    if (p < bufferLength) bytes[p++] = ((base64code3 & 3) << 6) | (base64code4 & 63);
  }
  
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};

class StorageService {
  private db: any = null;
  private static instance: StorageService;

  // Mock In-Memory Databases for Expo Go / Snack Fallback
  private mockEmbeddings: Record<string, string> = {};
  private mockEvents: AuthEvent[] = [];

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initialize(): Promise<void> {
    if (isMockEnvironment() || !openSQL) {
      console.log('[Storage] Mock DB warmed up.');
      // Load pre-existing embeddings from Expo SecureStore if possible
      try {
        if (SecureStore) {
          const keysJson = await SecureStore.getItemAsync('mock_embeddings_keys');
          if (keysJson) {
            const keys = JSON.parse(keysJson);
            for (const key of keys) {
              const val = await SecureStore.getItemAsync(`mock_emb_${key}`);
              if (val) this.mockEmbeddings[key] = val;
            }
          }
          const eventsJson = await SecureStore.getItemAsync('mock_events');
          if (eventsJson) {
            this.mockEvents = JSON.parse(eventsJson);
          }
        }
      } catch (e) {
        console.warn('[Storage] Failed to restore mock database from SecureStore:', e);
      }
      return;
    }

    try {
      console.log('[Storage] Initializing Encrypted SQLite...');
      const dbKey = await this.getOrCreateDBKey();
      this.db = openSQL({
        name: 'FaceAuth.db',
        encryptionKey: dbKey,
      });

      await this.db.executeAsync(`
        CREATE TABLE IF NOT EXISTS embeddings (
          user_id   TEXT PRIMARY KEY,
          embedding TEXT,
          created   INTEGER
        )
      `);

      await this.db.executeAsync(`
        CREATE TABLE IF NOT EXISTS auth_events (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id   TEXT,
          timestamp INTEGER,
          success   INTEGER,
          similarity REAL,
          challenge TEXT,
          synced    INTEGER DEFAULT 0
        )
      `);

      console.log('[Storage] SQLite Database initialized successfully.');
    } catch (err) {
      console.error('[Storage] Native DB init failed, falling back to mock mode:', err);
    }
  }

  private async getOrCreateDBKey(): Promise<string> {
    try {
      const existingKey = await EncryptedStorage.getItem('db_encryption_key');
      if (existingKey) return existingKey;
    } catch {}

    const newKey = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');

    try {
      await EncryptedStorage.setItem('db_encryption_key', newKey);
    } catch (e) {
      console.warn('[Storage] Could not write encryption key to EncryptedStorage, using transient key.');
    }
    return newKey;
  }

  async saveEmbedding(userId: string, embedding: Float32Array): Promise<void> {
    const base64String = float32ArrayToBase64(embedding);

    if (isMockEnvironment() || !this.db) {
      this.mockEmbeddings[userId] = base64String;
      // Persist mock database to SecureStore
      try {
        if (SecureStore) {
          const keys = Object.keys(this.mockEmbeddings);
          await SecureStore.setItemAsync('mock_embeddings_keys', JSON.stringify(keys));
          await SecureStore.setItemAsync(`mock_emb_${userId}`, base64String);
        }
      } catch (e) {
        console.warn('[Storage] Failed to save mock embedding to SecureStore:', e);
      }
      console.log(`[Storage] Mock Saved embedding for user: ${userId}`);
      return;
    }

    await this.db.executeAsync(
      `INSERT OR REPLACE INTO embeddings (user_id, embedding, created) VALUES (?, ?, ?)`,
      [userId, base64String, Date.now()]
    );
    console.log(`[Storage] Saved embedding for user: ${userId}`);
  }

  async getEmbedding(userId: string): Promise<Float32Array | null> {
    if (isMockEnvironment() || !this.db) {
      const res = this.mockEmbeddings[userId];
      if (!res) return null;
      return base64ToFloat32Array(res);
    }

    const result = await this.db.executeAsync(
      `SELECT embedding FROM embeddings WHERE user_id = ?`,
      [userId]
    );

    if (!result.rows || result.rows.length === 0) return null;
    const raw = result.rows.item(0).embedding;
    return base64ToFloat32Array(raw);
  }

  async logAuthEvent(event: AuthEvent): Promise<void> {
    if (isMockEnvironment() || !this.db) {
      const newEvent = { ...event, id: this.mockEvents.length + 1 };
      this.mockEvents.unshift(newEvent); // Add to beginning of array
      try {
        if (SecureStore) {
          await SecureStore.setItemAsync('mock_events', JSON.stringify(this.mockEvents.slice(0, 50)));
        }
      } catch {}
      return;
    }

    await this.db.executeAsync(
      `INSERT INTO auth_events (user_id, timestamp, success, similarity, challenge, synced)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event.userId, event.timestamp, event.success ? 1 : 0, event.similarity, event.challenge, 0]
    );
  }

  async getUnsyncedEvents(): Promise<AuthEvent[]> {
    if (isMockEnvironment() || !this.db) {
      return this.mockEvents.filter(ev => !ev.synced);
    }

    const result = await this.db.executeAsync(
      `SELECT * FROM auth_events WHERE synced = 0 LIMIT 25`
    );
    const list: AuthEvent[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const item = result.rows.item(i);
        list.push({
          id: item.id,
          userId: item.user_id,
          timestamp: item.timestamp,
          success: item.success === 1,
          similarity: item.similarity,
          challenge: item.challenge,
          synced: item.synced === 1,
        });
      }
    }
    return list;
  }

  async markEventsSynced(ids: number[]): Promise<void> {
    if (isMockEnvironment() || !this.db) {
      this.mockEvents = this.mockEvents.map(ev => 
        ids.includes(ev.id || 0) ? { ...ev, synced: true } : ev
      );
      try {
        if (SecureStore) {
          await SecureStore.setItemAsync('mock_events', JSON.stringify(this.mockEvents.slice(0, 50)));
        }
      } catch {}
      return;
    }

    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.db.executeAsync(
      `UPDATE auth_events SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }

  async purgeOldEvents(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (isMockEnvironment() || !this.db) {
      const cutoff = Date.now() - olderThanMs;
      this.mockEvents = this.mockEvents.filter(ev => !(ev.synced && ev.timestamp < cutoff));
      return;
    }

    const cutoff = Date.now() - olderThanMs;
    await this.db.executeAsync(
      `DELETE FROM auth_events WHERE synced = 1 AND timestamp < ?`,
      [cutoff]
    );
    console.log('[Storage] Purge complete');
  }

  async getRecentEvents(limit = 10): Promise<AuthEvent[]> {
    if (isMockEnvironment() || !this.db) {
      return this.mockEvents.slice(0, limit);
    }

    const result = await this.db.executeAsync(
      `SELECT * FROM auth_events ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    const list: AuthEvent[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const item = result.rows.item(i);
        list.push({
          id: item.id,
          userId: item.user_id,
          timestamp: item.timestamp,
          success: item.success === 1,
          similarity: item.similarity,
          challenge: item.challenge,
          synced: item.synced === 1,
        });
      }
    }
    return list;
  }
}

export default StorageService.getInstance();
export { AuthEvent };
