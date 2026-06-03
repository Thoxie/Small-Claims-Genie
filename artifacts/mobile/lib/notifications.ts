import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function parseHearingDateTime(
  hearingDateStr: string,
  hearingTime: string | null | undefined,
): Date {
  if (hearingTime) {
    const match = hearingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();
      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
      const d = new Date(`${hearingDateStr}T00:00:00`);
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }
  return new Date(`${hearingDateStr}T08:00:00`);
}

export async function scheduleHearingReminders(
  caseId: number,
  caseTitle: string,
  courthouseName: string | null | undefined,
  hearingDateStr: string,
  hearingTime?: string | null,
  courthouseAddress?: string | null,
  courthouseCity?: string | null,
): Promise<void> {
  if (Platform.OS === "web") return;

  const hearingDate = parseHearingDateTime(hearingDateStr, hearingTime);
  const now = new Date();

  const location = courthouseName ?? "your courthouse";
  const body = `Hearing at ${location}`;

  const minus24h = new Date(hearingDate.getTime() - 24 * 60 * 60 * 1000);
  const minus2h = new Date(hearingDate.getTime() - 2 * 60 * 60 * 1000);

  // 8 AM on the day of the hearing
  const morningOf = new Date(`${hearingDateStr}T08:00:00`);

  // Build a rich morning reminder body with address and time
  const morningBodyParts: string[] = [];
  if (hearingTime) morningBodyParts.push(`Time: ${hearingTime}`);
  if (courthouseAddress) {
    const addressLine = courthouseCity
      ? `${courthouseAddress}, ${courthouseCity}`
      : courthouseAddress;
    morningBodyParts.push(`Address: ${addressLine}`);
  } else if (location !== "your courthouse") {
    morningBodyParts.push(`Location: ${location}`);
  }
  const morningBody =
    morningBodyParts.length > 0
      ? morningBodyParts.join(" · ")
      : `Hearing at ${location}`;

  await cancelHearingReminders(caseId);

  if (minus24h > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `hearing-24h-${caseId}`,
      content: {
        title: `Hearing Tomorrow — ${caseTitle}`,
        body,
        data: { caseId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: minus24h,
      },
    });
  }

  if (minus2h > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `hearing-2h-${caseId}`,
      content: {
        title: `Hearing in 2 Hours — ${caseTitle}`,
        body,
        data: { caseId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: minus2h,
      },
    });
  }

  if (morningOf > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `hearing-morning-${caseId}`,
      content: {
        title: `Hearing Today — ${caseTitle}`,
        body: morningBody,
        data: { caseId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: morningOf,
      },
    });
  }
}

export async function cancelHearingReminders(caseId: number): Promise<void> {
  if (Platform.OS === "web") return;
  await Promise.allSettled([
    Notifications.cancelScheduledNotificationAsync(`hearing-24h-${caseId}`),
    Notifications.cancelScheduledNotificationAsync(`hearing-2h-${caseId}`),
    Notifications.cancelScheduledNotificationAsync(
      `hearing-morning-${caseId}`,
    ),
  ]);
}
