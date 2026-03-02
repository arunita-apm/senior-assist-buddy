import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile, Caregiver } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import {
  markAsTaken as markAsTakenUtil,
  rescheduleReminder as rescheduleReminderUtil,
  getTodayStats as getTodayStatsUtil,
  generateTodayReminders,
} from "@/lib/reminderUtils";

// ── DB ↔ App type mappers ──────────────────────────────────────────────────

function dbMedToApp(row: any): Medication {
  const freq = row.frequency || "once";
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage || "",
    times: row.times || [],
    frequency: freq as Medication["frequency"],
    timesPerDay: (row.times || []).length || 1,
    mandatoryGapMinutes: row.mandatory_gap_minutes ?? null,
    startDate: row.created_at ? row.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    isActive: row.is_active ?? true,
    color: row.color || "#28BF9C",
    notes: row.notes || "",
  };
}

function dbReminderToApp(row: any, medName: string): Reminder {
  return {
    id: row.id,
    medicationId: row.medication_id,
    medicationName: medName,
    scheduledTime: row.scheduled_time?.slice(0, 5) || "00:00",
    date: row.scheduled_date,
    status: (row.status || "pending") as Reminder["status"],
    rescheduledTo: row.rescheduled_to?.slice(0, 5) || null,
    rescheduledFromOriginal: (row.retry_count || 0) > 0,
    takenAt: row.taken_at || null,
  };
}

function dbAppointmentToApp(row: any): Appointment {
  return {
    id: row.id,
    title: row.title,
    doctorName: row.doctor_name || "",
    dateTime: row.appointment_datetime,
    location: row.location || "",
    notes: row.notes || "",
    reminderMinutesBefore: row.reminder_minutes_before || 60,
  };
}

function dbUserToApp(row: any): UserProfile {
  const caregiver: Caregiver | null = row.caregiver_name
    ? {
        id: `cg-${row.id}`,
        name: row.caregiver_name,
        phone: row.caregiver_phone || "",
        relationship: row.caregiver_relationship || "",
        email: row.caregiver_email || undefined,
      }
    : null;
  return {
    name: row.name || "User",
    age: row.age || 0,
    phone: row.phone || "",
    role: "senior",
    caregiver,
  };
}

const defaultUser: UserProfile = { name: "User", age: 0, phone: "", role: "senior", caregiver: null };

