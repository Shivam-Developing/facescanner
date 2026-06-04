import Constants from 'expo-constants';

/**
 * Checks if the application is running in a mock-only environment
 * (such as standard Expo Go, Expo Snack, or Web).
 * 
 * stand-alone custom developer clients built via EAS will return false,
 * allowing real native modules to run.
 */
export const isMockEnvironment = (): boolean => {
  // Constants.appOwnership is 'expo' when running in standard Expo Go / Snack
  if (Constants.appOwnership === 'expo') {
    console.log('[Environment] Expo Go/Snack detected. Enabling mock biometrics/storage.');
    return true;
  }

  // Fallback check: Web environment or non-native previews
  if (typeof document !== 'undefined') {
    return true;
  }

  return false;
};
