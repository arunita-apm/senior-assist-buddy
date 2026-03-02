import { useState, useCallback } from "react";
import { X, Send, Pill, Clock, CalendarPlus, HelpCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { voiceInputSchema } from "@/lib/validation";

interface VoicePanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const VoicePanel = ({ open, onClose, onNavigate }: VoicePanelProps) => {
  const { reminders, markReminderAsTaken, rescheduleReminder, setReminders } = useAppContext();
  const { toast } = useToast();
  const [textInput, setTextInput] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusColor, setStatusColor] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const pendingReminder = reminders.find((r) => r.date === today && r.status === "pending");

  const showConfirmation = useCallback((msg: string, color: string) => {
    setStatusText(msg);
    setStatusColor(color);
    setTimeout(() => {
      setStatusText(null);
      setStatusColor(null);
      onClose();
    }, 2500);
  }, [onClose]);

  const handleTakeMedicine = useCallback(() => {
    if (!pendingReminder) {
      toast({ description: "No pending reminders right now" });
      return;
    }
    markReminderAsTaken(pendingReminder.id);
    showConfirmation("✓ Marked as taken", "#28BF9C");
  }, [pendingReminder, markReminderAsTaken, showConfirmation, toast]);

  const handleRemindLater = useCallback(() => {
    if (!pendingReminder) {
      toast({ description: "No pending reminders right now" });
      return;
    }
    rescheduleReminder(pendingReminder.id, 10);
    showConfirmation("⏰ Rescheduled by 10 minutes", "#F59E0B");
  }, [pendingReminder, rescheduleReminder, showConfirmation, toast]);

  const handleAddAppointment = useCallback(() => {
    onClose();
    onNavigate?.("calendar");
  }, [onClose, onNavigate]);

  const handleWhatsToday = useCallback(() => {
    onClose();
    onNavigate?.("home");
  }, [onClose, onNavigate]);

  const handleTextSend = useCallback(() => {
    const parsed = voiceInputSchema.safeParse(textInput);
    if (!parsed.success) {
      toast({ description: "Input too long (max 200 chars)" });
      return;
    }
    const input = parsed.data.toLowerCase();
    if (!input) return;
    setTextInput("");

    if (input.includes("took") || input.includes("taken") || input.includes("haan") || input.includes("yes") || input.includes("li")) {
      if (!pendingReminder) {
        toast({ description: "No pending reminders right now" });
        return;
      }
      markReminderAsTaken(pendingReminder.id);
      showConfirmation("✓ Marked as taken", "#28BF9C");
    } else if (input.includes("later") || input.includes("wait") || input.includes("baad")) {
      if (!pendingReminder) {
        toast({ description: "No pending reminders right now" });
        return;
      }
      const numMatch = input.match(/(\d+)/);
      const minutes = numMatch ? parseInt(numMatch[1], 10) : 10;
      rescheduleReminder(pendingReminder.id, minutes);
      showConfirmation(`⏰ Rescheduled by ${minutes} minutes`, "#F59E0B");
    } else if (input.includes("skip") || input.includes("no") || input.includes("nahi")) {
      if (!pendingReminder) {
        toast({ description: "No pending reminders right now" });
        return;
      }
      setReminders((prev) =>
        prev.map((r) => (r.id === pendingReminder.id ? { ...r, status: "skipped" as const } : r))
      );
      showConfirmation("Skipped", "#64748B");
    } else if (input.includes("appointment") || input.includes("schedule")) {
      onClose();
      onNavigate?.("calendar");
    } else if (input.includes("today") || input.includes("meds") || input.includes("medicine")) {
      onClose();
      onNavigate?.("home");
    } else {
      showConfirmation("I didn't understand that. Try: 'I took it', 'remind me later', or 'skip'", "#94A3B8");
    }
  }, [textInput, pendingReminder, markReminderAsTaken, rescheduleReminder, showConfirmation, setReminders, toast, onClose, onNavigate]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-card rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-bold text-foreground">What would you like to do?</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Waveform area */}
        <div className="mx-5 mb-4">
          <div className="bg-secondary rounded-xl h-20 flex items-center justify-center gap-1 overflow-hidden">
            {statusText ? (
              <p className="text-sm font-medium px-4 text-center" style={{ color: statusColor || undefined }}>
                {statusText}
              </p>
            ) : (
              Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  style={{
                    height: `${12 + Math.random() * 36}px`,
                    animation: `waveBar 0.6s ease-in-out ${i * 0.05}s infinite alternate`,
                    opacity: 0.5 + Math.random() * 0.5,
                  }}
                />
              ))
            )}
          </div>
          {!statusText && (
            <p className="text-muted-foreground text-sm text-center mt-2">Listening...</p>
          )}
        </div>

        {/* Text input */}
        <div className="mx-5 mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Or type here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
            className="flex-1 h-12 rounded-lg bg-secondary border border-border px-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleTextSend}
            className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
          >
            <Send className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* Quick actions 2×2 */}
        <div className="mx-5 mb-6 grid grid-cols-2 gap-3">
          {[
            { icon: Pill, label: "I took my medicine", action: handleTakeMedicine },
            { icon: Clock, label: "Remind in 10 min", action: handleRemindLater },
            { icon: CalendarPlus, label: "Add appointment", action: handleAddAppointment },
            { icon: HelpCircle, label: "What's today?", action: handleWhatsToday },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="h-16 rounded-xl bg-secondary border border-border flex flex-col items-center justify-center gap-1 hover:bg-muted active:scale-[0.97] transition-all"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
};
