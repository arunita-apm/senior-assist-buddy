import { z } from "zod";

// ── Shared field validators ─────────────────────────────────────────────────
const nameField = z.string().trim().min(1, "Required").max(100, "Max 100 characters");
const phoneField = z.string().trim().regex(/^[\d+\-\s()]{0,20}$/, "Invalid phone format").max(20, "Max 20 characters");
const emailField = z.string().trim().email("Invalid email").max(255, "Max 255 characters");
const notesField = z.string().max(500, "Max 500 characters").optional();

// ── Medication ──────────────────────────────────────────────────────────────
export const medicationSchema = z.object({
  name: nameField,
  dosage: z.string().trim().min(1, "Required").max(50, "Max 50 characters"),
  notes: z.string().max(500, "Max 500 characters"),
});

// ── Caregiver ───────────────────────────────────────────────────────────────
export const caregiverSchema = z.object({
  name: nameField,
  relationship: z.string().min(1, "Required"),
  phone: phoneField.min(1, "Required"),
  email: emailField,
  note: z.string().max(500, "Max 500 characters"),
});

// ── Patient Profile ─────────────────────────────────────────────────────────
export const profileSchema = z.object({
  name: nameField,
  age: z.string().regex(/^\d{1,3}$/, "Invalid age").refine((v) => {
    const n = parseInt(v, 10);
    return n > 0 && n <= 150;
  }, "Age must be 1-150"),
  phone: phoneField,
});

// ── Appointment ─────────────────────────────────────────────────────────────
export const appointmentSchema = z.object({
  doctor: nameField,
  specialty: z.string().trim().max(100, "Max 100 characters"),
  date: z.string().min(1, "Required"),
  time: z.string().min(1, "Required"),
  location: z.string().trim().max(200, "Max 200 characters"),
  phone: phoneField,
  notes: z.string().max(500, "Max 500 characters"),
});

// ── Voice text input ────────────────────────────────────────────────────────
export const voiceInputSchema = z.string().trim().max(200, "Input too long");

// ── Helper to validate and get errors ───────────────────────────────────────
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((e) => {
    const key = e.path.join(".");
    if (!errors[key]) errors[key] = e.message;
  });
  return { success: false, errors };
}
