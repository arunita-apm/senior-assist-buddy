import { useState } from "react";
import { Home, Pill, Calendar, User, Mic } from "lucide-react";
import { DashboardView } from "@/components/DashboardView";
import { MedicationView } from "@/components/MedicationView";
import { AppointmentView } from "@/components/AppointmentView";
import { ProfileView } from "@/components/ProfileView";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "profile", label: "Profile", icon: User },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content area — scrollable, with bottom padding for nav */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 sm:px-6 py-6">
        {activeTab === "home" && <DashboardView />}
        {activeTab === "medications" && <MedicationView />}
        {activeTab === "calendar" && <AppointmentView />}
        {activeTab === "profile" && <ProfileView />}
      </main>

      {/* Floating mic FAB */}
      <button
        onClick={() => alert("Voice agent coming soon")}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        aria-label="Voice assistant"
      >
        <Mic className="w-6 h-6" />
      </button>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-nav-background border-t border-border/30">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 py-2 px-3 transition-colors"
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
                    isActive
                      ? "text-accent font-bold"
                      : "text-muted-foreground font-normal"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
