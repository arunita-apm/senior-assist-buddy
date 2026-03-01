import { useState } from "react";
import { Plus, Pill, Pencil, Trash2, Clock as ClockIcon, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Medication } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const FREQ_MAP: Record<string, number> = { once: 1, twice: 2, thrice: 3 };
const FREQ_LABELS: Record<string, string> = { once: "Once", twice: "Twice", thrice: "Thrice", custom: "Custom" };

const DEFAULT_TIMES: Record<string, string[]> = {
  once: ["08:00"],
  twice: ["08:00", "20:00"],
  thrice: ["08:00", "14:00", "20:00"],
};

const TIME_LABELS = ["Morning dose", "Afternoon dose", "Evening dose", "Dose 4", "Dose 5", "Dose 6"];

const GAP_OPTIONS = [
  { label: "None", value: 0 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899", "#06B6D4", "#F97316"];

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function genId(): string {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── form state type ────────────────────────────────────────────────────────

interface FormState {
  name: string;
  dosage: string;
  frequency: "once" | "twice" | "thrice" | "custom";
  customCount: number;
  times: string[];
  gapMode: "none" | "preset" | "custom";
  gapPreset: number;
  gapCustom: string;
  notes: string;
  startDate: Date;
  color: string;
}

const emptyForm = (): FormState => ({
  name: "",
  dosage: "",
  frequency: "once",
  customCount: 1,
  times: ["08:00"],
  gapMode: "none",
  gapPreset: 0,
  gapCustom: "",
  notes: "",
  startDate: new Date(),
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
});

function medToForm(med: Medication): FormState {
  const freq = med.frequency;
  let gapMode: FormState["gapMode"] = "none";
  let gapPreset = 0;
  let gapCustom = "";
  if (med.mandatoryGapMinutes) {
    const preset = GAP_OPTIONS.find((g) => g.value === med.mandatoryGapMinutes);
    if (preset && preset.value > 0) {
      gapMode = "preset";
      gapPreset = preset.value;
    } else {
      gapMode = "custom";
      gapCustom = String(med.mandatoryGapMinutes);
    }
  }
  return {
    name: med.name,
    dosage: med.dosage,
    frequency: freq,
    customCount: freq === "custom" ? med.timesPerDay : FREQ_MAP[freq] || 1,
    times: [...med.times],
    gapMode,
    gapPreset,
    gapCustom,
    notes: med.notes,
    startDate: new Date(med.startDate),
    color: med.color,
  };
}

// ─── component ──────────────────────────────────────────────────────────────

export const MedicationView = () => {
  const { medications, addMedication, updateMedication, deleteMedication, toggleMedicationActive } = useAppContext();
  const { toast } = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingMed, setDeletingMed] = useState<Medication | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);
  const isMaxed = medications.length >= 10;

  // ── drawer open helpers ─────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (med: Medication) => {
    setEditingId(med.id);
    setForm(medToForm(med));
    setErrors({});
    setDrawerOpen(true);
  };

  // ── frequency change handler ────────────────────────────────────────────

  const setFrequency = (freq: FormState["frequency"]) => {
    const count = freq === "custom" ? form.customCount : (FREQ_MAP[freq] || 1);
    const defaults = DEFAULT_TIMES[freq] || [];
    const times: string[] = [];
    for (let i = 0; i < count; i++) {
      times.push(form.times[i] || defaults[i] || "12:00");
    }
    setForm((f) => ({ ...f, frequency: freq, times, customCount: count }));
  };

  const setCustomCount = (n: number) => {
    const count = Math.max(1, Math.min(6, n));
    const times: string[] = [];
    for (let i = 0; i < count; i++) {
      times.push(form.times[i] || "12:00");
    }
    setForm((f) => ({ ...f, customCount: count, times }));
  };

  const setTimeAt = (idx: number, val: string) => {
    setForm((f) => {
      const t = [...f.times];
      t[idx] = val;
      return { ...f, times: t };
    });
  };

  // ── save ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const errs: Record<string, boolean> = {};
    if (!form.name.trim()) errs.name = true;
    if (!form.dosage.trim()) errs.dosage = true;
    if (form.times.length === 0) errs.times = true;
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let gap: number | null = null;
    if (form.frequency !== "once") {
      if (form.gapMode === "preset") gap = form.gapPreset || null;
      if (form.gapMode === "custom") gap = parseInt(form.gapCustom, 10) || null;
    }

    const med: Medication = {
      id: editingId || genId(),
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      timesPerDay: form.frequency === "custom" ? form.customCount : (FREQ_MAP[form.frequency] || 1),
      times: form.times,
      mandatoryGapMinutes: gap,
      startDate: form.startDate.toISOString().split("T")[0],
      isActive: true,
      color: form.color,
      notes: form.notes.trim(),
    };

    if (editingId) {
      // preserve isActive from existing
      const existing = medications.find((m) => m.id === editingId);
      if (existing) med.isActive = existing.isActive;
      updateMedication(med);
      toast({
        description: "Medication updated ✓",
        duration: 3000,
        className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]",
      });
    } else {
      addMedication(med);
      toast({
        description: "Medication added ✓",
        duration: 3000,
        className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]",
      });
    }
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    if (!deletingMed) return;
    deleteMedication(deletingMed.id);
    setDeletingMed(null);
    toast({ description: "Medication removed", duration: 3000 });
  };

  // ── timesCount for current form ─────────────────────────────────────────

  const timesCount = form.frequency === "custom" ? form.customCount : (FREQ_MAP[form.frequency] || 1);
  const showGap = form.frequency !== "once";

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">My Medications</h1>
          <p className="text-sm text-[#64748B]">
            {activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-lg h-10 px-4 font-semibold"
                  onClick={openAdd}
                  disabled={isMaxed}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </span>
            </TooltipTrigger>
            {isMaxed && (
              <TooltipContent className="bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]">
                Maximum 10 medications reached (free plan)
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-[#E6F7F3] text-[#28BF9C]">
          <span className="w-2 h-2 rounded-full bg-[#28BF9C]" />
          {activeMeds.length} active
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-[#F5F5F5] text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
          {inactiveMeds.length} inactive
        </span>
      </div>

      {/* Medication cards */}
      {medications.length === 0 ? (
        <Card className="bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <Pill className="w-12 h-12 text-[#94A3B8]" />
            <p className="text-[#64748B]">No medications added yet</p>
            <Button
              variant="ghost"
              className="text-[#28BF9C] font-semibold"
              onClick={openAdd}
            >
              + Add your first medication →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <Card
              key={med.id}
              className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden"
            >
              <div className="flex">
                {/* Left color strip */}
                <div className="w-1 shrink-0" style={{ backgroundColor: med.color }} />

                <CardContent className="p-4 flex-1 space-y-2">
                  {/* Row 1: name + toggle */}
                  <div className="flex items-center justify-between">
                    <p className="text-[18px] font-bold text-[#1E293B]">{med.name}</p>
                    <Switch
                      checked={med.isActive}
                      onCheckedChange={() => toggleMedicationActive(med.id)}
                      className="data-[state=checked]:bg-[#28BF9C] data-[state=unchecked]:bg-[#CBD5E1]"
                    />
                  </div>

                  {/* Row 2: dosage */}
                  <p className="text-[14px] text-[#64748B]">{med.dosage}</p>

                  {/* Row 3: time chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {med.times.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E6F7F3] text-[#28BF9C] border border-[#99DDD0]"
                      >
                        {formatTime(t)}
                      </span>
                    ))}
                  </div>

                  {/* Row 4: gap warning */}
                  {med.mandatoryGapMinutes && (
                    <p className="text-[13px] text-[#F59E0B]">
                      ⏱ {med.mandatoryGapMinutes} min gap required between doses
                    </p>
                  )}

                  {/* Bottom buttons */}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#1E293B]"
                      onClick={() => openEdit(med)}
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button
                      className="flex items-center gap-1 text-sm text-[#EF4444] hover:text-[#DC2626]"
                      onClick={() => setDeletingMed(med)}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deletingMed} onOpenChange={(open) => !open && setDeletingMed(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deletingMed?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the medication and all its reminders. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add / Edit Drawer ────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-white rounded-t-2xl max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl font-bold text-[#1E293B]">
              {editingId ? "Edit Medication" : "Add Medication"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {editingId ? "Edit medication details" : "Add a new medication"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-4 space-y-5">
            {/* Name */}
            <div>
              <Label htmlFor="med-name" className="text-[13px] text-[#64748B]">Medication Name</Label>
              <Input
                id="med-name"
                name="med-name"
                autoComplete="off"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: false })); }}
                placeholder="e.g. Amlodipine"
                className={cn(
                  "mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] placeholder:text-[#94A3B8] rounded-lg",
                  errors.name && "border-[#EF4444]"
                )}
              />
            </div>

            {/* Dosage */}
            <div>
              <Label htmlFor="med-dosage" className="text-[13px] text-[#64748B]">Dosage</Label>
              <Input
                id="med-dosage"
                name="med-dosage"
                autoComplete="off"
                value={form.dosage}
                onChange={(e) => { setForm((f) => ({ ...f, dosage: e.target.value })); setErrors((e2) => ({ ...e2, dosage: false })); }}
                placeholder="e.g. 5mg, 1 tablet, 2 drops"
                className={cn(
                  "mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] placeholder:text-[#94A3B8] rounded-lg",
                  errors.dosage && "border-[#EF4444]"
                )}
              />
            </div>

            {/* Frequency */}
            <div>
              <Label className="text-[13px] text-[#64748B]">Frequency</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(["once", "twice", "thrice", "custom"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "py-2.5 rounded-lg text-sm font-semibold transition-colors",
                      form.frequency === f
                        ? "bg-[#28BF9C] text-white"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    )}
                    onClick={() => setFrequency(f)}
                  >
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </div>
              {form.frequency === "custom" && (
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#64748B]"
                    onClick={() => setCustomCount(form.customCount - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold text-[#1E293B] w-6 text-center">{form.customCount}</span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#64748B]"
                    onClick={() => setCustomCount(form.customCount + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-[#64748B]">times per day</span>
                </div>
              )}
            </div>

            {/* Times */}
            <div className="space-y-3">
              {Array.from({ length: timesCount }).map((_, i) => (
                <div key={i}>
                  <Label htmlFor={`med-time-${i}`} className="text-[13px] text-[#64748B]">{TIME_LABELS[i] || `Dose ${i + 1}`}</Label>
                  <Input
                    id={`med-time-${i}`}
                    name={`med-time-${i}`}
                    type="time"
                    value={form.times[i] || "08:00"}
                    onChange={(e) => setTimeAt(i, e.target.value)}
                    className="mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
                  />
                </div>
              ))}
            </div>

            {/* Mandatory gap */}
            {showGap && (
              <div>
                <Label className="text-[13px] text-[#64748B]">Minimum time gap between doses</Label>
                <p className="text-[13px] text-[#94A3B8] mt-0.5 mb-2">
                  Set only if your doctor requires a minimum gap. Leave as 'None' if not needed.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GAP_OPTIONS.map((g) => {
                    const isSelected =
                      (g.value === 0 && form.gapMode === "none") ||
                      (g.value > 0 && form.gapMode === "preset" && form.gapPreset === g.value);
                    return (
                      <button
                        key={g.value}
                        type="button"
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                          isSelected ? "bg-[#28BF9C] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                        )}
                        onClick={() => {
                          if (g.value === 0) {
                            setForm((f) => ({ ...f, gapMode: "none", gapPreset: 0 }));
                          } else {
                            setForm((f) => ({ ...f, gapMode: "preset", gapPreset: g.value }));
                          }
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                      form.gapMode === "custom" ? "bg-[#28BF9C] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                    )}
                    onClick={() => setForm((f) => ({ ...f, gapMode: "custom" }))}
                  >
                    Custom
                  </button>
                </div>
                {form.gapMode === "custom" && (
                  <Input
                    id="med-gap-custom"
                    name="med-gap-custom"
                    type="number"
                    min={1}
                    placeholder="Minutes"
                    value={form.gapCustom}
                    onChange={(e) => setForm((f) => ({ ...f, gapCustom: e.target.value }))}
                    className="mt-2 h-[44px] w-32 bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="med-notes" className="text-[13px] text-[#64748B]">Notes</Label>
              <Textarea
                id="med-notes"
                name="med-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any special instructions..."
                rows={3}
                className="mt-1 bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] placeholder:text-[#94A3B8] rounded-lg"
              />
            </div>

            {/* Start date */}
            <div>
              <Label className="text-[13px] text-[#64748B]">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="mt-1 w-full h-[52px] justify-start text-left bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg font-normal"
                  >
                    <ClockIcon className="w-4 h-4 mr-2 text-[#94A3B8]" />
                    {format(form.startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.startDate}
                    onSelect={(d) => d && setForm((f) => ({ ...f, startDate: d }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              className="text-[#64748B]"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-lg h-12 px-6 font-bold"
              onClick={handleSave}
            >
              {editingId ? "Save Changes" : "Save Medication"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
