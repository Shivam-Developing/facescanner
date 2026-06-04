export const FACE_AUTH_CONFIG = {
  // ── MobileFaceNet v2 ──────────────────────────────
  MODEL_INPUT_SIZE:     112,
  EMBEDDING_DIMENSION:  512,
  MATCH_THRESHOLD:      0.65,   // Cosine similarity: same person ≥ 0.65

  // ── Liveness Detection ─────────────────────────────
  LIVENESS_TIMEOUT_MS:         7000,
  BLINK_EYE_CLOSED_THRESHOLD:  0.3,
  SMILE_THRESHOLD:             0.8,
  HEAD_TURN_ANGLE_DEG:         25,

  // ── Enrollment ────────────────────────────────────
  ENROLLMENT_FRAME_COUNT:   3,
  MIN_FACE_COVERAGE:        0.15,
  MAX_EULER_Y_ENROLLMENT:   15,

  // ── Sync & Purge ──────────────────────────────────
  SYNC_PURGE_AFTER_DAYS: 7,
  SYNC_BATCH_SIZE:       25,
  AWS_API_URL:           'https://REPLACE_WITH_YOUR_API_GATEWAY_URL/prod',
};
