import { useState, useCallback } from "react";
import { Mic } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Reminder } from "@/lib/types";

function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

type VoiceState = "listening" | "processing" | "done";

interface ReminderActiveScreenProps {
  reminder: Reminder | null;
  onClose: () => void;
}

export const ReminderActiveScreen = ({ reminder, onClose }: ReminderActiveScreenProps) => {
  const { markReminderAsTaken, rescheduleReminder, medications, skipReminder } = useAppContext();
  const { toast } = useToast();
  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const getDosage = useCallback(() => {
    if (!reminder) return "";
    const med = medications.find((m) => m.id === reminder.medicationId);
    return med?.dosage || "";
  }, [reminder, medications]);

  const closeAfterDelay = useCallback((ms: number) => {
    setTimeout(() => {
      onClose();
      setVoiceState("listening");
      setFlashColor(null);
      setStatusMessage(null);
      setConflictMessage(null);
      setShowSnoozeSheet(false);
    }, ms);
  }, [onClose]);

  const handleTakeIt = () => {
    if (!reminder) return;
    markReminderAsTaken(reminder.id);
    setVoiceState("done");
    setFlashColor("bg-[hsl(168,65%,45%)]");
    toast({
      description: "Medication marked as taken ✓",
      duration: 3000,
      className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]",
    });
    closeAfterDelay(1500);
  };

  const handleSkip = () => {
    if (!reminder) return;
    skipReminder(reminder.id);
    setStatusMessage("Noted. Your caregiver will be informed.");
    closeAfterDelay(1500);
  };

  const handleSnooze = (minutes: number) => {
    if (!reminder) return;
    const conflicts = rescheduleReminder(reminder.id, minutes);
    if (conflicts.length > 0) {
      setConflictMessage(`⚠️ ${conflicts[0]}`);
      setTimeout(() => {
        setShowSnoozeSheet(false);
        setConflictMessage(null);
        onClose();
      }, 2000);
    } else {
      setShowSnoozeSheet(false);
      toast({
        description: `Rescheduled by ${minutes} minutes`,
        duration: 3000,
      });
      closeAfterDelay(500);
    }
  };

  if (!reminder) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(15, 23, 42, 0.6)" }}>
        {flashColor && (
          <div className={`absolute inset-0 ${flashColor} opacity-20 animate-fade-in`} />
        )}

        <div className="bg-card rounded-2xl shadow-xl w-[88%] max-w-md p-7 relative flex flex-col items-center gap-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-primary opacity-40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <span className="absolute inset-2 rounded-full border-2 border-primary opacity-25 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]" />
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center z-10">
              <Mic className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>

          <p className="text-muted-foreground text-base">{formatTime(reminder.scheduledTime)}</p>

          <div className="text-center">
            <p className="text-foreground font-bold text-[28px] leading-tight">{reminder.medicationName}</p>
            <p className="text-muted-foreground text-base mt-1">{getDosage()}</p>
          </div>

          {statusMessage ? (
            <p className="text-muted-foreground text-sm text-center">{statusMessage}</p>
          ) : (
            <p className={`text-sm text-center italic ${voiceState === "listening" ? "text-muted-foreground" : "text-primary font-bold"}`}>
              {voiceState === "listening" && "Listening for your response..."}
              {voiceState === "processing" && "Got it, processing..."}
              {voiceState === "done" && "Marked as taken ✓"}
            </p>
          )}

          <div className="w-full flex flex-col gap-2">
            <button
              onClick={handleTakeIt}
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              ✓ I took it
            </button>
            <button
              onClick={() => setShowSnoozeSheet(true)}
              className="w-full h-14 rounded-xl bg-[hsl(48,100%,96%)] text-[hsl(38,92%,50%)] border border-[hsl(48,96%,89%)] font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              ⏰ Remind me later
            </button>
            <button
              onClick={handleSkip}
              className="w-full h-12 rounded-xl bg-secondary text-muted-foreground border border-border font-normal text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              ✕ Skip for now
            </button>
          </div>
        </div>
      </div>

      <Drawer open={showSnoozeSheet} onOpenChange={setShowSnoozeSheet}>
        <DrawerContent className="z-[110]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Remind me later</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {[
              { label: "In 10 min", min: 10 },
              { label: "In 20 min", min: 20 },
              { label: "In 30 min", min: 30 },
              { label: "In 1 hour", min: 60 },
            ].map((opt) => (
              <button
                key={opt.min}
                onClick={() => handleSnooze(opt.min)}
                className="w-full h-12 rounded-lg bg-secondary text-foreground text-base font-medium hover:bg-muted active:scale-[0.98] transition-all"
              >
                {opt.label}
              </button>
            ))}
            {conflictMessage && (
              <p className="text-sm text-[hsl(38,92%,50%)] text-center mt-2">{conflictMessage}</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
