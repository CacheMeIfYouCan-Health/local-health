import { Platform } from 'react-native';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch {
  Notifications = null;
}

export async function requestPermission() {
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// schedules one daily notification per time string "HH:MM"
export async function scheduleReminder(reminder) {
  if (!Notifications) return [];
  const ids = [];
  for (const time of reminder.times) {
    const [hour, minute] = time.split(':').map(Number);
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.medName,
          body: reminder.dosage || 'Time to take your medication',
          sound: 'default',
          data: { reminderId: reminder.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        },
      });
      ids.push(id);
    } catch {
      // silently skip in Expo Go
    }
  }
  return ids;
}

export async function cancelReminder(notificationIds = []) {
  if (!Notifications) return;
  for (const id of notificationIds) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}