import React, { createContext, useContext, useState, useCallback } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile } from "@/lib/types";
import { mockMedications, mockAppointments, mockUser, mockReminders } from "@/lib/mockData";
import {
  markAsTaken as markAsTakenUtil,
  rescheduleReminder as rescheduleReminderUtil,
  getTodayStats as getTodayStatsUtil,
  getCurrentStreak,
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
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

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
