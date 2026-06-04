const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Configuring local Git tracking settings...');

// Check if assets/MobileFaceNet.tflite exists
const modelPath = path.join(__dirname, '../assets/MobileFaceNet.tflite');
if (!fs.existsSync(modelPath)) {
  console.warn(`[Warning] Model file not found at ${modelPath}. Cannot configure Git tracking.`);
  process.exit(0);
}

exec('git update-index --skip-worktree assets/MobileFaceNet.tflite', (err, stdout, stderr) => {
  if (err) {
    console.warn('[Warning] Failed to run git update-index. If you are not using Git or running in a container, this is normal:', stderr || err.message);
  } else {
    console.log('[Success] Configured Git to ignore local changes to assets/MobileFaceNet.tflite.');
  }
  process.exit(0);
});
