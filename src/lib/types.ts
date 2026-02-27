export interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  frequency: 'once' | 'twice' | 'thrice' | 'custom';
  timesPerDay: number;
  mandatoryGapMinutes: number | null;
  startDate: string;
  isActive: boolean;
  color: string;
  notes: string;
}

export interface Reminder {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  date: string;
  status: 'pending' | 'taken' | 'skipped' | 'rescheduled';
  rescheduledTo: string | null;
  rescheduledFromOriginal: boolean;
  takenAt: string | null;
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface Appointment {
  id: string;
  title: string;
  doctorName: string;
  dateTime: string;
  location: string;
  notes: string;
  reminderMinutesBefore: number;
}

export interface UserProfile {
  name: string;
  age: number;
  phone: string;
  role: 'senior' | 'caregiver';
  caregiver: Caregiver | null;
}

export interface AppState {
  user: UserProfile;
  medications: Medication[];
  reminders: Reminder[];
  appointments: Appointment[];
}