// ── Context interface ──────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  loading: boolean;
  userRole: "patient" | "caregiver";
  viewingPatientName: string;
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  markReminderAsTaken: (reminderId: string) => void;
  skipReminder: (reminderId: string) => void;
  rescheduleReminder: (reminderId: string, delayMinutes: number) => string[];
  getTodayStats: () => ReturnType<typeof getTodayStatsUtil>;
  getCurrentStreak: () => number;
  addMedication: (med: Medication) => void;
  updateMedication: (med: Medication) => void;
  deleteMedication: (medId: string) => void;
  toggleMedicationActive: (medId: string) => void;
  addAppointment: (apt: Appointment) => void;
  deleteAppointment: (aptId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [userRole, setUserRole] = useState<"patient" | "caregiver">("patient");
  const [viewingPatientName, setViewingPatientName] = useState("");

  // ── Load all data from Supabase on auth ────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) {
        setLoading(false);
        return;
      }

      let uid = session.user.id;
      let role: "patient" | "caregiver" = "patient";
      let patientName = "";

      // Auto-create user profile if not exists
      await supabase.from("users").upsert({
        id: uid,
        name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
        role: "patient",
      }, { onConflict: "id", ignoreDuplicates: true });

      // Check if this user is a caregiver for someone
      const userEmail = session.user.email;
      if (userEmail) {
        const { data: patientData } = await supabase
          .from("users")
          .select("id, name")
          .eq("caregiver_email", userEmail)
          .neq("id", uid)
          .limit(1)
          .maybeSingle();

        if (patientData) {
          role = "caregiver";
          uid = patientData.id;
          patientName = patientData.name || "Patient";
        }
      }

      if (cancelled) return;
      setUserId(uid);
      setUserRole(role);
      setViewingPatientName(patientName);

      const today = new Date().toISOString().split("T")[0];

      // Fetch all data in parallel
      const [userRes, medsRes, remindersRes, aptsRes, adherenceRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", uid).maybeSingle(),
        supabase.from("medications").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: true }),
        supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", uid).eq("scheduled_date", today).order("scheduled_time", { ascending: true }),
        supabase.from("appointments").select("*").eq("user_id", uid).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true }),
        role === "patient" ? supabase.rpc("get_weekly_adherence", { p_user_id: uid }) : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      // User
      if (userRes.data) setUser(dbUserToApp(userRes.data));

      // Medications
      const meds = (medsRes.data || []).map(dbMedToApp);
      setMedications(meds);

      // Build med name lookup
      const medNameMap = new Map(meds.map((m) => [m.id, m.name]));

      // Reminders from DB
      const dbReminders = (remindersRes.data || []).map((r: any) => {
        const medName = r.medications?.name || medNameMap.get(r.medication_id) || "Unknown";
        return dbReminderToApp(r, medName);
      });

      // If no DB reminders for today and patient role, generate from active meds
      if (dbReminders.length === 0 && meds.length > 0 && role === "patient") {
        const generated = generateTodayReminders(meds);
        const rows = generated.map((g) => ({
          user_id: uid,
          medication_id: g.medicationId,
          scheduled_date: g.date,
          scheduled_time: g.scheduledTime,
          status: "pending",
        }));
        if (rows.length > 0) {
          const { data: inserted } = await supabase.from("reminders").insert(rows).select();
          if (inserted) {
            setReminders(inserted.map((r: any) => dbReminderToApp(r, medNameMap.get(r.medication_id) || "Unknown")));
          }
        }
      } else {
        setReminders(dbReminders);
      }

      // Appointments
      setAppointments((aptsRes.data || []).map(dbAppointmentToApp));

      // Streak
      if (adherenceRes.data && (adherenceRes.data as any[]).length > 0) {
        setStreak((adherenceRes.data as any[])[0]?.current_streak || 0);
      }

      setLoading(false);
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadData();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── User profile persistence ──────────────────────────────────────────

  const setUserAndPersist: React.Dispatch<React.SetStateAction<UserProfile>> = useCallback(
    (action) => {
      setUser((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        if (userId) {
          const dbData: Record<string, any> = {
            name: next.name,
            age: next.age,
            phone: next.phone,
            caregiver_name: next.caregiver?.name || null,
            caregiver_phone: next.caregiver?.phone || null,
            caregiver_email: next.caregiver?.email || null,
            caregiver_relationship: next.caregiver?.relationship || null,
            updated_at: new Date().toISOString(),
          };
          supabase.from("users").update(dbData).eq("id", userId).then();
        }
        return next;
      });
    },
    [userId]
  );

  // ── Medication CRUD with persistence ──────────────────────────────────

  const addMedication = useCallback((med: Medication) => {
    setMedications((prev) => [...prev, med]);
    if (userId) {
      supabase.from("medications").insert({
        id: med.id,
        user_id: userId,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times: med.times,
        mandatory_gap_minutes: med.mandatoryGapMinutes,
        is_active: med.isActive,
        color: med.color,
        notes: med.notes,
      }).then();
    }
    regenerateReminders([...medications, med]);
  }, [userId, medications]);

  const updateMedication = useCallback((med: Medication) => {
    setMedications((prev) => prev.map((m) => (m.id === med.id ? med : m)));
    if (userId) {
      supabase.from("medications").update({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times: med.times,
        mandatory_gap_minutes: med.mandatoryGapMinutes,
        is_active: med.isActive,
        color: med.color,
        notes: med.notes,
        updated_at: new Date().toISOString(),
      }).eq("id", med.id).eq("user_id", userId).then();
    }
    regenerateReminders(medications.map((m) => (m.id === med.id ? med : m)));
  }, [userId, medications]);

  const deleteMedication = useCallback((medId: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== medId));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
    if (userId) {
      supabase.from("medications").delete().eq("id", medId).eq("user_id", userId).then();
    }
  }, [userId]);

  const toggleMedicationActive = useCallback((medId: string) => {
    setMedications((prev) => {
      const next = prev.map((m) => (m.id === medId ? { ...m, isActive: !m.isActive } : m));
      const toggled = next.find((m) => m.id === medId);
      if (userId && toggled) {
        supabase.from("medications").update({ is_active: toggled.isActive, updated_at: new Date().toISOString() }).eq("id", medId).eq("user_id", userId).then();
      }
      regenerateReminders(next);
      return next;
    });
  }, [userId]);

  // ── Appointment CRUD ──────────────────────────────────────────────────

  const addAppointment = useCallback((apt: Appointment) => {
    setAppointments((prev) => [...prev, apt].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    if (userId) {
      supabase.from("appointments").insert({
        id: apt.id,
        user_id: userId,
        title: apt.title,
        doctor_name: apt.doctorName,
        appointment_datetime: apt.dateTime,
        location: apt.location,
        notes: apt.notes,
        reminder_minutes_before: apt.reminderMinutesBefore,
      }).then();
    }
  }, [userId]);

  const deleteAppointment = useCallback((aptId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== aptId));
    if (userId) {
      supabase.from("appointments").delete().eq("id", aptId).eq("user_id", userId).then();
    }
  }, [userId]);

  // ── Reminder regeneration ─────────────────────────────────────────────

  const regenerateReminders = useCallback((newMeds: Medication[]) => {
    const today = new Date().toISOString().split("T")[0];
    setReminders((prev) => {
      const keptReminders = prev.filter(
        (r) => r.date !== today || r.status === "taken" || r.status === "rescheduled"
      );
      const newTodayReminders = generateTodayReminders(newMeds).filter((nr) => {
        return !keptReminders.some(
          (kr) => kr.medicationId === nr.medicationId && kr.scheduledTime === nr.scheduledTime && kr.date === today
        );
      });

      if (userId && newTodayReminders.length > 0) {
        const rows = newTodayReminders.map((g) => ({
          user_id: userId,
          medication_id: g.medicationId,
          scheduled_date: g.date,
          scheduled_time: g.scheduledTime,
          status: "pending",
        }));
        supabase.from("reminders").insert(rows).then();
      }

      return [...keptReminders, ...newTodayReminders].sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime)
      );
    });
  }, [userId]);

  // ── Mark reminder taken ───────────────────────────────────────────────

  const markReminderAsTaken = useCallback((reminderId: string) => {
    const now = new Date().toISOString();
    setReminders((prev) => markAsTakenUtil(reminderId, prev));
    if (userId) {
      supabase.from("reminders").update({ status: "taken", taken_at: now }).eq("id", reminderId).eq("user_id", userId).then();
      supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: userId, action: "taken" }).then();
    }
  }, [userId]);

  // ── Skip reminder ─────────────────────────────────────────────────────

  const skipReminder = useCallback((reminderId: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, status: "skipped" as const } : r))
    );
    if (userId) {
      supabase.from("reminders").update({ status: "skipped" }).eq("id", reminderId).eq("user_id", userId).then();
      supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: userId, action: "skipped" }).then();
    }
  }, [userId]);

  // ── Reschedule reminder ───────────────────────────────────────────────

  const rescheduleReminderAction = useCallback(
    (reminderId: string, delayMinutes: number): string[] => {
      let conflicts: string[] = [];
      setReminders((prev) => {
        const result = rescheduleReminderUtil(reminderId, delayMinutes, prev, medications);
        conflicts = result.conflicts;

        if (userId) {
          const original = prev.find((r) => r.id === reminderId);
          if (original) {
            const newReminder = result.updatedReminders.find(
              (r) => r.id.includes("rescheduled") && r.medicationId === original.medicationId && r.status === "pending"
            );
            supabase.from("reminders").update({
              status: "rescheduled",
              rescheduled_to: newReminder?.scheduledTime || null,
            }).eq("id", reminderId).eq("user_id", userId).then();

            if (newReminder) {
              supabase.from("reminders").insert({
                user_id: userId,
                medication_id: original.medicationId,
                scheduled_date: original.date,
                scheduled_time: newReminder.scheduledTime,
                status: "pending",
                retry_count: 1,
              }).then();
            }

            supabase.from("reminder_logs").insert({
              reminder_id: reminderId,
              user_id: userId,
              action: "rescheduled",
              notes: `Delayed by ${delayMinutes} minutes`,
            }).then();
          }
        }

        return result.updatedReminders;
      });
      return conflicts;
    },
    [medications, userId]
  );

  // ── Stats ─────────────────────────────────────────────────────────────

  const todayStats = useCallback(() => getTodayStatsUtil(reminders), [reminders]);
  const getStreak = useCallback(() => streak, [streak]);

  return (
    <AppContext.Provider
      value={{
        user,
        medications,
        reminders,
        appointments,
        loading,
        userRole,
        viewingPatientName,
        setUser: setUserAndPersist,
        setMedications,
        setReminders,
        setAppointments,
        markReminderAsTaken,
        skipReminder,
        rescheduleReminder: rescheduleReminderAction,
        getTodayStats: todayStats,
        getCurrentStreak: getStreak,
        addMedication,
        updateMedication,
        deleteMedication,
        toggleMedicationActive,
        addAppointment,
        deleteAppointment,
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
