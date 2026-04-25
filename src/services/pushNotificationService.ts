import { capacitorReady } from '../main';
import { supabase } from '../lib/supabase';

export type PushPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PushNotificationPayload {
  id: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationAction {
  actionId: string;
  inputValue?: string;
  notification: PushNotificationPayload;
}

let deviceToken: string | null = null;
let listenersAdded = false;
let initializationInProgress = false;

export function getToken(): string | null {
  return deviceToken;
}

async function persistToken(token: string, platform: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
  } catch (err) {
    console.error('[PushNotifications] Failed to persist token:', err);
  }
}

export function handleNotificationRouting(notification: PushNotificationPayload): void {
  try {
    const data = notification.data ?? {};
    const page = data['page'] as string | undefined;
    if (page) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
    }
  } catch {
    // Silently ignore routing errors
  }
}

async function addListeners(platform: string): Promise<void> {
  if (listenersAdded) return;

  let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;
  try {
    const mod = await import('@capacitor/push-notifications');
    PushNotifications = mod.PushNotifications;
  } catch {
    return;
  }

  try {
    await PushNotifications.addListener('registration', async (token) => {
      try {
        deviceToken = token.value;
        await persistToken(token.value, platform);
      } catch {
        // Silently ignore token persistence errors
      }
    });
  } catch {
    // Listener registration failed - not fatal
  }

  try {
    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[PushNotifications] Registration error:', error.error);
    });
  } catch {
    // Listener registration failed - not fatal
  }

  try {
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      try {
        window.dispatchEvent(
          new CustomEvent('push-notification-received', {
            detail: {
              id: notification.id,
              title: notification.title,
              body: notification.body,
              data: notification.data,
            } satisfies PushNotificationPayload,
          })
        );
      } catch {
        // Silently ignore dispatch errors
      }
    });
  } catch {
    // Listener registration failed - not fatal
  }

  try {
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      try {
        const payload: PushNotificationPayload = {
          id: action.notification.id,
          title: action.notification.title,
          body: action.notification.body,
          data: action.notification.data,
        };
        handleNotificationRouting(payload);
        window.dispatchEvent(
          new CustomEvent('push-notification-action', {
            detail: {
              actionId: action.actionId,
              inputValue: action.inputValue,
              notification: payload,
            } satisfies PushNotificationAction,
          })
        );
      } catch {
        // Silently ignore dispatch errors
      }
    });
  } catch {
    // Listener registration failed - not fatal
  }

  listenersAdded = true;
}

/**
 * Must ONLY be called from an explicit user interaction (e.g. toggling a setting).
 * Never call this automatically on app startup or login.
 */
export async function initPushNotifications(): Promise<PushPermissionStatus> {
  if (initializationInProgress) return 'unavailable';
  initializationInProgress = true;

  try {
    const isNative = await capacitorReady;
    if (!isNative) {
      initializationInProgress = false;
      return 'unavailable';
    }

    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      const coreMod = await import('@capacitor/core');
      Capacitor = coreMod.Capacitor;
    } catch {
      initializationInProgress = false;
      return 'unavailable';
    }

    if (!Capacitor.isNativePlatform()) {
      initializationInProgress = false;
      return 'unavailable';
    }

    let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;
    try {
      const mod = await import('@capacitor/push-notifications');
      PushNotifications = mod.PushNotifications;
    } catch {
      initializationInProgress = false;
      return 'unavailable';
    }

    const platform = Capacitor.getPlatform();

    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    let permResult: { receive: string };
    try {
      permResult = await PushNotifications.requestPermissions();
    } catch (err) {
      console.warn('[PushNotifications] requestPermissions failed:', err);
      initializationInProgress = false;
      return 'unavailable';
    }

    const status = permResult.receive;

    if (status === 'granted') {
      try {
        await addListeners(platform);
      } catch {
        // Listeners failed but we can still try to register
      }
      try {
        await PushNotifications.register();
      } catch (err) {
        console.warn('[PushNotifications] register() failed:', err);
      }
      initializationInProgress = false;
      return 'granted';
    }

    if (status === 'denied') {
      initializationInProgress = false;
      return 'denied';
    }

    initializationInProgress = false;
    return 'prompt';
  } catch (err) {
    console.warn('[PushNotifications] Initialization failed:', err);
    initializationInProgress = false;
    return 'unavailable';
  }
}

export async function removePushListeners(): Promise<void> {
  try {
    const coreMod = await import('@capacitor/core');
    if (!coreMod.Capacitor.isNativePlatform()) return;

    const mod = await import('@capacitor/push-notifications');
    await mod.PushNotifications.removeAllListeners();
    listenersAdded = false;
    deviceToken = null;
    initializationInProgress = false;
  } catch {
    listenersAdded = false;
    deviceToken = null;
    initializationInProgress = false;
  }
}

export async function deletePushToken(): Promise<void> {
  try {
    if (!deviceToken) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', deviceToken);

    deviceToken = null;
  } catch (err) {
    console.error('[PushNotifications] Failed to delete token:', err);
  }
}
