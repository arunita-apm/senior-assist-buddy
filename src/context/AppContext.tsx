import React, { createContext, useContext, useState, useCallback } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile } from "@/lib/types";
import { mockMedications, mockAppointments, mockUser, mockReminders } from "@/lib/mockData";
import {
  markAsTaken as markAsTakenUtil,
  rescheduleReminder as rescheduleReminderUtil,
  getTodayStats as getTodayStatsUtil,
  getCurrentStreak,
  generateTodayReminders,
} from "@/lib/reminderUtils";

interface AppContextValue extends AppState {
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  markReminderAsTaken: (reminderId: string) => void;
  rescheduleReminder: (reminderId: string, delayMinutes: number) => string[];
  getTodayStats: () => ReturnType<typeof getTodayStatsUtil>;
  getCurrentStreak: () => number;
  addMedication: (med: Medication) => void;
  updateMedication: (med: Medication) => void;
  deleteMedication: (medId: string) => void;
  toggleMedicationActive: (medId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  const regenerateReminders = useCallback((newMeds: Medication[]) => {
    const today = new Date().toISOString().split("T")[0];
    setReminders((prev) => {
      // Keep taken/rescheduled reminders, regenerate pending ones
      const keptReminders = prev.filter(
        (r) => r.date !== today || r.status === "taken" || r.status === "rescheduled"
      );
      const newTodayReminders = generateTodayReminders(newMeds).filter((nr) => {
        // Don't recreate if already taken/rescheduled
        return !keptReminders.some(
          (kr) => kr.medicationId === nr.medicationId && kr.scheduledTime === nr.scheduledTime && kr.date === today
        );
      });
      return [...keptReminders, ...newTodayReminders].sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime)
      );
    });
  }, []);

  const addMedication = useCallback((med: Medication) => {
    setMedications((prev) => {
      const next = [...prev, med];
      regenerateReminders(next);
      return next;
    });
  }, [regenerateReminders]);

  const updateMedication = useCallback((med: Medication) => {
    setMedications((prev) => {
      const next = prev.map((m) => (m.id === med.id ? med : m));
      regenerateReminders(next);
      return next;
    });
  }, [regenerateReminders]);

  const deleteMedication = useCallback((medId: string) => {
    setMedications((prev) => {
      const next = prev.filter((m) => m.id !== medId);
      regenerateReminders(next);
      return next;
    });
    // Also remove all reminders for this med
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
  }, [regenerateReminders]);

  const toggleMedicationActive = useCallback((medId: string) => {
    setMedications((prev) => {
      const next = prev.map((m) => (m.id === medId ? { ...m, isActive: !m.isActive } : m));
      regenerateReminders(next);
      return next;
    });
  }, [regenerateReminders]);

  const markReminderAsTaken = useCallback((reminderId: string) => {
    setReminders((prev) => markAsTakenUtil(reminderId, prev));
  }, []);

  const rescheduleReminderAction = useCallback(
    (reminderId: string, delayMinutes: number): string[] => {
      let conflicts: string[] = [];
      setReminders((prev) => {
        const result = rescheduleReminderUtil(reminderId, delayMinutes, prev, medications);
        conflicts = result.conflicts;
        return result.updatedReminders;
      });
      return conflicts;
    },
    [medications]
  );

  const todayStats = useCallback(() => getTodayStatsUtil(reminders), [reminders]);

  return (
    <AppContext.Provider
      value={{
        user,
        medications,
        reminders,
        appointments,
        setUser,
        setMedications,
        setReminders,
        setAppointments,
        markReminderAsTaken,
        rescheduleReminder: rescheduleReminderAction,
        getTodayStats: todayStats,
        getCurrentStreak,
        addMedication,
        updateMedication,
        deleteMedication,
        toggleMedicationActive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
