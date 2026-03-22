/* eslint-disable @typescript-eslint/no-explicit-any */ // hmr-fix-v3
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile, Caregiver } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import {
  markAsTaken as markAsTakenUtil,
  rescheduleReminder as rescheduleReminderUtil,
  getTodayStats as getTodayStatsUtil,
  generateTodayReminders,
} from "@/lib/reminderUtils";
import { posthog } from "@/lib/posthog";

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
  userId: string | null;
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
  reloadData: () => Promise<void>;
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

  // ── Load all data from DB using Supabase Auth session ────────────────────

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const authUser = session.user;
    let uid = authUser.id;
    setUserId(uid);
    let role: "patient" | "caregiver" = "patient";
    let patientName = "";

    // Check if this user exists in public.users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (userError || !userData) {
      setLoading(false);
      return;
    }

    // Check if the user's phone matches any patient's caregiver_phone
    const userPhone = authUser.phone || userData.phone;
    if (userPhone) {
      const { data: patientData } = await supabase
        .from("users")
        .select("id, name")
        .eq("caregiver_phone", userPhone)
        .neq("id", uid)
        .limit(1)
        .maybeSingle();

      if (patientData) {
        role = "caregiver";
        uid = patientData.id;
        patientName = patientData.name || "Patient";
      }
    }

    setUserId(uid);
    setUserRole(role);
    setViewingPatientName(patientName);

    // Identify user in PostHog
    posthog.identify(authUser.id, {
      name: userData.name,
      phone: userPhone,
      role,
      device: navigator.userAgent.includes("Android") ? "Android" : "Other",
    });
    posthog.capture("app_opened", { source: "direct" });

    const today = new Date().toISOString().split("T")[0];

    // Fetch all data in parallel
    const [medsRes, remindersRes, aptsRes] = await Promise.all([
      supabase.from("medications").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: true }),
      supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", uid).eq("scheduled_date", today).order("scheduled_time", { ascending: true }),
      supabase.from("appointments").select("*").eq("user_id", uid).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true }),
    ]);

    // User
    setUser(dbUserToApp(userData));

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
        const { data: inserted } = await supabase.from("reminders").insert(rows).select("*, medications(name, dosage, color)");
        if (inserted) {
          setReminders(inserted.map((r: any) => {
            const medName = r.medications?.name || medNameMap.get(r.medication_id) || "Unknown";
            return dbReminderToApp(r, medName);
          }));
        }
      }
    } else {
      setReminders(dbReminders);
    }

    // Appointments
    setAppointments((aptsRes.data || []).map(dbAppointmentToApp));

    // Streak from user record
    setStreak(userData.streak || 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── User profile persistence ──────────────────────────────────────────

  const setUserAndPersist: React.Dispatch<React.SetStateAction<UserProfile>> = useCallback(
    (action) => {
      setUser((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        const activeUserId = userId;
        if (activeUserId) {
          const dbData: Record<string, any> = {
            name: next.name,
            age: next.age,
            phone: next.phone,
            updated_at: new Date().toISOString(),
          };
          if (next.caregiver) {
            dbData.caregiver_name = next.caregiver.name;
            dbData.caregiver_phone = next.caregiver.phone;
            dbData.caregiver_email = next.caregiver.email || null;
            dbData.caregiver_relationship = next.caregiver.relationship;
          }
          supabase.from("users").update(dbData).eq("id", activeUserId).then();
        }
        return next;
      });
    },
    [userId]
  );

  // ── Medication CRUD with persistence ──────────────────────────────────

  const addMedication = useCallback(async (med: Medication) => {
    const activeUserId = userId;
    if (!activeUserId) return;

    const { data, error } = await supabase.from("medications").insert({
      id: med.id,
      user_id: activeUserId,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times,
      mandatory_gap_minutes: med.mandatoryGapMinutes,
      is_active: med.isActive,
      color: med.color,
      notes: med.notes,
    }).select().single();

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error.code });
      return;
    }

    posthog.capture("medication_saved", { med_name: med.name, times_count: med.times.length, has_gap: !!med.mandatoryGapMinutes });

    // Reload medications and generate reminders
    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", activeUserId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));

    // Generate today's reminders for the new med
    const today = new Date().toISOString().split("T")[0];
    const reminderRows = med.times.map((t) => ({
      user_id: activeUserId,
      medication_id: data.id,
      scheduled_date: today,
      scheduled_time: t,
      status: "pending",
    }));
    if (reminderRows.length > 0) {
      await supabase.from("reminders").insert(reminderRows);
      const { data: remData } = await supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", activeUserId).eq("scheduled_date", today).order("scheduled_time", { ascending: true });
      if (remData) {
        const medMap = new Map((medsData || []).map((m: any) => [m.id, m.name]));
        setReminders(remData.map((r: any) => dbReminderToApp(r, r.medications?.name || medMap.get(r.medication_id) || "Unknown")));
      }
    }
  }, [userId]);

  const updateMedication = useCallback(async (med: Medication) => {
    if (!userId) return;
    const { error } = await supabase.from("medications").update({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times,
      mandatory_gap_minutes: med.mandatoryGapMinutes,
      is_active: med.isActive,
      color: med.color,
      notes: med.notes,
      updated_at: new Date().toISOString(),
    }).eq("id", med.id).eq("user_id", userId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error.code });
      return;
    }

    posthog.capture("medication_updated", { med_name: med.name });

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));

    await regenerateRemindersFromDB();
  }, [userId]);

  const deleteMedication = useCallback(async (medId: string) => {
    if (!userId) return;
    const med = medications.find((m) => m.id === medId);
    const { error } = await supabase.from("medications").update({ is_active: false }).eq("id", medId).eq("user_id", userId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error.code });
      return;
    }

    posthog.capture("medication_deleted", { med_name: med?.name });

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
  }, [userId, medications]);

  const toggleMedicationActive = useCallback(async (medId: string) => {
    if (!userId) return;
    const med = medications.find((m) => m.id === medId);
    if (!med) return;
    const newActive = !med.isActive;
    await supabase.from("medications").update({ is_active: newActive, updated_at: new Date().toISOString() }).eq("id", medId).eq("user_id", userId);

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));
    await regenerateRemindersFromDB();
  }, [userId, medications]);

  // ── Appointment CRUD ──────────────────────────────────────────────────

  const addAppointment = useCallback(async (apt: Appointment) => {
    if (!userId) return;
    const { error } = await supabase.from("appointments").insert({
      id: apt.id,
      user_id: userId,
      title: apt.title,
      doctor_name: apt.doctorName,
      appointment_datetime: apt.dateTime,
      location: apt.location,
      notes: apt.notes,
      reminder_minutes_before: apt.reminderMinutesBefore,
    });

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "appointments", error_code: error.code });
      return;
    }

    posthog.capture("appointment_saved");

    const { data: aptsData } = await supabase.from("appointments").select("*").eq("user_id", userId).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true });
    if (aptsData) setAppointments(aptsData.map(dbAppointmentToApp));
  }, [userId]);

  const deleteAppointment = useCallback(async (aptId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("appointments").delete().eq("id", aptId).eq("user_id", userId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "appointments", error_code: error.code });
      return;
    }

    const { data: aptsData } = await supabase.from("appointments").select("*").eq("user_id", userId).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true });
    if (aptsData) setAppointments(aptsData.map(dbAppointmentToApp));
  }, [userId]);

  // ── Reminder helpers ──────────────────────────────────────────────────

  const regenerateRemindersFromDB = useCallback(async () => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: remData } = await supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", userId).eq("scheduled_date", today).order("scheduled_time", { ascending: true });
    if (remData) {
      setReminders(remData.map((r: any) => dbReminderToApp(r, r.medications?.name || "Unknown")));
    }
  }, [userId]);

  // ── Mark reminder taken ───────────────────────────────────────────────

  const markReminderAsTaken = useCallback(async (reminderId: string) => {
    const now = new Date().toISOString();
    setReminders((prev) => markAsTakenUtil(reminderId, prev));

    if (userId) {
      const { error } = await supabase.from("reminders").update({ status: "taken", taken_at: now }).eq("id", reminderId).eq("user_id", userId);
      if (error) {
        posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "reminders", error_code: error.code });
      }
      await supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: userId, action: "taken" });
    }
  }, [userId]);

  // ── Skip reminder ─────────────────────────────────────────────────────

  const skipReminder = useCallback(async (reminderId: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, status: "skipped" as const } : r))
    );
    if (userId) {
      const { error } = await supabase.from("reminders").update({ status: "skipped" }).eq("id", reminderId).eq("user_id", userId);
      if (error) {
        posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "reminders", error_code: error.code });
      }
      await supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: userId, action: "skipped" });
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
        userId,
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
        reloadData: loadData,
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
