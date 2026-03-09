import { useState, useRef, useCallback, useEffect } from "react";
import { X, Send, Sparkles, ArrowLeft, Pill, Clock, CalendarPlus, HelpCircle, Mic, MicOff } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { voiceInputSchema } from "@/lib/validation";
import { posthog } from "@/lib/posthog";
import { streamSevaChat, type ChatMessage } from "@/lib/sevaChat";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoicePanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

type PanelMode = "quick" | "chat";

export const VoicePanel = ({ open, onClose, onNavigate }: VoicePanelProps) => {
  const { reminders, markReminderAsTaken, rescheduleReminder, skipReminder } = useAppContext();
  const { toast } = useToast();
  const [textInput, setTextInput] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusColor, setStatusColor] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("quick");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  const speechSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = useCallback(() => {
    if (!speechSupported) {
      toast({ description: "Speech recognition is not supported in this browser", variant: "destructive" });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        setTextInput((prev) => (prev + " " + final).trim());
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimText("");
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast({ description: `Microphone error: ${event.error}`, variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    posthog.capture("seva_voice_input_started");
  }, [speechSupported, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const pendingReminder = reminders.find((r) => r.date === today && r.status === "pending");

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Reset mode on close + stop listening
  useEffect(() => {
    if (!open) {
      setMode("quick");
      setStatusText(null);
      setStatusColor(null);
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText("");
    }
  }, [open]);

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

  // Quick-action text handler (existing logic)
  const handleQuickTextSend = useCallback(() => {
    const parsed = voiceInputSchema.safeParse(textInput);
    if (!parsed.success) {
      toast({ description: "Input too long (max 200 chars)" });
      return;
    }
    const input = parsed.data.toLowerCase();
    if (!input) return;
    setTextInput("");

    if (input.includes("took") || input.includes("taken") || input.includes("haan") || input.includes("yes") || input.includes("li")) {
      if (!pendingReminder) { toast({ description: "No pending reminders right now" }); return; }
      markReminderAsTaken(pendingReminder.id);
      showConfirmation("✓ Marked as taken", "#28BF9C");
    } else if (input.includes("later") || input.includes("wait") || input.includes("baad")) {
      if (!pendingReminder) { toast({ description: "No pending reminders right now" }); return; }
      const numMatch = input.match(/(\d+)/);
      const minutes = numMatch ? parseInt(numMatch[1], 10) : 10;
      rescheduleReminder(pendingReminder.id, minutes);
      showConfirmation(`⏰ Rescheduled by ${minutes} minutes`, "#F59E0B");
    } else if (input.includes("skip") || input.includes("no") || input.includes("nahi")) {
      if (!pendingReminder) { toast({ description: "No pending reminders right now" }); return; }
      skipReminder(pendingReminder.id);
      showConfirmation("Skipped", "#64748B");
    } else if (input.includes("appointment") || input.includes("schedule")) {
      onClose();
      onNavigate?.("calendar");
    } else if (input.includes("today") || input.includes("meds") || input.includes("medicine")) {
      onClose();
      onNavigate?.("home");
    } else {
      // Fall through to AI chat
      setMode("chat");
      sendChatMessage(textInput);
    }
  }, [textInput, pendingReminder, markReminderAsTaken, rescheduleReminder, skipReminder, showConfirmation, toast, onClose, onNavigate]);

  // AI chat send
  const sendChatMessage = useCallback(async (text?: string) => {
    const msg = text || textInput.trim();
    if (!msg || isStreaming) return;
    setTextInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setIsStreaming(true);

    posthog.capture("seva_ai_chat_sent", { length: msg.length });

    let assistantContent = "";

    await streamSevaChat({
      messages: newMessages,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      },
      onDone: () => setIsStreaming(false),
      onError: (errMsg) => {
        setIsStreaming(false);
        toast({ description: errMsg, variant: "destructive" });
      },
    });
  }, [textInput, chatMessages, isStreaming, toast]);

  const handleTextSend = useCallback(() => {
    if (mode === "chat") {
      sendChatMessage();
    } else {
      handleQuickTextSend();
    }
  }, [mode, sendChatMessage, handleQuickTextSend]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-card rounded-t-2xl shadow-xl flex flex-col"
        style={{ animation: "slideUp 0.3s ease-out", maxHeight: mode === "chat" ? "90vh" : "85vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          {mode === "chat" ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("quick")} className="text-muted-foreground hover:text-foreground p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                Chat with Seva
              </h2>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-foreground">What would you like to do?</h2>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === "quick" && (
          <>
            {/* Waveform / status area */}
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

            {/* Quick action buttons */}
            <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
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

            {/* Ask Seva AI button */}
            <div className="mx-5 mb-4">
              <button
                onClick={() => setMode("chat")}
                className="w-full h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center gap-2 hover:bg-accent/20 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold text-accent">Ask Seva AI anything</span>
              </button>
            </div>
          </>
        )}

        {mode === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 mx-5 mb-4">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: "55vh" }}>
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mb-2 text-accent/60" />
                  <p className="text-sm text-center">
                    Ask me anything about your health,<br />medications, or appointments!
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interim speech text */}
        {isListening && interimText && (
          <div className="mx-5 mb-2">
            <p className="text-xs text-muted-foreground italic animate-pulse">🎤 {interimText}</p>
          </div>
        )}

        {/* Text input — always visible */}
        <div className="mx-5 mb-6 flex gap-2">
          <input
            type="text"
            placeholder={isListening ? "Listening..." : mode === "chat" ? "Ask Seva anything..." : "Or type here..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
            className="flex-1 h-12 rounded-lg bg-secondary border border-border px-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {speechSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                isListening
                  ? "bg-destructive animate-pulse"
                  : "bg-secondary border border-border hover:bg-muted"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-destructive-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-foreground" />
              )}
            </button>
          )}
          <button
            onClick={() => {
              posthog.capture("seva_text_sent", { command: textInput, mode });
              handleTextSend();
            }}
            disabled={isStreaming || !textInput.trim()}
            className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-primary-foreground" />
          </button>
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
