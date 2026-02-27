import React, { createContext, useContext, useState } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile } from "@/lib/types";
import { mockMedications, mockAppointments, mockUser, mockReminders } from "@/lib/mockData";

interface AppContextValue extends AppState {
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  return (
    <AppContext.Provider
      value={{ user, medications, reminders, appointments, setUser, setMedications, setReminders, setAppointments }}
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
