import { capacitorReady } from '../main';

export type CameraPermissionResult = 'granted' | 'denied' | 'unavailable';

async function getNativePlatform(): Promise<'ios' | 'android' | 'web'> {
  try {
    await capacitorReady;
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return 'web';
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
    return 'web';
  } catch {
    return 'web';
  }
}

export async function isIOSNative(): Promise<boolean> {
  return (await getNativePlatform()) === 'ios';
}

export async function isAndroidNative(): Promise<boolean> {
  return (await getNativePlatform()) === 'android';
}

export async function requestCameraPermissionSafe(): Promise<CameraPermissionResult> {
  try {
    await capacitorReady;
    const platform = await getNativePlatform();

    if (platform === 'ios' || platform === 'android') {
      try {
        const { Camera } = await import('@capacitor/camera');

        if (platform === 'ios') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await Camera.requestPermissions({ permissions: ['camera'] });
        const camPerm = result.camera;

        if (camPerm === 'granted' || camPerm === 'limited') return 'granted';
        if (camPerm === 'denied') return 'denied';
        return 'unavailable';
      } catch (error) {
        console.error('Camera plugin error on native:', error);
        return 'unavailable';
      }
    }

    return requestCameraPermissionWeb();
  } catch (error) {
    console.error('Camera permission request failed:', error);
    return 'unavailable';
  }
}

export async function requestCameraPermissionWeb(): Promise<CameraPermissionResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'unavailable';
  }

  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (result.state === 'denied') return 'denied';
      if (result.state === 'granted') return 'granted';
    } catch {
      // fall through
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach(t => t.stop());
    return 'granted';
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
    return 'unavailable';
  }
}

export async function verifyCameraRuntimeSafe(): Promise<boolean> {
  try {
    await capacitorReady;
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return true;
  }
}
