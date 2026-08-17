export type CameraPermissionResult =
  | 'granted'
  | 'denied'
  | 'unavailable';

/**
 * Requests camera permission in both native (Capacitor) and browser contexts.
 *
 * CRITICAL FIX: Uses safe iOS-aware wrapper to prevent abort_with_payload crashes.
 * Ensures Capacitor runtime is fully initialized before calling Camera plugin on iOS.
 *
 * On Capacitor (iOS/Android) the Camera plugin is used so the OS permission
 * dialog appears correctly. On browser the Permissions API + a silent
 * getUserMedia probe is used.
 *
 * Returns 'granted', 'denied', or 'unavailable'.
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  try {
    // Import safe wrapper that handles iOS runtime initialization
    const { requestCameraPermissionSafe } = await import('./cameraIOSSafe');
    return await requestCameraPermissionSafe();
  } catch (error) {
    console.error('Camera permission request failed:', error);
    return 'unavailable';
  }
}
