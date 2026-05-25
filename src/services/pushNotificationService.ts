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
let tokenPersistRetryTimeout: ReturnType<typeof setTimeout> | null = null;

export function getToken(): string | null {
  return deviceToken;
}

async function persistToken(token: string, platform: string): Promise<void> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        console.warn('[Push] No user session after retries, token not persisted');
        return;
      }

      const { error } = await supabase.from('push_tokens').upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );

      if (error) {
        console.error('[Push] Token persist error:', error.message);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      } else {
        console.log('[Push] Token persisted successfully for platform:', platform);
        return;
      }
    } catch (err) {
      console.error('[Push] Token persist exception:', err);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
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
  } catch (e) {
    console.error('[Push] Failed to import PushNotifications module:', e);
    return;
  }

  // CRITICAL: Add listeners BEFORE calling register() so we catch the token
  await PushNotifications.addListener('registration', (token) => {
    console.log('[Push] Registration success - token received:', token.value.slice(0, 20) + '...');
    deviceToken = token.value;
    // Persist with retry logic (handles race condition where session isn't ready yet)
    if (tokenPersistRetryTimeout) clearTimeout(tokenPersistRetryTimeout);
    tokenPersistRetryTimeout = setTimeout(() => {
      persistToken(token.value, platform);
    }, 500);
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] REGISTRATION ERROR - APNs/FCM rejected registration:', JSON.stringify(error));
    // Log to Supabase for remote debugging
    logRegistrationError(error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Notification received in foreground:', notification.title);
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
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Notification tapped:', action.notification.title);
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
  });

  listenersAdded = true;
  console.log('[Push] All listeners added successfully');
}

async function logRegistrationError(error: any): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: `ERROR:${JSON.stringify(error).slice(0, 200)}`,
        platform: 'error_log',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
  } catch {
    // Best effort logging
  }
}

/**
 * Silently re-registers push notifications without prompting for permission.
 * Used after login when permission was already granted in a previous session.
 * On iOS this calls register() which triggers APNs token generation.
 */
export async function silentReRegister(): Promise<void> {
  try {
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      const coreMod = await import('@capacitor/core');
      Capacitor = coreMod.Capacitor;
    } catch {
      return;
    }

    if (!Capacitor.isNativePlatform()) return;

    let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;
    try {
      const mod = await import('@capacitor/push-notifications');
      PushNotifications = mod.PushNotifications;
    } catch {
      return;
    }

    const permStatus = await PushNotifications.checkPermissions();
    console.log('[Push] Silent re-register - current permission:', permStatus.receive);

    if (permStatus.receive !== 'granted') return;

    const platform = Capacitor.getPlatform();
    console.log('[Push] Silent re-register on platform:', platform);

    // Add listeners first so we catch the token when register() fires
    await addListeners(platform);

    // This is the critical call for iOS: it triggers registerForRemoteNotifications
    // which asks APNs for a device token
    await PushNotifications.register();
    console.log('[Push] register() called - waiting for APNs/FCM token...');
  } catch (err) {
    console.error('[Push] Silent re-register failed:', err);
  }
}

/**
 * Requests push notification permission and registers with APNs/FCM.
 * Called on first login to prompt the user.
 */
export async function initPushNotifications(): Promise<PushPermissionStatus> {
  if (initializationInProgress) return 'unavailable';
  initializationInProgress = true;

  try {
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
    console.log('[Push] Initializing on platform:', platform);

    // Step 1: Add listeners BEFORE requesting permissions or registering
    // This ensures we don't miss the token callback
    await addListeners(platform);

    // Step 2: Request permission (shows the iOS/Android dialog)
    let permResult: { receive: string };
    try {
      permResult = await PushNotifications.requestPermissions();
      console.log('[Push] Permission result:', permResult.receive);
    } catch (err) {
      console.error('[Push] requestPermissions failed:', err);
      initializationInProgress = false;
      return 'unavailable';
    }

    const status = permResult.receive;

    if (status === 'granted') {
      // Step 3: Register with APNs (iOS) / FCM (Android)
      // This is what actually generates the device token
      try {
        await PushNotifications.register();
        console.log('[Push] register() called successfully - token will arrive via registration listener');
      } catch (err) {
        console.error('[Push] register() FAILED:', err);
      }
      initializationInProgress = false;
      return 'granted';
    }

    if (status === 'denied') {
      console.warn('[Push] Permission denied by user');
      initializationInProgress = false;
      return 'denied';
    }

    initializationInProgress = false;
    return 'prompt';
  } catch (err) {
    console.error('[Push] Initialization failed:', err);
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
    console.error('[Push] Failed to delete token:', err);
  }
}
