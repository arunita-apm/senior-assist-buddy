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

export function markAsTaken(reminderId: string, reminders: Reminder[]): Reminder[] {
  return reminders.map((r) =>
    r.id === reminderId
      ? { ...r, status: "taken" as const, takenAt: new Date().toISOString() }
      : r
  );
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeDiffMinutes(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.abs((ah * 60 + am) - (bh * 60 + bm));
}

export function rescheduleReminder(
  reminderId: string,
  delayMinutes: number,
  reminders: Reminder[],
  medications: Medication[]
): { updatedReminders: Reminder[]; conflicts: string[] } {
  const original = reminders.find((r) => r.id === reminderId);
  if (!original) return { updatedReminders: reminders, conflicts: [] };

  const newTime = addMinutesToTime(original.scheduledTime, delayMinutes);

  const newReminder: Reminder = {
    id: `${original.id}-rescheduled-${newTime}`,
    medicationId: original.medicationId,
    medicationName: original.medicationName,
    scheduledTime: newTime,
    date: original.date,
    status: "pending",
    rescheduledTo: null,
    rescheduledFromOriginal: true,
    takenAt: null,
  };

  const updatedReminders = reminders
    .map((r) =>
      r.id === reminderId
        ? { ...r, status: "rescheduled" as const, rescheduledTo: newTime }
        : r
    )
    .concat(newReminder)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const conflicts: string[] = [];
  const med = medications.find((m) => m.id === original.medicationId);
  if (med?.mandatoryGapMinutes) {
    const gap = med.mandatoryGapMinutes;
    const sameMedReminders = updatedReminders.filter(
      (r) =>
        r.medicationId === original.medicationId &&
        r.id !== newReminder.id &&
        r.status !== "rescheduled" &&
        r.status !== "skipped"
    );
    for (const other of sameMedReminders) {
      const diff = timeDiffMinutes(newTime, other.scheduledTime);
      if (diff > 0 && diff < gap) {
        conflicts.push(
          `${med.name} at ${other.scheduledTime} is only ${diff} minutes away (mandatory gap: ${gap} min)`
        );
      }
    }
  }

  return { updatedReminders, conflicts };
}

export function getTodayStats(reminders: Reminder[]): {
  totalScheduled: number;
  taken: number;
  missed: number;
  pending: number;
  adherencePercent: number;
} {
  const today = new Date().toISOString().split("T")[0];
  const todayReminders = reminders.filter(
    (r) => r.date === today && !r.rescheduledFromOriginal || (r.date === today && r.rescheduledFromOriginal && r.status !== "pending")
  );

  // Count non-rescheduled originals + rescheduled copies that resolved
  const relevant = reminders.filter(
    (r) => r.date === today && r.status !== "rescheduled"
  );

  const taken = relevant.filter((r) => r.status === "taken").length;
  const pending = relevant.filter((r) => r.status === "pending").length;
  const missed = relevant.filter((r) => r.status === "skipped").length;
  const totalScheduled = relevant.length;

  const adherencePercent =
    totalScheduled > 0 ? Math.round((taken / totalScheduled) * 100) : 0;

  return { totalScheduled, taken, missed, pending, adherencePercent };
}

export function getCurrentStreak(): number {
  // Simulated: return mock streak of 3 consecutive days
  return 3;
}
