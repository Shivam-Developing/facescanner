import { isMockEnvironment } from '../utils/Environment';

let loadTensorflowModel: any = null;
try {
  if (!isMockEnvironment()) {
    loadTensorflowModel = require('react-native-fast-tflite').loadTensorflowModel;
  }
} catch (e) {
  console.warn('[FaceNet] Native react-native-fast-tflite not found. Using mock.');
}

class FaceNetService {
  private model: any = null;
  private static instance: FaceNetService;

  static getInstance(): FaceNetService {
    if (!FaceNetService.instance) {
      FaceNetService.instance = new FaceNetService();
    }
    return FaceNetService.instance;
  }

  // Call ONCE at app startup
  async initialize(): Promise<void> {
    if (this.model) return;

    if (isMockEnvironment() || !loadTensorflowModel) {
      console.log('[FaceNet] Mock MobileFaceNet v2 warmed up.');
      return;
    }

    console.log('[FaceNet] Loading MobileFaceNet v2 in Native TFLite...');
    const start = Date.now();
    try {
      this.model = await loadTensorflowModel(
        'https://github.com/sirius-ai/MobileFaceNet_TF/raw/master/models/MobileFaceNet.tflite'
      );
      console.log(`[FaceNet] Native model loaded in ${Date.now() - start}ms`);
    } catch (err) {
      console.error('[FaceNet] Failed to load native TFLite model, falling back to mock:', err);
    }
  }

  // Input: Float32Array [1 × 112 × 112 × 3] normalized to [-1, 1]
  // Output: Float32Array [512] — the face embedding
  async extractEmbedding(inputTensor: Float32Array): Promise<Float32Array> {
    if (isMockEnvironment() || !this.model) {
      // Return a simulated embedding
      const mockEmbedding = new Float32Array(512);
      // Populate with pseudo-random normalized float values
      for (let i = 0; i < 512; i++) {
        mockEmbedding[i] = (Math.random() - 0.5) * 2.0;
      }
      // Normalize vector
      let norm = 0;
      for (let i = 0; i < 512; i++) norm += mockEmbedding[i] * mockEmbedding[i];
      norm = Math.sqrt(norm);
      for (let i = 0; i < 512; i++) mockEmbedding[i] /= norm || 1;

      return mockEmbedding;
    }

    const start = Date.now();
    const outputs = await this.model.run([inputTensor]);
    console.log(`[FaceNet] Inference took ${Date.now() - start}ms`);
    return outputs[0] as Float32Array;
  }

  // Cosine similarity — range: [-1, 1], same person ≥ 0.65
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot   += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  isMatch(similarity: number, threshold = 0.65): boolean {
    return similarity >= threshold;
  }
}

export default FaceNetService.getInstance();
