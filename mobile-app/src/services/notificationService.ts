import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const NOTIFIED_CACHE_KEY = '@gymora_notified_notification_ids';
const MAX_CACHE_SIZE = 200;

// Configure global notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Maps notification title and link to corresponding mobile app tab & subroute.
 */
export const resolveNotificationRoute = (notif: { title?: string; message?: string; link?: string; type?: string }, role?: string | null): { tab: string; sub?: string } => {
  const t = (notif.title || '').toLowerCase();
  const m = (notif.message || '').toLowerCase();
  const link = (notif.link || '').toLowerCase();

  if (t.includes('message') || m.includes('sent you a message') || link.includes('chat') || link.includes('message')) {
    return { tab: 'more', sub: 'messages' };
  }
  if (t.includes('diet') || link.includes('diet')) {
    return role === 'TRAINER' ? { tab: 'programs', sub: 'diet-plans' } : { tab: 'fitness', sub: 'diet' };
  }
  if (t.includes('exercise') || t.includes('fitness plan') || t.includes('workout') || link.includes('workout')) {
    return role === 'TRAINER' ? { tab: 'programs', sub: 'workout-plans' } : { tab: 'fitness', sub: 'workout' };
  }
  if (t.includes('booking') || t.includes('session') || link.includes('booking')) {
    return role === 'TRAINER' ? { tab: 'schedule', sub: 'none' } : { tab: 'training', sub: 'session_bookings' };
  }
  if (t.includes('order') || t.includes('store') || link.includes('store') || link.includes('order')) {
    return { tab: 'store', sub: 'orders' };
  }
  if (t.includes('membership') || t.includes('subscription') || link.includes('subscription')) {
    return { tab: 'more', sub: 'membership' };
  }

  return { tab: 'more', sub: 'notifications' };
};

/**
 * Initializes notification permissions and default Android notification channel.
 */
export const initNotifications = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Gymora Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EA580C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[NotificationService] Initialization error:', err);
    return false;
  }
};

/**
 * Triggers a native system device push notification banner.
 */
export const triggerDevicePushNotification = async (notif: {
  _id?: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}, role?: string | null): Promise<string | null> => {
  try {
    const route = resolveNotificationRoute(notif, role);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notif.title || 'Gymora Notification',
        body: notif.message || 'You have a new update in Gymora.',
        sound: 'default',
        badge: 1,
        data: {
          notifId: notif._id,
          tab: route.tab,
          sub: route.sub,
          link: notif.link,
        },
      },
      trigger: null, // trigger immediately
    });

    return notificationId;
  } catch (err) {
    console.warn('[NotificationService] Trigger push notification error:', err);
    return null;
  }
};

type UnreadCountListener = (count: number) => void;
const unreadListeners = new Set<UnreadCountListener>();
let cachedUnreadCount = 0;

export const getGlobalUnreadCount = (): number => cachedUnreadCount;

export const setGlobalUnreadCount = (count: number): void => {
  cachedUnreadCount = Math.max(0, count);
  unreadListeners.forEach(listener => {
    try {
      listener(cachedUnreadCount);
    } catch (err) {
      console.warn('[NotificationService] Unread listener error:', err);
    }
  });
};

export const subscribeUnreadCount = (listener: UnreadCountListener): (() => void) => {
  unreadListeners.add(listener);
  listener(cachedUnreadCount);
  return () => {
    unreadListeners.delete(listener);
  };
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  setGlobalUnreadCount(0);
  try {
    await api.put('/notifications/mark-all-read').catch(() => api.patch('/notifications/mark-all-read'));
    return true;
  } catch (err) {
    console.warn('[NotificationService] Failed to mark all notifications read:', err);
    return false;
  }
};

/**
 * Checks for new notifications from backend and fires native push notifications
 * for any items that have not yet been displayed to the user on this device.
 */
export const syncAndPushNewNotifications = async (role?: string | null): Promise<number> => {
  try {
    const res = await api.get('/notifications', { timeout: 15000 }).catch(() => null);
    if (!res?.data) return 0;

    const list: any[] = res.data.notifications || (Array.isArray(res.data) ? res.data : []);
    const unreadCount = typeof res.data.unreadCount === 'number'
      ? res.data.unreadCount
      : list.filter(item => !(item.isRead || item.read)).length;
    setGlobalUnreadCount(unreadCount);

    if (!list || list.length === 0) return 0;

    // Load already notified IDs
    const rawCache = await AsyncStorage.getItem(NOTIFIED_CACHE_KEY);
    let notifiedIds: string[] = rawCache ? JSON.parse(rawCache) : [];

    // Load category preferences
    const prefsRaw = await AsyncStorage.getItem('@gymora_notification_preferences').catch(() => null);
    const prefs = prefsRaw ? JSON.parse(prefsRaw) : null;

    // Filter unread notifications that haven't been pushed to device
    const unreadNew = list.filter(item => {
      const isUnread = item.isRead === false || item.read === false;
      const notYetNotified = item._id && !notifiedIds.includes(String(item._id));
      if (!isUnread || !notYetNotified) return false;

      // Honor user-configured category toggles immediately
      if (prefs) {
        const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
        if (prefs.workouts === false && (text.includes('workout') || text.includes('exercise') || text.includes('fitness plan'))) return false;
        if (prefs.diet === false && (text.includes('diet') || text.includes('nutrition') || text.includes('meal'))) return false;
        if (prefs.bookings === false && (text.includes('booking') || text.includes('session'))) return false;
        if (prefs.messages === false && (text.includes('message') || text.includes('voice note'))) return false;
        if (prefs.store === false && (text.includes('order') || text.includes('store') || text.includes('product'))) return false;
        if (prefs.announcements === false && (text.includes('announcement') || text.includes('renewal') || text.includes('membership'))) return false;
      }

      return true;
    });

    let pushedCount = 0;
    for (const item of unreadNew) {
      await triggerDevicePushNotification(item, role);
      if (item._id) {
        notifiedIds.push(String(item._id));
      }
      pushedCount++;
    }

    // Keep cache bounded
    if (notifiedIds.length > MAX_CACHE_SIZE) {
      notifiedIds = notifiedIds.slice(-MAX_CACHE_SIZE);
    }
    await AsyncStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(notifiedIds));

    return pushedCount;
  } catch (err) {
    console.warn('[NotificationService] Sync error:', err);
    return 0;
  }
};

/**
 * Registers response listener for when user taps on a system notification.
 */
export const registerNotificationResponseListener = (
  onNavigate: (tab: string, sub?: string) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(response => {
    try {
      const data = (response?.notification?.request?.content?.data || {}) as Record<string, any>;
      if (typeof data.tab === 'string') {
        onNavigate(data.tab, typeof data.sub === 'string' ? data.sub : undefined);
      }
    } catch (err) {
      console.warn('[NotificationService] Response handling error:', err);
    }
  });
};
