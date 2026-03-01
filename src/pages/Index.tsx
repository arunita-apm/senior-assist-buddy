import { useState } from "react";
import { Home, Pill, Calendar, Users, Mic } from "lucide-react";
import { DashboardView } from "@/components/DashboardView";
import { MedicationView } from "@/components/MedicationView";
import { AppointmentView } from "@/components/AppointmentView";
import { CaregiverView } from "@/components/CaregiverView";
import { ReminderActiveScreen } from "@/components/ReminderActiveScreen";
import { VoicePanel } from "@/components/VoicePanel";
import { PatientProfileScreen } from "@/components/PatientProfileScreen";
import type { Reminder } from "@/lib/types";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "caregiver", label: "Caregiver", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return <PatientProfileScreen onBack={() => setShowProfile(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto pb-24 px-4 sm:px-6 py-6">
        {activeTab === "home" && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab as TabId)}
            onTestReminder={(r) => setActiveReminder(r)}
            onAvatarTap={() => setShowProfile(true)}
          />
        )}
        {activeTab === "medications" && <MedicationView />}
        {activeTab === "calendar" && <AppointmentView />}
        {activeTab === "caregiver" && <CaregiverView />}
      </main>

      {/* Ask Seva label + Floating mic FAB */}
      {!voicePanelOpen && (
        <span className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 text-[11px] font-semibold text-primary pointer-events-none select-none">
          Ask Seva
        </span>
      )}
      <button
        onClick={() => setVoicePanelOpen(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        aria-label="Voice assistant"
      >
        <Mic className="w-6 h-6" />
      </button>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-nav-background border-t border-border">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 py-2 px-3 transition-colors min-w-[48px] min-h-[64px] justify-center"
                aria-label={tab.label}
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? "text-accent" : "text-muted-foreground"
                  }`}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? "text-accent font-bold" : "text-muted-foreground font-normal"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Reminder overlay */}
      <ReminderActiveScreen
        reminder={activeReminder}
        onClose={() => setActiveReminder(null)}
      />

      {/* Voice panel */}
      <VoicePanel
        open={voicePanelOpen}
        onClose={() => setVoicePanelOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as TabId)}
      />
    </div>
  );
};

export default Index;
