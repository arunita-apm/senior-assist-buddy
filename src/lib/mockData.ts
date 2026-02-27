import { Medication, Appointment, UserProfile } from "./types";
import { generateTodayReminders } from "./reminderUtils";

export const mockMedications: Medication[] = [
  {
    id: "med-1",
    name: "Amlodipine",
    dosage: "5mg",
    times: ["08:00"],
    frequency: "once",
    timesPerDay: 1,
    mandatoryGapMinutes: null,
    startDate: "2025-01-15",
    isActive: true,
    color: "#3B82F6",
    notes: "Take on an empty stomach",
  },
  {
    id: "med-2",
    name: "Metformin",
    dosage: "500mg",
    times: ["08:00", "20:00"],
    frequency: "twice",
    timesPerDay: 2,
    mandatoryGapMinutes: 30,
    startDate: "2024-11-01",
    isActive: true,
    color: "#10B981",
    notes: "Take with food",
  },
  {
    id: "med-3",
    name: "Atorvastatin",
    dosage: "10mg",
    times: ["21:00"],
    frequency: "once",
    timesPerDay: 1,
    mandatoryGapMinutes: null,
    startDate: "2025-02-01",
    isActive: true,
    color: "#F59E0B",
    notes: "Take before bedtime",
  },
];

const today = new Date();
const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(today.getDate() + 2);
const inFourDays = new Date(today);
inFourDays.setDate(today.getDate() + 4);

export const mockAppointments: Appointment[] = [
  {
    id: "apt-1",
    title: "Cardiology Follow-up",
    doctorName: "Dr. Anita Sharma",
    dateTime: dayAfterTomorrow.toISOString(),
    location: "Apollo Hospital, Sector 21",
    notes: "Bring previous ECG reports",
    reminderMinutesBefore: 1440,
  },
  {
    id: "apt-2",
    title: "Diabetes Review",
    doctorName: "Dr. Vikram Patel",
    dateTime: inFourDays.toISOString(),
    location: "City Clinic, MG Road",
    notes: "Fasting blood sugar test required",
    reminderMinutesBefore: 60,
  },
];

export const mockUser: UserProfile = {
  name: "Rajesh Kumar",
  age: 71,
  phone: "9123456789",
  role: "senior",
  caregiver: {
    id: "cg-1",
    name: "Priya Kumar",
    phone: "9876543210",
    relationship: "daughter",
  },
};

export const mockReminders = generateTodayReminders(mockMedications);
