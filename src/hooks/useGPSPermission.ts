import { useCallback, useState } from 'react';

export interface GPSPermissionStatus {
  state: 'granted' | 'denied' | 'unavailable' | 'ios-pwa-not-supported';
  message: string;
  isIosPWA?: boolean;
}

async function getNativePlatform(): Promise<'ios' | 'android' | 'web'> {
  try {
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

export function useGPSPermission() {
  const [status, setStatus] = useState<GPSPermissionStatus>({
    state: 'unavailable',
    message: 'GPS permission not yet requested',
  });

  const requestGPSPermission = useCallback(async (): Promise<GPSPermissionStatus> => {
    const platform = await getNativePlatform();

    if (platform === 'ios' || platform === 'android') {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        const permResult = await Geolocation.requestPermissions();
        const locationPerm = permResult.geolocation;

        if (locationPerm === 'granted') {
          const s: GPSPermissionStatus = { state: 'granted', message: 'GPS permission granted' };
          setStatus(s);
          return s;
        }

        if (locationPerm === 'denied') {
          const s: GPSPermissionStatus = {
            state: 'denied',
            message: 'Location permission denied. Please enable GPS in your device settings.',
          };
          setStatus(s);
          return s;
        }

        try {
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
          });
          const s: GPSPermissionStatus = { state: 'granted', message: 'GPS permission granted' };
          setStatus(s);
          return s;
        } catch {
          const s: GPSPermissionStatus = {
            state: 'denied',
            message: 'Location permission denied. Please enable GPS in your device settings.',
          };
          setStatus(s);
          return s;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'unknown error';
        const s: GPSPermissionStatus = {
          state: 'unavailable',
          message: `Geolocation plugin unavailable: ${msg}`,
        };
        setStatus(s);
        return s;
      }
    }

    if (!navigator.geolocation) {
      const s: GPSPermissionStatus = {
        state: 'unavailable',
        message: 'Geolocation is not supported on this device',
      };
      setStatus(s);
      return s;
    }

    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          const s: GPSPermissionStatus = {
            state: 'denied',
            message: 'Location permission denied. Please enable GPS in your device settings.',
          };
          setStatus(s);
          return s;
        }
        if (result.state === 'granted') {
          const s: GPSPermissionStatus = { state: 'granted', message: 'GPS permission granted' };
          setStatus(s);
          return s;
        }
      } catch {
        // fall through
      }
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          const s: GPSPermissionStatus = { state: 'granted', message: 'GPS permission granted' };
          setStatus(s);
          resolve(s);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            const s: GPSPermissionStatus = {
              state: 'denied',
              message: 'Location permission denied. Please enable GPS in your device settings.',
            };
            setStatus(s);
            resolve(s);
          } else {
            const s: GPSPermissionStatus = {
              state: 'unavailable',
              message: error.message || 'Unable to access GPS',
            };
            setStatus(s);
            resolve(s);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }, []);

  return { status, requestGPSPermission };
}
