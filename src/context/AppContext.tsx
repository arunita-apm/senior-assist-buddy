/* eslint-disable @typescript-eslint/no-explicit-any */ // hmr-fix-v3
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AppState, Medication, Reminder, Appointment, UserProfile, Caregiver } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { firebaseAuth } from "@/lib/firebase";
import {
  markAsTaken as markAsTakenUtil,
  rescheduleReminder as rescheduleReminderUtil,
  getTodayStats as getTodayStatsUtil,
  generateTodayReminders,
} from "@/lib/reminderUtils";
import { posthog } from "@/lib/posthog";

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
    phone: row.phone || row.phone_number || "",
    role: "senior",
    caregiver,
  };
}

const defaultUser: UserProfile = { name: "User", age: 0, phone: "", role: "senior", caregiver: null };

interface CaregiverPatientLink {
  patient_id: string;
  patient_name: string | null;
}

interface AppContextValue extends AppState {
  loading: boolean;
  userId: string | null;
  userRole: "patient" | "caregiver";
  viewingPatientName: string;
  caregiverPatients: CaregiverPatientLink[];
  selectPatient: (patientId: string) => Promise<void>;
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  markReminderAsTaken: (reminderId: string) => void;
  skipReminder: (reminderId: string) => void;
  rescheduleReminder: (reminderId: string, delayMinutes: number) => string[];
  getTodayStats: () => ReturnType<typeof getTodayStatsUtil>;
  getCurrentStreak: () => number;
  addMedication: (med: Medication) => Promise<boolean>;
  updateMedication: (med: Medication) => Promise<boolean>;
  deleteMedication: (medId: string) => Promise<boolean>;
  toggleMedicationActive: (medId: string) => Promise<boolean>;
  addAppointment: (apt: Appointment) => Promise<boolean>;
  deleteAppointment: (aptId: string) => Promise<boolean>;
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
  const [caregiverPatients, setCaregiverPatients] = useState<CaregiverPatientLink[]>([]);

  const resetState = useCallback(() => {
    setUser(defaultUser);
    setMedications([]);
    setReminders([]);
    setAppointments([]);
    setUserId(null);
    setStreak(0);
    setUserRole("patient");
    setViewingPatientName("");
    setCaregiverPatients([]);
  }, []);

  const getActiveUserId = useCallback(async () => {
    if (userId) return userId;

    const storedUserId = localStorage.getItem("supabaseUserId");
    if (storedUserId) return storedUserId;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id ?? null;
  }, [userId]);

  const loadData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      if (!firebaseAuth.currentUser) {
        resetState();
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const supabaseUid = session.user.id;
      const firebaseUid = localStorage.getItem("firebaseUid") || session.user.user_metadata?.firebase_uid || null;
      const firebasePhone = localStorage.getItem("firebasePhone") || session.user.user_metadata?.phone || "";
      let role: "patient" | "caregiver" = "patient";
      let patientName = "";

      const cleanPhone = firebasePhone.replace(/^\+91/, "");
      const fullPhone = firebasePhone;

      let userData: any = null;
      const { data: uidMatch, error: uidError } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUid)
        .maybeSingle();

      if (uidError) {
        console.error("Failed to load user record:", uidError);
        return;
      }

