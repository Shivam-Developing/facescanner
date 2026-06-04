import FaceNetService     from '../../services/FaceNetService';
import StorageService     from '../../services/StorageService';
import LivenessDetector   from '../../services/LivenessDetector';
import SyncService        from '../../services/SyncService';

export interface AuthResult {
  success:    boolean;
  similarity: number;
  userId:     string;
  timestamp:  number;
  challenge:  string;
  error?:     string;
}

export const FaceAuthModule = {
  // Initialize all services (call once at Datalake app startup)
  async initialize(): Promise<void> {
    await StorageService.initialize();
    await FaceNetService.initialize();
    await SyncService.startAutoSync();
  },

  // Screen names to plug into Datalake's main navigator stack
  screens: {
    Home:           'FaceAuth/Home',
    Enrollment:     'FaceAuth/Enrollment',
    Authentication: 'FaceAuth/Authentication',
    SyncStatus:     'FaceAuth/SyncStatus',
  },

  // Direct programmatic API surface for custom implementations
  async enroll(params: { userId: string; embedding: Float32Array }): Promise<void> {
    await StorageService.saveEmbedding(params.userId, params.embedding);
  },

  async authenticate(params: {
    userId:    string;
    embedding: Float32Array;
    challenge: string;
  }): Promise<AuthResult> {
    const stored = await StorageService.getEmbedding(params.userId);
    if (!stored) {
      return { 
        success: false, 
        similarity: 0, 
        userId: params.userId, 
        timestamp: Date.now(), 
        challenge: params.challenge, 
        error: 'No enrollment found' 
      };
    }
    
    const similarity = FaceNetService.cosineSimilarity(params.embedding, stored);
    const success    = FaceNetService.isMatch(similarity);
    
    await StorageService.logAuthEvent({
      userId: params.userId,
      timestamp: Date.now(),
      success,
      similarity,
      challenge: params.challenge,
      synced: false,
    });
    
    return { 
      success, 
      similarity, 
      userId: params.userId, 
      timestamp: Date.now(), 
      challenge: params.challenge 
    };
  },
};

export { FaceNetService, StorageService, LivenessDetector, SyncService };
export type { AuthEvent } from '../../services/StorageService';
