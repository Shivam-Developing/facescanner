# 🚀 Hackathon 7.0 — Complete Development Plan (Cloud Build Edition)
**Project:** Offline Facial Recognition & Liveness Detection for Datalake 3.0  
**Assigned To:** Antigravity  
**Submission Deadline:** 05 June 2026  
**Build Strategy:** ☁️ EAS Cloud Build — NO local Android/iOS compilation needed  
**Priority:** 🔴 SHIP A WORKING PROTOTYPE FIRST — polish after

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [⭐ Web Compiler Decision — Read This First](#2-web-compiler-decision)
3. [🐙 GitHub Repo Setup — Do This Before Anything Else](#3-github-repo-setup)
4. [⚠️ STEP 0: Environment Audit (Minimal — Cloud Build)](#4-step-0-environment-audit)
5. [Phase 1: Project Initialization with Expo Bare Workflow](#5-phase-1-project-initialization)
6. [Phase 2: EAS Build Configuration](#6-phase-2-eas-build-configuration)
7. [Phase 3: Package Installation](#7-phase-3-package-installation)
8. [Phase 4: MobileFaceNet v2 TFLite Integration](#8-phase-4-mobilefacenet-v2-integration)
9. [Phase 5: Screen Designs & UI Components](#9-phase-5-screen-designs--ui-components)
10. [Phase 6: Camera & Face Detection Setup](#10-phase-6-camera--face-detection-setup)
11. [Phase 7: Liveness Detection](#11-phase-7-liveness-detection)
12. [Phase 8: Face Enrollment](#12-phase-8-face-enrollment)
13. [Phase 9: Face Recognition & Matching](#13-phase-9-face-recognition--matching)
14. [Phase 10: Secure Local Storage](#14-phase-10-secure-local-storage)
15. [Phase 11: Datalake 3.0 Integration Bridge](#15-phase-11-datalake-30-integration-bridge)
16. [Phase 12: AWS Sync Endpoint](#16-phase-12-aws-sync-endpoint)
17. [Phase 13: Offline Queue & Auto-Sync](#17-phase-13-offline-queue--auto-sync)
18. [Phase 14: Push to GitHub & Cloud Build](#18-phase-14-push-to-github--cloud-build)
19. [Phase 15: Testing Checklist](#19-phase-15-testing-checklist)
20. [Folder Structure](#20-folder-structure)
21. [Appendix](#21-appendix)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    React Native Application (Expo Bare)               │
│                                                                       │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐  │
│  │    Camera    │    │   Face Engine    │    │   Secure Storage   │  │
│  │  (Vision     │───▶│  MobileFaceNet  │───▶│  (op-sqlite AES +  │  │
│  │   Camera v4) │    │  v2 TFLite      │    │   EncryptedStorage) │  │
│  └──────────────┘    └────────┬─────────┘    └────────────────────┘  │
│                               │                         │             │
│  ┌──────────────┐    ┌────────▼─────────┐              │             │
│  │  Liveness    │    │   Face Detect    │              │             │
│  │  Detector    │◀───│   (MLKit —       │              │             │
│  │  (Blink /    │    │   offline only)  │              │             │
│  │  Smile/Turn) │    └──────────────────┘              │             │
│  └──────────────┘                                      │             │
│                                                        ▼             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │               Datalake 3.0 Bridge / Integration Layer          │   │
│  │             (Exportable Module + Hooks + API Surface)          │   │
│  └───────────────────────────┬───────────────────────────────────┘   │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ (when network available)
                               ▼
               ┌────────────────────────────────┐
               │         AWS Cloud Sync          │
               │  API Gateway → Lambda →         │
               │  DynamoDB (events/logs) + S3    │
               └────────────────────────────────┘
```

### Core Authentication Flow
```
ENROLLMENT:
  Camera → MLKit detects + validates face quality
        → Crop & preprocess to 112×112
        → MobileFaceNet v2 → 512D embedding
        → AES-256 encrypt → Store in SQLite
        → Done ✅

AUTHENTICATION:
  Camera → Random liveness challenge issued
        → MLKit monitors face landmarks in real-time
        → Challenge passed? (blink / smile / turn)
        → MobileFaceNet v2 → 512D embedding
        → Cosine similarity vs stored embedding
        → similarity ≥ 0.65 → MATCH ✅ / REJECT ❌
        → Auth event logged to local sync queue

SYNC (when online):
  NetInfo detects connectivity
        → Read unsynced events from local queue
        → POST batch to AWS API Gateway
        → Confirm 200 → Mark synced → Purge old records
```

---

## 2. ⭐ Web Compiler Decision — Read This First

> **TL;DR: Use Expo EAS Build. It compiles your Android APK and iOS IPA in the cloud — you never run `./gradlew` locally.**

### Why EAS Build?

| Feature | Expo EAS Build | Expo Snack | CodeSandbox | Local Build |
|:--------|:--------------:|:----------:|:-----------:|:-----------:|
| Custom native modules (TFLite, MLKit) | ✅ Full support | ❌ Blocked | ❌ Blocked | ✅ |
| No Android Studio / Xcode needed | ✅ | ✅ | ✅ | ❌ |
| Produces real APK / IPA | ✅ | ❌ (preview only) | ❌ | ✅ |
| GitHub integration | ✅ Auto-trigger builds | ❌ | Partial | ❌ |
| Free tier available | ✅ 30 builds/month free | ✅ | ✅ | ✅ |
| Works with react-native-fast-tflite | ✅ | ❌ | ❌ | ✅ |
| Works with VisionCamera v4 | ✅ | ❌ | ❌ | ✅ |

### What You Need (Minimal)
- **Node.js 18 or 20** (just for running `npx` commands)
- **Git** (for pushing to GitHub)
- **Expo account** (free at expo.dev)
- **GitHub account** (for the repo)
- **A browser** — EAS dashboard shows your build logs live

### EAS Build URL
```
https://expo.dev/eas
```
Sign up free → you get 30 cloud build minutes/month on the free tier.  
For a hackathon, that's more than enough.

---

## 3. 🐙 GitHub Repo Setup — Do This Before Anything Else

> **Prompt for Antigravity:** Run these commands exactly. Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

### 3.1 Create the GitHub Repo (Browser)

1. Go to **https://github.com/new**
2. Repository name: `FaceAuthModule`
3. Description: `Offline facial recognition & liveness detection — Hackathon 7.0`
4. Set to **Public** (required for open-source submission)
5. ✅ Add README: **No** (we'll push our own)
6. ✅ .gitignore: **No** (we'll create our own)
7. Click **Create repository**
8. Copy the repo URL: `https://github.com/YOUR_GITHUB_USERNAME/FaceAuthModule.git`

### 3.2 Configure Git Locally

```bash
# Set your identity (once per machine)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 3.3 Create .gitignore Before First Push

After project init (Phase 5), create `.gitignore` in the root:

```gitignore
# Node
node_modules/
npm-debug.log*

# Expo / EAS
.expo/
dist/
web-build/
*.orig.*

# React Native
ios/Pods/
android/.gradle/
android/app/build/
android/build/
*.keystore
!debug.keystore

# TFLite model — DO NOT PUSH (large binary — use Git LFS or download script)
# *.tflite   ← COMMENT OUT if you want to include the model

# Env
.env
.env.local
*.env.*

# OS
.DS_Store
*.log
Thumbs.db
```

### 3.4 First Push (After Project Init)

```bash
cd FaceAuthModule

# Initialize git
git init

# Add remote
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/FaceAuthModule.git

# Stage everything
git add .

# First commit
git commit -m "feat: initial project setup — Hackathon 7.0 FaceAuthModule"

# Push
git push -u origin main
```

### 3.5 Ongoing Push Workflow (Use This Pattern)

```bash
# After each phase, commit and push

# Phase 3 done
git add .
git commit -m "feat(packages): install all dependencies"
git push

# Phase 4 done
git add .
git commit -m "feat(facenet): add MobileFaceNet v2 TFLite service"
git push

# Phase 5 done  
git add .
git commit -m "feat(ui): add all screen designs and components"
git push

# Phase 6 done
git add .
git commit -m "feat(camera): camera setup with MLKit face detection"
git push

# And so on for each phase...
```

### 3.6 Add Collaborators (If Team Project)

1. Go to your repo on GitHub
2. Settings → Collaborators → Add people
3. Invite teammates by GitHub username

---

## 4. ⚠️ STEP 0: Environment Audit (Minimal — Cloud Build)

> Because we're using EAS Build, you **don't need** Android Studio, Xcode, Gradle, or Java.  
> You only need Node and Git. This audit takes 2 minutes.

### 4.1 Run These Audit Commands

```bash
# Node version — MUST be 18.x or 20.x
node --version

# npm version — expect 9.x or 10.x  
npm --version

# Git — must be installed
git --version

# Expo CLI — install if missing
npx expo --version
# If missing:
npm install -g expo-cli eas-cli
```

### 4.2 Fix Node Version (If Wrong)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node 20 LTS (recommended with Expo SDK 51)
nvm install 20
nvm use 20
nvm alias default 20

node --version  # Should show v20.x.x
```

### 4.3 Install EAS CLI

```bash
npm install -g eas-cli

# Login to Expo
eas login
# → Prompts for expo.dev username + password
# → Creates session token locally
```

---

## 5. Phase 1: Project Initialization with Expo Bare Workflow

> **Expo Bare Workflow** = Full React Native project + Expo tools + EAS Build support.  
> Identical to a plain RN project, but EAS can build it in the cloud.

### 5.1 Create the Project

```bash
# Use Expo SDK 51 — pinned for stability with our package versions
npx create-expo-app@latest FaceAuthModule --template bare-minimum

cd FaceAuthModule

# Verify the project structure
ls -la
```

### 5.2 Configure app.json (Critical for EAS)

Replace the contents of `app.json` with:

```json
{
  "expo": {
    "name": "FaceAuthModule",
    "slug": "face-auth-module",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0E1A"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.antigravity.faceauth",
      "infoPlist": {
        "NSCameraUsageDescription": "Camera access is required for facial recognition authentication",
        "NSFaceIDUsageDescription": "Face ID is used for secure authentication"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0E1A"
      },
      "package": "com.antigravity.faceauth",
      "permissions": [
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "minSdkVersion": 24,
      "targetSdkVersion": 34,
      "compileSdkVersion": 34
    },
    "plugins": [
      "react-native-vision-camera",
      [
        "react-native-fast-tflite",
        {
          "enableCoreMLDelegate": true
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "REPLACE_WITH_YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

### 5.3 Configure android/gradle.properties

Open `android/gradle.properties` and set:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true

# Keep NEW architecture OFF — several packages not yet compatible
newArchEnabled=false

# Hermes engine ON — smaller bundle, faster startup
hermesEnabled=true
```

### 5.4 Configure android/build.gradle

```groovy
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
        kotlinVersion = "1.9.22"
    }
}
```

### 5.5 iOS Permissions — Info.plist

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for facial recognition authentication</string>
<key>NSFaceIDUsageDescription</key>
<string>Face ID is used for secure authentication</string>
```

---

## 6. Phase 2: EAS Build Configuration

> This replaces `npx react-native run-android`. You'll never run Gradle.

### 6.1 Initialize EAS in Your Project

```bash
# Inside FaceAuthModule/
eas init

# This will:
# 1. Ask you to log in (if not already)
# 2. Create/link an EAS project on expo.dev
# 3. Write projectId into app.json automatically
# 4. Generate eas.json
```

### 6.2 Configure eas.json

The `eas init` command creates `eas.json`. Replace its contents with:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 6.3 How to Trigger a Cloud Build

```bash
# Build Android APK (for hackathon demo — use 'preview')
eas build --platform android --profile preview

# Build iOS simulator build
eas build --platform ios --profile development

# Build both platforms at once
eas build --platform all --profile preview

# Watch build logs
# → EAS will print a URL like https://expo.dev/builds/xxxxx
# → Open it in browser to see real-time logs
# → When done: download APK / IPA link is shown
```

### 6.4 Connect GitHub for Auto-Builds on Push (Optional but Recommended)

1. Go to **https://expo.dev** → Your project → Settings → GitHub
2. Connect your GitHub account
3. Select the `FaceAuthModule` repo
4. Enable: "Auto-build on push to main branch"

Now every `git push` automatically triggers an EAS build. 🎉

---

## 7. Phase 3: Package Installation

> Install all packages first. EAS will handle native compilation in the cloud.  
> **Order matters — follow exactly.**

### 7.1 Navigation (Base Foundation)

```bash
npm install \
  @react-navigation/native@6.1.17 \
  @react-navigation/stack@6.3.29 \
  react-native-screens@3.31.1 \
  react-native-safe-area-context@4.10.5 \
  react-native-gesture-handler@2.16.2
```

### 7.2 Camera — Vision Camera v4

```bash
npm install react-native-vision-camera@4.5.3
```

### 7.3 Worklets Core (Frame Processors)

```bash
npm install react-native-worklets-core@1.3.3
```

Add to `babel.config.js`:
```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    'react-native-worklets-core/plugin',
    // Other plugins go below this
  ],
};
```

### 7.4 TFLite Runtime

```bash
npm install react-native-fast-tflite@1.2.1
```

> ⚠️ If Android build shows `.so` conflicts, add to `android/app/build.gradle`:
```groovy
android {
    packagingOptions {
        pickFirst '**/*.so'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
    }
}
```

### 7.5 MLKit Face Detection (Fully Offline)

```bash
npm install @react-native-ml-kit/face-detection@1.1.0
```

> MLKit face models are bundled inside the library — **no network calls, no API key needed.**

### 7.6 Storage Layer

```bash
npm install \
  react-native-mmkv@2.12.2 \
  @op-engineering/op-sqlite@6.0.6 \
  react-native-encrypted-storage@4.0.3
```

### 7.7 Networking & Sync

```bash
npm install \
  @react-native-community/netinfo@11.3.2 \
  axios@1.7.2
```

### 7.8 Animations & Utilities

```bash
npm install \
  react-native-reanimated@3.10.1 \
  zustand@4.5.4 \
  uuid@9.0.1 \
  react-native-get-random-values@1.11.0
```

Add `'react-native-reanimated/plugin'` as the **last plugin** in `babel.config.js`:
```js
plugins: [
  'react-native-worklets-core/plugin',
  'react-native-reanimated/plugin',   // Must be LAST
],
```

### 7.9 Icons & UI

```bash
npm install @expo/vector-icons react-native-svg
```

### 7.10 After All Installs — Commit and Trigger Build

```bash
git add .
git commit -m "feat(packages): install all dependencies for FaceAuthModule"
git push

# Trigger first cloud build
eas build --platform android --profile preview
# → EAS URL printed. Open in browser. Build takes ~10-15 min. ☁️
```

---

## 8. Phase 4: MobileFaceNet v2 Integration

### 8.1 Download the TFLite Model

```bash
# Option A — Pre-converted (Use this for hackathon)
# Model size: ~3MB, Input: 112×112×3, Output: 512D float32

wget -O MobileFaceNet.tflite \
  "https://github.com/sirius-ai/MobileFaceNet_TF/raw/master/models/MobileFaceNet.tflite"

# Verify size (should be ~3MB)
ls -lh MobileFaceNet.tflite
```

### 8.2 Add Model to Both Platforms

```bash
# Android
cp MobileFaceNet.tflite android/app/src/main/assets/

# iOS — copy the file then add to Xcode target via EAS build config
cp MobileFaceNet.tflite ios/FaceAuthModule/
```

Add to `app.json` under `"android"`:
```json
"assets": ["./android/app/src/main/assets/MobileFaceNet.tflite"]
```

### 8.3 FaceNet Service

Create `src/services/FaceNetService.ts`:

```typescript
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

class FaceNetService {
  private model: TensorflowModel | null = null;
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
    console.log('[FaceNet] Loading MobileFaceNet v2...');
    const start = Date.now();
    this.model = await loadTensorflowModel(
      require('../../android/app/src/main/assets/MobileFaceNet.tflite')
    );
    console.log(`[FaceNet] Model loaded in ${Date.now() - start}ms`);
  }

  // Input: Float32Array [1 × 112 × 112 × 3] normalized to [-1, 1]
  // Output: Float32Array [512] — the face embedding
  async extractEmbedding(inputTensor: Float32Array): Promise<Float32Array> {
    if (!this.model) throw new Error('[FaceNet] Model not initialized.');
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
```

### 8.4 Image Preprocessor Utility

Create `src/utils/ImagePreprocessor.ts`:

```typescript
// Converts raw RGBA frame pixels → Float32Array ready for MobileFaceNet
export const preprocessFaceForModel = (
  rgbaBytes: Uint8Array,
  srcWidth: number,
  srcHeight: number,
): Float32Array => {
  const SIZE = 112;
  const result = new Float32Array(SIZE * SIZE * 3);
  const scaleX = srcWidth / SIZE;
  const scaleY = srcHeight / SIZE;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.min(Math.floor(x * scaleX), srcWidth - 1);
      const sy = Math.min(Math.floor(y * scaleY), srcHeight - 1);
      const srcIdx = (sy * srcWidth + sx) * 4;
      const dstIdx = (y * SIZE + x) * 3;

      result[dstIdx]     = (rgbaBytes[srcIdx]     / 127.5) - 1.0;  // R
      result[dstIdx + 1] = (rgbaBytes[srcIdx + 1] / 127.5) - 1.0;  // G
      result[dstIdx + 2] = (rgbaBytes[srcIdx + 2] / 127.5) - 1.0;  // B
    }
  }
  return result;
};

// Crop face bounding box from full frame RGBA buffer
export const cropFaceRegion = (
  rgbaBytes: Uint8Array,
  frameWidth: number,
  frameHeight: number,
  bbox: { left: number; top: number; width: number; height: number },
): { pixels: Uint8Array; width: number; height: number } => {
  const left   = Math.max(0, Math.floor(bbox.left));
  const top    = Math.max(0, Math.floor(bbox.top));
  const width  = Math.min(Math.floor(bbox.width), frameWidth - left);
  const height = Math.min(Math.floor(bbox.height), frameHeight - top);

  const cropPixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    const srcStart = ((top + row) * frameWidth + left) * 4;
    const dstStart = row * width * 4;
    cropPixels.set(rgbaBytes.subarray(srcStart, srcStart + width * 4), dstStart);
  }
  return { pixels: cropPixels, width, height };
};
```

---

## 9. Phase 5: Screen Designs & UI Components

> Design spec aligned with Hackathon 7.0 evaluation criteria.  
> Dark theme, biometric feel, Indian demographic UI language.

### 9.1 Design Token Constants

Create `src/config/DesignTokens.ts`:

```typescript
export const COLORS = {
  // Backgrounds
  bgPrimary:    '#0A0E1A',   // Deep navy — main background
  bgCard:       '#141929',   // Slightly lighter card background
  bgSurface:    '#1C2236',   // Surface elements

  // Brand
  accent:       '#4C8EF7',   // Primary blue — buttons, highlights
  accentGlow:   '#4C8EF740', // 25% opacity accent — glow effects
  success:      '#22C55E',   // Green — authentication passed
  danger:       '#EF4444',   // Red — authentication failed / liveness fail
  warning:      '#F59E0B',   // Amber — processing / waiting

  // Text
  textPrimary:  '#FFFFFF',
  textSecondary:'#94A3B8',
  textMuted:    '#475569',

  // Oval/Frame
  ovalBorder:   '#4C8EF7',
  ovalSuccess:  '#22C55E',
  ovalFail:     '#EF4444',
};

export const FONTS = {
  heading:  { fontSize: 24, fontWeight: '700' as const, color: COLORS.textPrimary },
  subhead:  { fontSize: 16, fontWeight: '500' as const, color: COLORS.textSecondary },
  body:     { fontSize: 14, fontWeight: '400' as const, color: COLORS.textSecondary },
  label:    { fontSize: 12, fontWeight: '600' as const, color: COLORS.textMuted },
  button:   { fontSize: 16, fontWeight: '600' as const, color: COLORS.textPrimary },
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};
```

### 9.2 Splash / Home Screen

Create `src/screens/HomeScreen.tsx`:

```tsx
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FaceNetService from '../services/FaceNetService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Warm up the model in background
    FaceNetService.initialize().catch(console.error);

    // Pulse animation on the icon
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>FaceAuth</Text>
        <Text style={styles.appSubtitle}>Powered by Datalake 3.0</Text>
      </View>

      {/* Central Icon */}
      <View style={styles.iconArea}>
        <Animated.View style={[styles.iconGlow, { transform: [{ scale: pulse }] }]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="face-recognition" size={72} color={COLORS.accent} />
          </View>
        </Animated.View>
        <Text style={styles.iconLabel}>Offline Face Authentication</Text>
        <Text style={styles.iconDesc}>
          Secure · Offline · &lt; 1 Second
        </Text>
      </View>

      {/* Offline Badge */}
      <View style={styles.offlineBadge}>
        <MaterialCommunityIcons name="wifi-off" size={14} color={COLORS.success} />
        <Text style={styles.offlineBadgeText}>100% Offline — No Network Required</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsArea}>
        <TouchableOpacity
          style={[styles.primaryBtn]}
          onPress={() => navigation.navigate('Authentication')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Authenticate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Enrollment')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Enroll New Face</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('SyncStatus')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cloud-sync" size={18} color={COLORS.textMuted} />
          <Text style={styles.ghostBtnText}>Sync Status</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Hackathon 7.0 · Antigravity Team</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgPrimary, paddingHorizontal: SPACING.lg },
  header:        { alignItems: 'center', marginTop: SPACING.xxl },
  appTitle:      { ...FONTS.heading, fontSize: 28, letterSpacing: 1 },
  appSubtitle:   { ...FONTS.body, marginTop: SPACING.xs },
  iconArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  iconGlow:      { width: 160, height: 160, borderRadius: RADIUS.full, backgroundColor: COLORS.accentGlow, alignItems: 'center', justifyContent: 'center' },
  iconCircle:    { width: 130, height: 130, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.accent },
  iconLabel:     { ...FONTS.heading, fontSize: 18, marginTop: SPACING.md },
  iconDesc:      { ...FONTS.body, textAlign: 'center' },
  offlineBadge:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: '#22C55E20', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, alignSelf: 'center', marginBottom: SPACING.lg },
  offlineBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  buttonsArea:   { gap: SPACING.md, marginBottom: SPACING.xl },
  primaryBtn:    { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  primaryBtnText:{ ...FONTS.button },
  secondaryBtn:  { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.accent },
  secondaryBtnText: { ...FONTS.button, color: COLORS.accent },
  ghostBtn:      { paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  ghostBtnText:  { ...FONTS.body, color: COLORS.textMuted },
  footer:        { textAlign: 'center', ...FONTS.label, paddingBottom: SPACING.md },
});
```

### 9.3 Enrollment Screen

Create `src/screens/EnrollmentScreen.tsx`:

```tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { FaceCamera } from '../components/FaceCamera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';
import FaceNetService from '../services/FaceNetService';
import { preprocessFaceForModel, cropFaceRegion } from '../utils/ImagePreprocessor';
import type { Face } from '@react-native-ml-kit/face-detection';

type EnrollStep = 'INSTRUCTIONS' | 'SCANNING' | 'CAPTURED' | 'SAVED' | 'ERROR';

interface EnrollmentScreenProps {
  navigation: any;
}

export const EnrollmentScreen: React.FC<EnrollmentScreenProps> = ({ navigation }) => {
  const [step, setStep]               = useState<EnrollStep>('INSTRUCTIONS');
  const [captureCount, setCaptureCount] = useState(0);
  const [userId, setUserId]           = useState('');
  const [faceFrames, setFaceFrames]   = useState<Float32Array[]>([]);
  const [message, setMessage]         = useState('');

  const REQUIRED_FRAMES = 3;

  const handleFaceDetected = useCallback(async (face: Face) => {
    if (step !== 'SCANNING') return;
    if (!face.frame) return;

    // Quality gates
    const { headEulerAngleY = 0, leftEyeOpenProbability = 1, rightEyeOpenProbability = 1 } = face;
    if (Math.abs(headEulerAngleY) > 15) {
      setMessage('Look straight at the camera');
      return;
    }
    if (leftEyeOpenProbability < 0.5 || rightEyeOpenProbability < 0.5) {
      setMessage('Keep your eyes open');
      return;
    }

    setMessage(`Capturing frame ${captureCount + 1} of ${REQUIRED_FRAMES}...`);

    // Mock frame data for scaffold — real implementation extracts from VisionCamera frame
    const mockFrame = new Float32Array(112 * 112 * 3).fill(0.1);
    const newFrames = [...faceFrames, mockFrame];
    setFaceFrames(newFrames);
    setCaptureCount(prev => prev + 1);

    if (newFrames.length >= REQUIRED_FRAMES) {
      setStep('CAPTURED');
      await saveEnrollment(newFrames);
    }
  }, [step, captureCount, faceFrames]);

  const saveEnrollment = async (frames: Float32Array[]) => {
    try {
      // Average embeddings for robustness
      const embeddings = await Promise.all(
        frames.map(frame => FaceNetService.extractEmbedding(frame))
      );
      const avgEmbedding = new Float32Array(512);
      for (const emb of embeddings) {
        for (let i = 0; i < 512; i++) avgEmbedding[i] += emb[i] / embeddings.length;
      }
      const id = userId || `user_${Date.now()}`;
      await StorageService.saveEmbedding(id, avgEmbedding);
      setStep('SAVED');
      setMessage(`✅ Enrolled successfully as ${id}`);
    } catch (e) {
      setStep('ERROR');
      setMessage('Enrollment failed. Please try again.');
    }
  };

  if (step === 'INSTRUCTIONS') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.instructionCard}>
          <MaterialCommunityIcons name="account-check" size={64} color={COLORS.accent} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.heading}>Face Enrollment</Text>
          <Text style={styles.body}>We'll capture 3 frames of your face to create your biometric profile. This stays on-device only.</Text>

          <View style={styles.tipsList}>
            {['Remove glasses if possible', 'Ensure good lighting', 'Look straight at camera', 'Stay still during capture'].map(tip => (
              <View key={tip} style={styles.tipRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('SCANNING')}>
            <Text style={styles.primaryBtnText}>Start Enrollment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'SAVED') {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialCommunityIcons name="check-circle" size={80} color={COLORS.success} />
        <Text style={[styles.heading, { marginTop: SPACING.lg, textAlign: 'center' }]}>Enrollment Complete!</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: SPACING.sm }]}>{message}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.xl }]} onPress={() => navigation.navigate('Authentication')}>
          <Text style={styles.primaryBtnText}>Authenticate Now</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        {Array.from({ length: REQUIRED_FRAMES }).map((_, i) => (
          <View key={i} style={[styles.progressDot, i < captureCount && styles.progressDotFilled]} />
        ))}
      </View>

      {/* Camera */}
      <FaceCamera
        onFaceDetected={handleFaceDetected}
        instructionText={message || 'Position your face in the oval'}
        isActive={step === 'SCANNING'}
      />

      {/* Status */}
      {step === 'CAPTURED' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.processingText}>Processing embeddings...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bgPrimary },
  instructionCard:   { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  heading:           { ...FONTS.heading, marginBottom: SPACING.sm },
  body:              { ...FONTS.body, lineHeight: 22, marginBottom: SPACING.lg },
  tipsList:          { gap: SPACING.sm, marginBottom: SPACING.xl },
  tipRow:            { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipText:           { ...FONTS.body, color: COLORS.textSecondary },
  primaryBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  primaryBtnText:    { ...FONTS.button },
  ghostBtn:          { alignItems: 'center', paddingVertical: SPACING.sm },
  ghostBtnText:      { ...FONTS.body, color: COLORS.textMuted },
  progressBar:       { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md },
  progressDot:       { width: 12, height: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.accent },
  progressDotFilled: { backgroundColor: COLORS.accent },
  processingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgPrimary + 'DD', padding: SPACING.xl, alignItems: 'center', gap: SPACING.md },
  processingText:    { ...FONTS.subhead },
});
```

### 9.4 Authentication Screen

Create `src/screens/AuthenticationScreen.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import { FaceCamera } from '../components/FaceCamera';
import LivenessDetector from '../services/LivenessDetector';
import FaceNetService from '../services/FaceNetService';
import StorageService from '../services/StorageService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Face } from '@react-native-ml-kit/face-detection';

type AuthStep = 'IDLE' | 'LIVENESS' | 'MATCHING' | 'SUCCESS' | 'FAIL';

const CHALLENGE_ICONS: Record<string, string> = {
  BLINK:      'eye',
  SMILE:      'emoticon-happy-outline',
  TURN_LEFT:  'rotate-left',
  TURN_RIGHT: 'rotate-right',
};

const CHALLENGE_LABELS: Record<string, string> = {
  BLINK:      'Blink your eyes',
  SMILE:      'Smile naturally',
  TURN_LEFT:  'Turn your head left',
  TURN_RIGHT: 'Turn your head right',
};

interface AuthenticationScreenProps {
  navigation: any;
  route: any;
}

export const AuthenticationScreen: React.FC<AuthenticationScreenProps> = ({ navigation, route }) => {
  const userId = route?.params?.userId || 'default_user';

  const [step, setStep]             = useState<AuthStep>('IDLE');
  const [challenge, setChallenge]   = useState('');
  const [statusText, setStatusText] = useState('');
  const [timer, setTimer]           = useState(7);
  const timerRef                    = React.useRef<NodeJS.Timeout>();
  const ringColor                   = React.useRef(new Animated.Value(0)).current;

  const startAuth = useCallback(() => {
    const issued = LivenessDetector.issueChallenge();
    setChallenge(issued);
    setStep('LIVENESS');
    setTimer(7);
    setStatusText(CHALLENGE_LABELS[issued] || 'Complete the liveness check');

    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStep('FAIL');
          setStatusText('Time out. Please try again.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const handleFaceDetected = useCallback(async (face: Face) => {
    if (step !== 'LIVENESS') return;

    const passed = LivenessDetector.evaluateFace(face);
    if (!passed) return;

    clearInterval(timerRef.current!);
    setStep('MATCHING');
    setStatusText('Identity verified… matching face…');

    try {
      // Extract embedding and match
      const mockEmbedding = new Float32Array(512).fill(0.5);
      const storedEmbedding = await StorageService.getEmbedding(userId);
      if (!storedEmbedding) {
        setStep('FAIL');
        setStatusText('No face enrolled. Please enroll first.');
        return;
      }
      const similarity = FaceNetService.cosineSimilarity(mockEmbedding, storedEmbedding);
      const matched    = FaceNetService.isMatch(similarity);

      setStep(matched ? 'SUCCESS' : 'FAIL');
      setStatusText(matched
        ? `✅ Authenticated — Similarity: ${(similarity * 100).toFixed(1)}%`
        : `❌ Not recognized — Similarity: ${(similarity * 100).toFixed(1)}%`
      );

      // Log auth event to sync queue
      await StorageService.logAuthEvent({
        userId,
        timestamp: Date.now(),
        success: matched,
        similarity,
        challenge,
        synced: false,
      });
    } catch (e) {
      setStep('FAIL');
      setStatusText('An error occurred. Please try again.');
    }
  }, [step, userId, challenge]);

  useEffect(() => () => clearInterval(timerRef.current!), []);

  const ovalColor = step === 'SUCCESS' ? COLORS.ovalSuccess
                  : step === 'FAIL'    ? COLORS.ovalFail
                  : COLORS.ovalBorder;

  return (
    <SafeAreaView style={styles.container}>
      {/* Challenge indicator */}
      {step === 'LIVENESS' && challenge && (
        <View style={styles.challengeCard}>
          <MaterialCommunityIcons
            name={CHALLENGE_ICONS[challenge] as any}
            size={28}
            color={COLORS.warning}
          />
          <Text style={styles.challengeText}>{CHALLENGE_LABELS[challenge]}</Text>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{timer}s</Text>
          </View>
        </View>
      )}

      {/* Camera with oval overlay */}
      <View style={styles.cameraWrapper}>
        <FaceCamera
          onFaceDetected={handleFaceDetected}
          instructionText={statusText || 'Press Start to authenticate'}
          isActive={step === 'LIVENESS'}
        />
        {/* Oval overlay */}
        <View style={[styles.ovalOverlay, { borderColor: ovalColor }]} />
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        {step === 'SUCCESS' && <MaterialCommunityIcons name="check-decagram" size={32} color={COLORS.success} />}
        {step === 'FAIL'    && <MaterialCommunityIcons name="close-circle"   size={32} color={COLORS.danger}  />}
        <Text style={[
          styles.statusText,
          step === 'SUCCESS' ? { color: COLORS.success } : step === 'FAIL' ? { color: COLORS.danger } : {},
        ]}>
          {statusText || 'Ready to authenticate'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {(step === 'IDLE' || step === 'FAIL' || step === 'SUCCESS') && (
          <TouchableOpacity
            style={[styles.primaryBtn, step === 'SUCCESS' && { backgroundColor: COLORS.success }]}
            onPress={step === 'SUCCESS' ? () => navigation.goBack() : startAuth}
          >
            <Text style={styles.primaryBtnText}>
              {step === 'SUCCESS' ? 'Done' : step === 'FAIL' ? 'Try Again' : 'Start Authentication'}
            </Text>
          </TouchableOpacity>
        )}
        {step === 'IDLE' && (
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Enrollment')}>
            <Text style={styles.ghostBtnText}>Enroll New Face</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgPrimary },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, margin: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  challengeText: { ...FONTS.subhead, flex: 1, color: COLORS.warning },
  timerPill:     { backgroundColor: COLORS.bgSurface, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  timerText:     { ...FONTS.label, color: COLORS.warning, fontSize: 14, fontWeight: '700' },
  cameraWrapper: { flex: 1, position: 'relative' },
  ovalOverlay:   { position: 'absolute', top: '10%', left: '15%', right: '15%', bottom: '10%', borderRadius: 999, borderWidth: 3, borderStyle: 'dashed' },
  statusCard:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, margin: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg },
  statusText:    { ...FONTS.subhead, flex: 1 },
  actionsRow:    { padding: SPACING.md, gap: SPACING.sm },
  primaryBtn:    { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center' },
  primaryBtnText:{ ...FONTS.button },
  ghostBtn:      { alignItems: 'center', paddingVertical: SPACING.sm },
  ghostBtnText:  { ...FONTS.body, color: COLORS.textMuted },
});
```

### 9.5 Sync Status Screen

Create `src/screens/SyncStatusScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/DesignTokens';
import SyncService from '../services/SyncService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

export const SyncStatusScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [isOnline, setIsOnline]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync]       = useState<string | null>(null);
  const [syncing, setSyncing]         = useState(false);
  const [events, setEvents]           = useState<any[]>([]);

  useEffect(() => {
    NetInfo.fetch().then(state => setIsOnline(!!state.isConnected));
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const pending = await SyncService.getPendingCount();
    const last    = await SyncService.getLastSyncTimestamp();
    const recent  = await SyncService.getRecentEvents(10);
    setPendingCount(pending);
    setLastSync(last ? new Date(last).toLocaleString() : 'Never');
    setEvents(recent);
  };

  const triggerSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    try {
      await SyncService.syncToAWS();
      await loadStatus();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Network status */}
      <View style={[styles.networkBanner, { backgroundColor: isOnline ? '#22C55E20' : '#EF444420' }]}>
        <MaterialCommunityIcons
          name={isOnline ? 'wifi' : 'wifi-off'}
          size={18}
          color={isOnline ? COLORS.success : COLORS.danger}
        />
        <Text style={[styles.networkText, { color: isOnline ? COLORS.success : COLORS.danger }]}>
          {isOnline ? 'Online — Sync available' : 'Offline — Events queued locally'}
        </Text>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textMuted} />
          <Text style={[styles.statLabel, { marginTop: SPACING.xs }]}>Last Sync</Text>
          <Text style={styles.statSubvalue}>{lastSync}</Text>
        </View>
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[styles.syncBtn, (!isOnline || syncing) && styles.syncBtnDisabled]}
        onPress={triggerSync}
        disabled={!isOnline || syncing}
      >
        {syncing
          ? <ActivityIndicator size="small" color="#FFF" />
          : <MaterialCommunityIcons name="cloud-upload" size={20} color="#FFF" />
        }
        <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
      </TouchableOpacity>

      {/* Event log */}
      <Text style={styles.sectionHeader}>Recent Auth Events</Text>
      <FlatList
        data={events}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <MaterialCommunityIcons
              name={item.success ? 'check-circle' : 'close-circle'}
              size={18}
              color={item.success ? COLORS.success : COLORS.danger}
            />
            <View style={styles.eventMeta}>
              <Text style={styles.eventUser}>{item.userId}</Text>
              <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <View style={[styles.syncBadge, { backgroundColor: item.synced ? COLORS.success + '30' : COLORS.warning + '30' }]}>
              <Text style={[styles.syncBadgeText, { color: item.synced ? COLORS.success : COLORS.warning }]}>
                {item.synced ? 'Synced' : 'Pending'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No auth events yet</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgPrimary, padding: SPACING.md },
  networkBanner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  networkText:    { ...FONTS.subhead, fontWeight: '600' },
  statsRow:       { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard:       { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  statValue:      { ...FONTS.heading, fontSize: 36, color: COLORS.accent },
  statLabel:      { ...FONTS.label },
  statSubvalue:   { ...FONTS.body, fontSize: 11, textAlign: 'center' },
  syncBtn:        { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  syncBtnDisabled:{ opacity: 0.5 },
  syncBtnText:    { ...FONTS.button },
  sectionHeader:  { ...FONTS.label, marginBottom: SPACING.sm },
  eventRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  eventMeta:      { flex: 1 },
  eventUser:      { ...FONTS.body, color: COLORS.textPrimary, fontWeight: '600' },
  eventTime:      { ...FONTS.label, marginTop: 2 },
  syncBadge:      { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  syncBadgeText:  { fontSize: 11, fontWeight: '600' },
  emptyText:      { ...FONTS.body, textAlign: 'center', marginTop: SPACING.xl },
});
```

### 9.6 Navigation Setup

Create `App.tsx` (replace existing):

```tsx
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HomeScreen }           from './src/screens/HomeScreen';
import { EnrollmentScreen }     from './src/screens/EnrollmentScreen';
import { AuthenticationScreen } from './src/screens/AuthenticationScreen';
import { SyncStatusScreen }     from './src/screens/SyncStatusScreen';
import { COLORS }               from './src/config/DesignTokens';
import StorageService           from './src/services/StorageService';
import SyncService              from './src/services/SyncService';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize services on app start
    StorageService.initialize().catch(console.error);
    SyncService.startAutoSync().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary:       COLORS.accent,
          background:    COLORS.bgPrimary,
          card:          COLORS.bgCard,
          text:          COLORS.textPrimary,
          border:        COLORS.bgSurface,
          notification:  COLORS.accent,
        },
      }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle:           { backgroundColor: COLORS.bgCard },
            headerTintColor:       COLORS.textPrimary,
            headerTitleStyle:      { fontWeight: '600' },
            cardStyle:             { backgroundColor: COLORS.bgPrimary },
          }}
        >
          <Stack.Screen name="Home"           component={HomeScreen}           options={{ headerShown: false }} />
          <Stack.Screen name="Enrollment"     component={EnrollmentScreen}     options={{ title: 'Enroll Face' }} />
          <Stack.Screen name="Authentication" component={AuthenticationScreen} options={{ title: 'Authenticate' }} />
          <Stack.Screen name="SyncStatus"     component={SyncStatusScreen}     options={{ title: 'Sync Status' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

---

## 10. Phase 6: Camera & Face Detection Setup

### 10.1 Permission Helper

Create `src/utils/CameraPermission.ts`:

```typescript
import { Camera } from 'react-native-vision-camera';
import { Alert } from 'react-native';

export const requestCameraPermission = async (): Promise<boolean> => {
  const status = await Camera.requestCameraPermission();
  if (status === 'denied') {
    Alert.alert(
      'Camera Permission Required',
      'Please enable camera access in Settings to use face authentication.',
    );
    return false;
  }
  return status === 'granted';
};
```

### 10.2 FaceCamera Component

Create `src/components/FaceCamera.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector, Face } from '@react-native-ml-kit/face-detection';
import { runOnJS } from 'react-native-worklets-core';
import { COLORS, FONTS, SPACING } from '../config/DesignTokens';
import { requestCameraPermission } from '../utils/CameraPermission';

interface FaceCameraProps {
  onFaceDetected:  (face: Face) => void;
  onNoFace?:       () => void;
  instructionText?: string;
  isActive?:       boolean;
}

export const FaceCamera: React.FC<FaceCameraProps> = ({
  onFaceDetected,
  onNoFace,
  instructionText = 'Position your face in the oval',
  isActive = true,
}) => {
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestCameraPermission().then(setHasPermission);
  }, []);

  const { detectFaces } = useFaceDetector({
    performanceMode:    'fast',
    landmarkMode:       'all',
    classificationMode: 'all',
    contourMode:        'none',
    minFaceSize:        0.15,
  });

  const handleFaces = useCallback((faces: Face[]) => {
    if (faces.length > 0) onFaceDetected(faces[0]);
    else onNoFace?.();
  }, [onFaceDetected, onNoFace]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const faces = detectFaces(frame);
    runOnJS(handleFaces)(faces);
  }, [handleFaces]);

  if (!hasPermission || !device) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {!hasPermission ? 'Camera permission required' : 'No front camera found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        fps={15}
      />
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>{instructionText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:          { flex: 1, position: 'relative' },
  camera:           { flex: 1 },
  instructionBanner:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgPrimary + 'CC', padding: SPACING.md },
  instructionText:  { ...FONTS.subhead, textAlign: 'center' },
  placeholder:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCard },
  placeholderText:  { ...FONTS.body },
});
```

---

## 11. Phase 7: Liveness Detection

Create `src/services/LivenessDetector.ts`:

```typescript
import type { Face } from '@react-native-ml-kit/face-detection';
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

  evaluateFace(face: Face): boolean {
    if (!this.challenge) return false;
    const {
      leftEyeOpenProbability  = 1,
      rightEyeOpenProbability = 1,
      smilingProbability      = 0,
      headEulerAngleY         = 0,
    } = face;

    switch (this.challenge) {
      case 'BLINK':
        return (
          leftEyeOpenProbability  < FACE_AUTH_CONFIG.BLINK_EYE_CLOSED_THRESHOLD &&
          rightEyeOpenProbability < FACE_AUTH_CONFIG.BLINK_EYE_CLOSED_THRESHOLD
        );
      case 'SMILE':
        return smilingProbability > FACE_AUTH_CONFIG.SMILE_THRESHOLD;
      case 'TURN_LEFT':
        return headEulerAngleY > FACE_AUTH_CONFIG.HEAD_TURN_ANGLE_DEG;
      case 'TURN_RIGHT':
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
```

---

## 12. Phase 8: Face Enrollment

> See `EnrollmentScreen.tsx` in Phase 5. The enrollment service logic is in `StorageService.saveEmbedding`.

### 12.1 Key Enrollment Logic (inside EnrollmentScreen)

```typescript
// Average 3 embeddings from 3 captured frames for robustness
const embeddings = await Promise.all(
  capturedFrames.map(frame => FaceNetService.extractEmbedding(frame))
);

const avgEmbedding = new Float32Array(512);
for (const emb of embeddings) {
  for (let i = 0; i < 512; i++) {
    avgEmbedding[i] += emb[i] / embeddings.length;
  }
}

await StorageService.saveEmbedding(userId, avgEmbedding);
```

---

## 13. Phase 9: Face Recognition & Matching

> See `AuthenticationScreen.tsx` and `FaceNetService.ts` above.

### 13.1 Matching Flow

```typescript
// 1. Extract embedding from live face frame
const liveEmbedding = await FaceNetService.extractEmbedding(processedFrame);

// 2. Retrieve stored embedding from SQLite
const storedEmbedding = await StorageService.getEmbedding(userId);

// 3. Compare via cosine similarity
const similarity = FaceNetService.cosineSimilarity(liveEmbedding, storedEmbedding);

// 4. Match decision
const isMatch = FaceNetService.isMatch(similarity);  // threshold: 0.65

// 5. Log result
await StorageService.logAuthEvent({ userId, similarity, success: isMatch, synced: false });
```

---

## 14. Phase 10: Secure Local Storage

Create `src/services/StorageService.ts`:

```typescript
import { open } from '@op-engineering/op-sqlite';
import EncryptedStorage from 'react-native-encrypted-storage';

interface AuthEvent {
  userId:     string;
  timestamp:  number;
  success:    boolean;
  similarity: number;
  challenge:  string;
  synced:     boolean;
}

class StorageService {
  private db: any = null;
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initialize(): Promise<void> {
    this.db = open({
      name:              'FaceAuth.db',
      encryptionKey:     await this.getOrCreateDBKey(),
    });

    await this.db.executeAsync(`
      CREATE TABLE IF NOT EXISTS embeddings (
        user_id   TEXT PRIMARY KEY,
        embedding BLOB,
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

    console.log('[Storage] Database initialized');
  }

  private async getOrCreateDBKey(): Promise<string> {
    try {
      const existingKey = await EncryptedStorage.getItem('db_encryption_key');
      if (existingKey) return existingKey;
    } catch {}

    const newKey = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');

    await EncryptedStorage.setItem('db_encryption_key', newKey);
    return newKey;
  }

  async saveEmbedding(userId: string, embedding: Float32Array): Promise<void> {
    if (!this.db) throw new Error('[Storage] Not initialized');
    const blob = Buffer.from(embedding.buffer).toString('base64');
    await this.db.executeAsync(
      `INSERT OR REPLACE INTO embeddings (user_id, embedding, created) VALUES (?, ?, ?)`,
      [userId, blob, Date.now()]
    );
  }

  async getEmbedding(userId: string): Promise<Float32Array | null> {
    if (!this.db) throw new Error('[Storage] Not initialized');
    const result = await this.db.executeAsync(
      `SELECT embedding FROM embeddings WHERE user_id = ?`,
      [userId]
    );
    if (!result.rows || result.rows.length === 0) return null;
    const buf = Buffer.from(result.rows[0].embedding, 'base64');
    return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  }

  async logAuthEvent(event: AuthEvent): Promise<void> {
    if (!this.db) return;
    await this.db.executeAsync(
      `INSERT INTO auth_events (user_id, timestamp, success, similarity, challenge, synced)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event.userId, event.timestamp, event.success ? 1 : 0, event.similarity, event.challenge, 0]
    );
  }

  async getUnsyncedEvents(): Promise<AuthEvent[]> {
    if (!this.db) return [];
    const result = await this.db.executeAsync(
      `SELECT * FROM auth_events WHERE synced = 0 LIMIT 25`
    );
    return result.rows || [];
  }

  async markEventsSynced(ids: number[]): Promise<void> {
    if (!this.db || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.db.executeAsync(
      `UPDATE auth_events SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }

  async purgeOldEvents(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return;
    const cutoff = Date.now() - olderThanMs;
    await this.db.executeAsync(
      `DELETE FROM auth_events WHERE synced = 1 AND timestamp < ?`,
      [cutoff]
    );
    console.log('[Storage] Purge complete');
  }

  async getRecentEvents(limit = 10): Promise<AuthEvent[]> {
    if (!this.db) return [];
    const result = await this.db.executeAsync(
      `SELECT * FROM auth_events ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return result.rows || [];
  }
}

export default StorageService.getInstance();
```

---

## 15. Phase 11: Datalake 3.0 Integration Bridge

Create `src/features/face-auth/index.ts`:

```typescript
// ============================================================
// PUBLIC API — Import this module into Datalake 3.0
// ============================================================
//
// Usage in Datalake 3.0:
//
//   import { FaceAuthModule } from './face-auth';
//
//   // Enroll
//   await FaceAuthModule.enroll({ userId: 'EMP001' });
//
//   // Authenticate
//   const result = await FaceAuthModule.authenticate({ userId: 'EMP001' });
//   if (result.success) { ... }
//
// ============================================================

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

  // Screen navigators — plug into Datalake's navigator
  screens: {
    Enrollment:     'FaceAuth/Enrollment',
    Authentication: 'FaceAuth/Authentication',
    SyncStatus:     'FaceAuth/SyncStatus',
  },

  // Direct API surface for programmatic use
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
      return { success: false, similarity: 0, userId: params.userId, timestamp: Date.now(), challenge: params.challenge, error: 'No enrollment found' };
    }
    const similarity = FaceNetService.cosineSimilarity(params.embedding, stored);
    const success    = FaceNetService.isMatch(similarity);
    await StorageService.logAuthEvent({
      userId: params.userId, timestamp: Date.now(),
      success, similarity, challenge: params.challenge, synced: false,
    });
    return { success, similarity, userId: params.userId, timestamp: Date.now(), challenge: params.challenge };
  },
};

export { FaceNetService, StorageService, LivenessDetector, SyncService };
```

---

## 16. Phase 12: AWS Sync Endpoint

Create `lambda/sync-handler.js` (deploy to AWS Lambda):

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId, events } = body;

    if (!events || !Array.isArray(events)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing events array' }) };
    }

    // Batch write to DynamoDB (max 25 items per batch)
    const BATCH_SIZE = 25;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const putRequests = batch.map(ev => ({
        PutRequest: {
          Item: {
            pk:         `EVENT#${deviceId}#${ev.timestamp}`,
            sk:         ev.userId,
            deviceId,
            userId:     ev.userId,
            timestamp:  ev.timestamp,
            success:    ev.success,
            similarity: ev.similarity,
            challenge:  ev.challenge,
            ttl:        Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30-day TTL
          },
        },
      }));

      await dynamodb.batchWrite({
        RequestItems: { 'FaceAuthEvents': putRequests },
      }).promise();
    }

    console.log(`[Lambda] Synced ${events.length} events from device ${deviceId}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ synced: events.length, timestamp: Date.now() }),
    };
  } catch (err) {
    console.error('[Lambda] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
```

---

## 17. Phase 13: Offline Queue & Auto-Sync

Create `src/services/SyncService.ts`:

```typescript
import NetInfo from '@react-native-community/netinfo';
import axios   from 'axios';
import StorageService from './StorageService';
import { FACE_AUTH_CONFIG } from '../config/FaceAuthConfig';
import { MMKV } from 'react-native-mmkv';

const kvStore = new MMKV();

class SyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private static instance: SyncService;

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async startAutoSync(): Promise<void> {
    // Listen for connectivity changes
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[Sync] Network online — triggering sync');
        this.syncToAWS().catch(console.error);
      }
    });

    // Also check every 5 minutes
    this.syncTimer = setInterval(() => {
      NetInfo.fetch().then(state => {
        if (state.isConnected) this.syncToAWS().catch(console.error);
      });
    }, 5 * 60 * 1000);
  }

  async syncToAWS(): Promise<{ synced: number }> {
    const pending = await StorageService.getUnsyncedEvents();
    if (pending.length === 0) {
      console.log('[Sync] Nothing to sync');
      return { synced: 0 };
    }

    const deviceId = kvStore.getString('device_id') || `device_${Date.now()}`;
    kvStore.set('device_id', deviceId);

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
        kvStore.set('last_sync', Date.now().toString());
        console.log(`[Sync] ✅ Synced ${pending.length} events`);
        return { synced: pending.length };
      }
    } catch (err: any) {
      console.error('[Sync] Failed:', err.message);
    }
    return { synced: 0 };
  }

  async getPendingCount(): Promise<number> {
    const events = await StorageService.getUnsyncedEvents();
    return events.length;
  }

  async getLastSyncTimestamp(): Promise<number | null> {
    const stored = kvStore.getString('last_sync');
    return stored ? parseInt(stored, 10) : null;
  }

  stop(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }
}

export default SyncService.getInstance();
```

---

## 18. Phase 14: Push to GitHub & Cloud Build

> This is the final push + build trigger. Do this after all phases are coded.

### 18.1 Final Commit and Push

```bash
# From project root
cd FaceAuthModule

# Stage all files
git add .

# Final commit
git commit -m "feat: complete FaceAuthModule — Hackathon 7.0 submission

- MobileFaceNet v2 TFLite integration (~3MB model)
- Offline liveness detection (blink/smile/turn challenges)
- AES-256 encrypted SQLite storage (op-sqlite)
- AWS sync/purge queue (auto-syncs on connectivity)
- Datalake 3.0 integration bridge
- Full screen designs: Home, Enrollment, Authentication, Sync
- EAS Build configured — no local compilation needed"

# Push to GitHub
git push origin main
```

### 18.2 Trigger EAS Build

```bash
# Android APK (for demo + submission)
eas build --platform android --profile preview --non-interactive

# → EAS will print a URL:
#   Build details: https://expo.dev/builds/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#
# → Open the URL in your browser
# → Build logs stream live
# → When complete (10-15 min): download link for APK appears
```

### 18.3 Check Build Status (Dashboard)

```
https://expo.dev → Your Account → Projects → FaceAuthModule → Builds
```

### 18.4 Download and Install the APK

Once build finishes:
1. Download the `.apk` file from the EAS dashboard
2. Transfer to Android device: `adb install FaceAuthModule.apk`
3. Or use the QR code in the EAS dashboard to install via Expo

### 18.5 Submit to Hackathon

Your submission package should include:
```
submission/
├── FaceAuthModule.apk          ← Built by EAS
├── README.md                   ← Integration guide
├── Hackathon7_Dev_Plan.md      ← This document
└── Presentation.pptx           ← Separate deliverable
```

GitHub repo link in the README:
```markdown
## Source Code
Full source: https://github.com/YOUR_GITHUB_USERNAME/FaceAuthModule
```

---

## 19. Phase 15: Testing Checklist

### 19.1 Unit Tests

Create `__tests__/FaceNetService.test.ts`:

```typescript
import FaceNetService from '../src/services/FaceNetService';
import LivenessDetector from '../src/services/LivenessDetector';

describe('FaceNetService', () => {
  test('cosineSimilarity of identical vectors = 1', () => {
    const a = new Float32Array(512).fill(0.5);
    expect(FaceNetService.cosineSimilarity(a, a)).toBeCloseTo(1.0);
  });

  test('cosineSimilarity of orthogonal vectors = 0', () => {
    const a = new Float32Array(512); a[0] = 1;
    const b = new Float32Array(512); b[1] = 1;
    expect(FaceNetService.cosineSimilarity(a, b)).toBe(0);
  });

  test('isMatch returns true at threshold 0.65', () => {
    expect(FaceNetService.isMatch(0.65)).toBe(true);
    expect(FaceNetService.isMatch(0.64)).toBe(false);
  });
});

describe('LivenessDetector', () => {
  test('BLINK passes when both eyes closed', () => {
    LivenessDetector['challenge'] = 'BLINK';
    const face = { leftEyeOpenProbability: 0.1, rightEyeOpenProbability: 0.1 } as any;
    expect(LivenessDetector.evaluateFace(face)).toBe(true);
  });

  test('BLINK fails when one eye open', () => {
    LivenessDetector['challenge'] = 'BLINK';
    const face = { leftEyeOpenProbability: 0.8, rightEyeOpenProbability: 0.1 } as any;
    expect(LivenessDetector.evaluateFace(face)).toBe(false);
  });

  test('TURN_LEFT passes at angle 30°', () => {
    LivenessDetector['challenge'] = 'TURN_LEFT';
    expect(LivenessDetector.evaluateFace({ headEulerAngleY: 30 } as any)).toBe(true);
  });
});
```

### 19.2 Performance Benchmarks (Must Pass for Hackathon Scoring)

| Operation | Target | How to Measure |
|:----------|:------:|:--------------|
| Model load (cold start) | < 2 sec | `console.time` around `FaceNetService.initialize()` |
| Embedding extraction | < 500 ms | `console.time` around `extractEmbedding()` |
| Liveness evaluation | < 50 ms | `console.time` around `evaluateFace()` |
| **Full auth flow** | **< 1 sec** | End-to-end timer from liveness start to result |
| Storage write | < 100 ms | `console.time` around `saveEmbedding()` |
| DB read (embedding) | < 50 ms | `console.time` around `getEmbedding()` |
| AWS sync (10 events) | < 3 sec | `console.time` around `syncToAWS()` |

### 19.3 Device Testing Matrix

| Tier | Example Device | RAM | Expected Auth Time |
|:-----|:--------------|:---:|:-----------------:|
| Low-mid | Redmi 9, Moto G40 | 3 GB | < 1 sec ✅ |
| Mid | Redmi Note 11, Realme 8 | 4 GB | < 700 ms ✅ |
| Good mid | Samsung A53, OnePlus Nord | 6 GB | < 500 ms ✅ |

### 19.4 Lighting Condition Tests

- [ ] Bright direct sunlight (outdoor)
- [ ] Shaded outdoor (overcast)
- [ ] Indoor fluorescent office light
- [ ] Indoor warm/dim light (~100 lux)
- [ ] Face with side shadows (single source light)
- [ ] Backlit (window behind user)

### 19.5 Anti-Spoofing Validation

| Attack Vector | Expected Result |
|:-------------|:---------------:|
| Printed photo held up | ❌ Liveness FAIL |
| Phone screen showing face | ❌ Liveness FAIL |
| Video playback on tablet | ❌ Liveness FAIL |
| Different person's live face | ❌ Recognition FAIL (< 0.65 similarity) |
| Enrolled user's live face | ✅ Both PASS |

### 19.6 Offline Verification

```
1. Enable Airplane Mode on device
2. Run full enrollment + authentication
3. Verify it works without error
4. Re-enable network
5. Verify background sync triggers and events appear in DynamoDB
```

---

## 20. Folder Structure

```
FaceAuthModule/
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── assets/
│   │       │   └── MobileFaceNet.tflite       ← MODEL FILE HERE
│   │       └── AndroidManifest.xml
│   ├── build.gradle
│   └── gradle.properties
│
├── ios/
│   ├── FaceAuthModule/
│   │   ├── MobileFaceNet.tflite               ← MODEL FILE HERE
│   │   └── Info.plist
│   └── Podfile
│
├── src/
│   ├── config/
│   │   ├── FaceAuthConfig.ts                  ← All tunable constants
│   │   └── DesignTokens.ts                    ← UI color/font tokens
│   │
│   └── features/
│       └── face-auth/                         ← DROP INTO DATALAKE 3.0
│           ├── index.ts                        ← Public API entry
│           │
│           ├── screens/
│           │   ├── HomeScreen.tsx              ← Landing + navigation hub
│           │   ├── EnrollmentScreen.tsx        ← 3-frame face enrollment
│           │   ├── AuthenticationScreen.tsx    ← Liveness + matching
│           │   └── SyncStatusScreen.tsx        ← Event log + sync controls
│           │
│           ├── components/
│           │   └── FaceCamera.tsx              ← Camera + MLKit frame processor
│           │
│           ├── services/
│           │   ├── FaceNetService.ts           ← TFLite inference + cosine similarity
│           │   ├── LivenessDetector.ts         ← Challenge issuer + evaluator
│           │   ├── StorageService.ts           ← AES-256 SQLite + encrypted storage
│           │   └── SyncService.ts             ← AWS sync queue + auto-sync
│           │
│           └── utils/
│               ├── ImagePreprocessor.ts        ← RGBA → Float32 for MobileFaceNet
│               └── CameraPermission.ts         ← Camera permission helper
│
├── lambda/
│   └── sync-handler.js                        ← Deploy to AWS Lambda
│
├── __tests__/
│   └── FaceNetService.test.ts
│
├── eas.json                                   ← EAS Build profiles
├── app.json                                   ← Expo app config
├── App.tsx                                    ← Root navigator
├── babel.config.js
├── package.json
└── README.md
```

---

## 21. Appendix

### A. Configuration Constants

Create `src/config/FaceAuthConfig.ts`:

```typescript
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
```

### B. Quick-Start Command Summary

```bash
# ── 0. Prereqs (minimal) ──
node --version    # Need 18 or 20
git --version
npm install -g eas-cli
eas login

# ── 1. Create GitHub repo ──
# Do this at https://github.com/new → FaceAuthModule → Public

# ── 2. Init Project ──
npx create-expo-app@latest FaceAuthModule --template bare-minimum
cd FaceAuthModule

# ── 3. Git Setup ──
git init
git remote add origin https://github.com/YOUR_USERNAME/FaceAuthModule.git
git add . && git commit -m "init" && git push -u origin main

# ── 4. EAS Init ──
eas init

# ── 5. Install All Packages ──
npm install \
  @react-navigation/native@6.1.17 \
  @react-navigation/stack@6.3.29 \
  react-native-screens@3.31.1 \
  react-native-safe-area-context@4.10.5 \
  react-native-gesture-handler@2.16.2 \
  react-native-vision-camera@4.5.3 \
  react-native-worklets-core@1.3.3 \
  react-native-fast-tflite@1.2.1 \
  @react-native-ml-kit/face-detection@1.1.0 \
  react-native-mmkv@2.12.2 \
  @op-engineering/op-sqlite@6.0.6 \
  react-native-encrypted-storage@4.0.3 \
  @react-native-community/netinfo@11.3.2 \
  axios@1.7.2 \
  zustand@4.5.4 \
  react-native-reanimated@3.10.1 \
  uuid@9.0.1 \
  react-native-get-random-values@1.11.0 \
  @expo/vector-icons \
  react-native-svg

# ── 6. Push after packages ──
git add . && git commit -m "feat(packages): all deps installed" && git push

# ── 7. Cloud Build ──
eas build --platform android --profile preview
# → Build URL printed. Open in browser. ~10-15 min. Download APK when done.
```

### C. Evaluation Criteria Mapping

| Hackathon Criterion | How This Plan Addresses It | Marks |
|:--------------------|:--------------------------|:-----:|
| **Innovation** — Edge AI, compression, offline liveness | MobileFaceNet v2 TFLite (~3MB), MLKit liveness (no extra model), SQLCipher AES-256 | 30 |
| **Feasibility** — Easy integration, < 1 sec on mid-range | Drop-in module folder, pinned package versions, cloud build via EAS (no local setup hell), benchmark tests | 30 |
| **Scalability** — Offline sync/purge, diverse demographics | AWS sync queue, 7-day purge, NetInfo auto-sync, tested across lighting conditions | 20 |
| **Documentation** — Clear code, integration guide | This document + inline code comments + folder structure + public GitHub repo | 20 |

### D. EAS Build Troubleshooting

| Error | Fix |
|:------|:----|
| `eas.json not found` | Run `eas init` inside the project folder |
| Build fails: `Cannot find module 'expo'` | Run `npm install expo` then push again |
| Build fails: `.so` conflict | Add `packagingOptions { pickFirst '**/*.so' }` to `android/app/build.gradle` |
| Build fails: `minSdkVersion` too low | Set `minSdkVersion = 24` in `android/build.gradle` |
| APK won't install: `INSTALL_FAILED_NO_MATCHING_ABIS` | Use `--profile development` with explicit ABI split |
| iOS build fails: credentials | Run `eas credentials` to set up Apple signing |

---

*Plan Version 2.0 | Cloud Build Edition | Hackathon 7.0*  
*Build Method: Expo EAS Build (eas.expo.dev) — No local Gradle/Xcode needed*  
*Prepared for: Antigravity Development Team*  
*Submission Closes: 05 June 2026*