      if (uidMatch) {
        userData = uidMatch;

        const backfill: Record<string, any> = {};
        if (!uidMatch.firebase_uid && firebaseUid) backfill.firebase_uid = firebaseUid;
        if (!uidMatch.phone_number && fullPhone) backfill.phone_number = fullPhone;
        if (!uidMatch.phone && cleanPhone) backfill.phone = cleanPhone;

        if (Object.keys(backfill).length > 0) {
          const { data: patchedUser } = await supabase
            .from("users")
            .update(backfill)
            .eq("id", supabaseUid)
            .select("*")
            .single();

          if (patchedUser) {
            userData = patchedUser;
          }
        }
      } else {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            id: supabaseUid,
            name: "New User",
            phone_number: fullPhone || null,
            phone: cleanPhone || null,
            firebase_uid: firebaseUid,
            role: "patient",
          })
          .select("*")
          .single();

        if (insertError || !newUser) {
          console.error("Failed to create user record:", insertError);
          return;
        }

        userData = newUser;
      }

      localStorage.setItem("supabaseUserId", userData.id);

      let uid = userData.id;
      setUserId(uid);

      if (cleanPhone || fullPhone) {
        const { data: links } = await supabase
          .from("caregiver_links")
          .select("patient_id, patient_name")
          .or(`caregiver_phone.eq.${cleanPhone},caregiver_phone.eq.${fullPhone},caregiver_phone.eq.+91${cleanPhone}`);

        if (links && links.length > 0) {
          const otherPatients = links.filter((l: any) => l.patient_id !== userData.id);
          if (otherPatients.length > 0) {
            setCaregiverPatients(otherPatients);
            if (otherPatients.length === 1) {
              role = "caregiver";
              uid = otherPatients[0].patient_id;
              patientName = otherPatients[0].patient_name || "Patient";
            } else {
              role = "caregiver";
              setUserRole(role);
              setUserId(userData.id);
              setUser(dbUserToApp(userData));

              posthog.identify(fullPhone || userData.id, {
                name: userData.name,
                phone: fullPhone,
                role,
              });
              return;
            }
          }
        }
      }

      setUserId(uid);
      setUserRole(role);
      setViewingPatientName(patientName);

      posthog.identify(fullPhone || userData.id, {
        name: userData.name,
        phone: fullPhone,
        role,
        device: navigator.userAgent.includes("Android") ? "Android" : "Other",
      });
      posthog.capture("app_opened", { source: "direct" });

      const today = new Date().toISOString().split("T")[0];

      const [medsRes, remindersRes, aptsRes] = await Promise.all([
        supabase.from("medications").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: true }),
        supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", uid).eq("scheduled_date", today).order("scheduled_time", { ascending: true }),
        supabase.from("appointments").select("*").eq("user_id", uid).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true }),
      ]);

      setUser(dbUserToApp(userData));

      const meds = (medsRes.data || []).map(dbMedToApp);
      setMedications(meds);

      const medNameMap = new Map(meds.map((m) => [m.id, m.name]));
      const dbReminders = (remindersRes.data || []).map((r: any) => {
        const medName = r.medications?.name || medNameMap.get(r.medication_id) || "Unknown";
        return dbReminderToApp(r, medName);
      });

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
            setReminders(
              inserted.map((r: any) => {
                const medName = r.medications?.name || medNameMap.get(r.medication_id) || "Unknown";
                return dbReminderToApp(r, medName);
              })
            );
          }
        }
      } else {
        setReminders(dbReminders);
      }

      setAppointments((aptsRes.data || []).map(dbAppointmentToApp));
      setStreak(userData.streak || 0);
    } catch (error) {
      console.error("Failed to load app data:", error);
    } finally {
      setLoading(false);
    }
  }, [resetState]);

  useEffect(() => {
    void loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void loadData();
        return;
      }

      if (!firebaseAuth.currentUser) {
        resetState();
        setLoading(false);
      }
    });

    const firebaseUnsubscribe = firebaseAuth.onAuthStateChanged((fbUser) => {
      if (!fbUser) {
        resetState();
        setLoading(false);
        return;
      }

      setLoading(true);
      void loadData();
    });

    return () => {
      subscription.unsubscribe();
      firebaseUnsubscribe();
    };
  }, [loadData, resetState]);

  const setUserAndPersist: React.Dispatch<React.SetStateAction<UserProfile>> = useCallback(
    (action) => {
      setUser((prev) => {
        const next = typeof action === "function" ? action(prev) : action;

        void getActiveUserId().then((activeUserId) => {
          if (!activeUserId) return;

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

          void supabase.from("users").update(dbData).eq("id", activeUserId);
        });

        return next;
      });
    },
    [getActiveUserId]
  );

  const addMedication = useCallback(async (med: Medication) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

    const { data, error } = await supabase
      .from("medications")
      .insert({
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
      })
      .select()
      .single();

    if (error || !data) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error?.code });
      return false;
    }

    posthog.capture("medication_saved", { med_name: med.name, times_count: med.times.length, has_gap: !!med.mandatoryGapMinutes });

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", activeUserId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));

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

    return true;
  }, [getActiveUserId]);

  const updateMedication = useCallback(async (med: Medication) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

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
    }).eq("id", med.id).eq("user_id", activeUserId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error.code });
      return false;
    }

    posthog.capture("medication_updated", { med_name: med.name });

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", activeUserId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));

    await regenerateRemindersFromDB(activeUserId);
    return true;
  }, [getActiveUserId]);

  const deleteMedication = useCallback(async (medId: string) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

    const med = medications.find((m) => m.id === medId);
    const { error } = await supabase.from("medications").update({ is_active: false }).eq("id", medId).eq("user_id", activeUserId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "medications", error_code: error.code });
      return false;
    }

    posthog.capture("medication_deleted", { med_name: med?.name });

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", activeUserId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
    return true;
  }, [getActiveUserId, medications]);

  const toggleMedicationActive = useCallback(async (medId: string) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

    const med = medications.find((m) => m.id === medId);
    if (!med) return false;

    const newActive = !med.isActive;
    await supabase.from("medications").update({ is_active: newActive, updated_at: new Date().toISOString() }).eq("id", medId).eq("user_id", activeUserId);

    const { data: medsData } = await supabase.from("medications").select("*").eq("user_id", activeUserId).eq("is_active", true).order("created_at", { ascending: true });
    if (medsData) setMedications(medsData.map(dbMedToApp));
    await regenerateRemindersFromDB(activeUserId);
    return true;
  }, [getActiveUserId, medications]);

  const addAppointment = useCallback(async (apt: Appointment) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

    const { error } = await supabase.from("appointments").insert({
      id: apt.id,
      user_id: activeUserId,
      title: apt.title,
      doctor_name: apt.doctorName,
      appointment_datetime: apt.dateTime,
      location: apt.location,
      notes: apt.notes,
      reminder_minutes_before: apt.reminderMinutesBefore,
    });

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "appointments", error_code: error.code });
      return false;
    }

    posthog.capture("appointment_saved");

    const { data: aptsData } = await supabase.from("appointments").select("*").eq("user_id", activeUserId).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true });
    if (aptsData) setAppointments(aptsData.map(dbAppointmentToApp));
    return true;
  }, [getActiveUserId]);

  const deleteAppointment = useCallback(async (aptId: string) => {
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return false;

    const { error } = await supabase.from("appointments").delete().eq("id", aptId).eq("user_id", activeUserId);

    if (error) {
      posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "appointments", error_code: error.code });
      return false;
    }

    const { data: aptsData } = await supabase.from("appointments").select("*").eq("user_id", activeUserId).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true });
    if (aptsData) setAppointments(aptsData.map(dbAppointmentToApp));
    return true;
  }, [getActiveUserId]);

  const regenerateRemindersFromDB = useCallback(async (activeUserId?: string | null) => {
    const resolvedUserId = activeUserId || await getActiveUserId();
    if (!resolvedUserId) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: remData } = await supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", resolvedUserId).eq("scheduled_date", today).order("scheduled_time", { ascending: true });
    if (remData) {
      setReminders(remData.map((r: any) => dbReminderToApp(r, r.medications?.name || "Unknown")));
    }
  }, [getActiveUserId]);

  const markReminderAsTaken = useCallback(async (reminderId: string) => {
    const now = new Date().toISOString();
    setReminders((prev) => markAsTakenUtil(reminderId, prev));

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      const { error } = await supabase.from("reminders").update({ status: "taken", taken_at: now }).eq("id", reminderId).eq("user_id", activeUserId);
      if (error) {
        posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "reminders", error_code: error.code });
      }
      await supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: activeUserId, action: "taken" });
    }
  }, [getActiveUserId]);

  const skipReminder = useCallback(async (reminderId: string) => {
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? { ...r, status: "skipped" as const } : r)));

    const activeUserId = await getActiveUserId();
    if (activeUserId) {
      const { error } = await supabase.from("reminders").update({ status: "skipped" }).eq("id", reminderId).eq("user_id", activeUserId);
      if (error) {
        posthog.capture("error_occurred", { error_type: "supabase_write_failed", screen: "reminders", error_code: error.code });
      }
      await supabase.from("reminder_logs").insert({ reminder_id: reminderId, user_id: activeUserId, action: "skipped" });
    }
  }, [getActiveUserId]);

  const rescheduleReminderAction = useCallback(
    (reminderId: string, delayMinutes: number): string[] => {
      let conflicts: string[] = [];
      setReminders((prev) => {
        const result = rescheduleReminderUtil(reminderId, delayMinutes, prev, medications);
        conflicts = result.conflicts;

        void getActiveUserId().then((activeUserId) => {
          if (!activeUserId) return;

          const original = prev.find((r) => r.id === reminderId);
          if (!original) return;

          const newReminder = result.updatedReminders.find(
            (r) => r.id.includes("rescheduled") && r.medicationId === original.medicationId && r.status === "pending"
          );

          void supabase.from("reminders").update({
            status: "rescheduled",
            rescheduled_to: newReminder?.scheduledTime || null,
          }).eq("id", reminderId).eq("user_id", activeUserId);

          if (newReminder) {
            void supabase.from("reminders").insert({
              user_id: activeUserId,
              medication_id: original.medicationId,
              scheduled_date: original.date,
              scheduled_time: newReminder.scheduledTime,
              status: "pending",
              retry_count: 1,
            });
          }

          void supabase.from("reminder_logs").insert({
            reminder_id: reminderId,
            user_id: activeUserId,
            action: "rescheduled",
            notes: `Delayed by ${delayMinutes} minutes`,
          });
        });

        return result.updatedReminders;
      });
      return conflicts;
    },
    [getActiveUserId, medications]
  );

  const todayStats = useCallback(() => getTodayStatsUtil(reminders), [reminders]);
  const getStreak = useCallback(() => streak, [streak]);

  const selectPatient = useCallback(async (patientId: string) => {
    setLoading(true);
    const patient = caregiverPatients.find((p) => p.patient_id === patientId);
    setUserId(patientId);
    setViewingPatientName(patient?.patient_name || "Patient");

    const today = new Date().toISOString().split("T")[0];

    const [userData, medsRes, remindersRes, aptsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", patientId).maybeSingle(),
      supabase.from("medications").select("*").eq("user_id", patientId).eq("is_active", true).order("created_at", { ascending: true }),
      supabase.from("reminders").select("*, medications(name, dosage, color)").eq("user_id", patientId).eq("scheduled_date", today).order("scheduled_time", { ascending: true }),
      supabase.from("appointments").select("*").eq("user_id", patientId).gte("appointment_datetime", new Date().toISOString()).order("appointment_datetime", { ascending: true }),
    ]);

    if (userData.data) setUser(dbUserToApp(userData.data));
    const meds = (medsRes.data || []).map(dbMedToApp);
    setMedications(meds);
    const medNameMap = new Map(meds.map((m) => [m.id, m.name]));
    setReminders((remindersRes.data || []).map((r: any) => dbReminderToApp(r, r.medications?.name || medNameMap.get(r.medication_id) || "Unknown")));
    setAppointments((aptsRes.data || []).map(dbAppointmentToApp));
    setStreak(userData.data?.streak || 0);
    setLoading(false);
  }, [caregiverPatients]);

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
        caregiverPatients,
        selectPatient,
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
