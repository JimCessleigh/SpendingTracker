import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Card } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bill-reminders', {
      name: 'Bill Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleCardReminder(card: Card): Promise<void> {
  await cancelCardReminder(card.id);

  const parsedDay = Number((card.dueDate || '').split('-').pop());
  const day = Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 1;
  // Remind the day before; if due on the 1st, remind on the 28th (safe for all months).
  const reminderDay = day > 1 ? day - 1 : 28;

  await Notifications.scheduleNotificationAsync({
    identifier: `card-reminder-${card.id}`,
    content: {
      title: 'Payment Due Tomorrow',
      body: `${card.name} (**** ${card.lastFour}) payment is due tomorrow`,
      data: { cardId: card.id },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      repeats: true,
      day: reminderDay,
      hour: 9,
      minute: 0,
    },
  });
}

export async function cancelCardReminder(cardId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`card-reminder-${cardId}`);
  } catch {
    // Notification may not exist.
  }
}
