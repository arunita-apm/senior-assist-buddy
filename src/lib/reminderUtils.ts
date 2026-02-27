import { Medication, Reminder } from "./types";

export function generateTodayReminders(medications: Medication[]): Reminder[] {
  const today = new Date().toISOString().split("T")[0];
  const reminders: Reminder[] = [];

  for (const med of medications) {
    if (!med.isActive) continue;

    for (const time of med.times) {
      reminders.push({
        id: `${med.id}-${time}-${today}`,
        medicationId: med.id,
        medicationName: med.name,
        scheduledTime: time,
        date: today,
        status: "pending",
        rescheduledTo: null,
        rescheduledFromOriginal: false,
        takenAt: null,
      });
    }
  }

  return reminders.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}
