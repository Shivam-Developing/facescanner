const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_URL = 'https://raw.githubusercontent.com/sirius-ai/MobileFaceNet_TF/master/models/MobileFaceNet.tflite';
const DEST_PATH = path.join(__dirname, '../assets/MobileFaceNet.tflite');

// Ensure assets directory exists
const assetsDir = path.dirname(DEST_PATH);
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    function get(requestUrl) {
      console.log(`Downloading model from: ${requestUrl}`);
      https.get(requestUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          console.log(`Redirecting to: ${response.headers.location}`);
          get(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download model: Server responded with status ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('Model download completed successfully.');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {}); // Delete the file async
        reject(err);
      });
    }

    get(url);
  });
}

console.log('Initializing model download...');
download(MODEL_URL, DEST_PATH)
  .then(() => {
    const stats = fs.statSync(DEST_PATH);
    console.log(`Model saved at: ${DEST_PATH} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error downloading model:', err);
    process.exit(1);
  });
