import { FACE_AUTH_CONFIG } from '../config/FaceAuthConfig';

type LivenessChallenge = 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT';

class LivenessDetector {
  private challenge: LivenessChallenge | null = null;
  private static instance: LivenessDetector;

  static getInstance(): LivenessDetector {
    if (!LivenessDetector.instance) {
      LivenessDetector.instance = new LivenessDetector();
    }
    return LivenessDetector.instance;
  }

  issueChallenge(): LivenessChallenge {
    const challenges: LivenessChallenge[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT'];
    this.challenge = challenges[Math.floor(Math.random() * challenges.length)];
    console.log(`[Liveness] Challenge issued: ${this.challenge}`);
    return this.challenge;
  }

  getCurrentChallenge(): LivenessChallenge | null {
    return this.challenge;
  }

  evaluateFace(face: any): boolean {
    if (!this.challenge) return false;

    // Extract facial metrics, handling potential missing values
    const leftEyeOpenProbability = face.leftEyeOpenProbability ?? 1.0;
    const rightEyeOpenProbability = face.rightEyeOpenProbability ?? 1.0;
    const smilingProbability = face.smilingProbability ?? 0.0;
    const headEulerAngleY = face.headEulerAngleY ?? 0.0;

    switch (this.challenge) {
      case 'BLINK':
        // Both eyes closed
        return (
          leftEyeOpenProbability < FACE_AUTH_CONFIG.BLINK_EYE_CLOSED_THRESHOLD &&
          rightEyeOpenProbability < FACE_AUTH_CONFIG.BLINK_EYE_CLOSED_THRESHOLD
        );
      case 'SMILE':
        // Smiling ratio above threshold
        return smilingProbability > FACE_AUTH_CONFIG.SMILE_THRESHOLD;
      case 'TURN_LEFT':
        // Turning head to the left (Euler Y positive)
        return headEulerAngleY > FACE_AUTH_CONFIG.HEAD_TURN_ANGLE_DEG;
      case 'TURN_RIGHT':
        // Turning head to the right (Euler Y negative)
        return headEulerAngleY < -FACE_AUTH_CONFIG.HEAD_TURN_ANGLE_DEG;
      default:
        return false;
    }
  }

  reset(): void {
    this.challenge = null;
  }
}

export default LivenessDetector.getInstance();
export { LivenessChallenge };
