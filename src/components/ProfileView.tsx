import { useState } from "react";
import { Phone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppContext } from "@/context/AppContext";

export const ProfileView = () => {
  const { user, reminders, getCurrentStreak } = useAppContext();
  const [settings, setSettings] = useState({
    reminderSound: true,
    caregiverNotifications: true,
    vibration: true,
  });

  // Stats
  const todayReminders = reminders.filter(r => r.date === new Date().toISOString().split("T")[0]);
  const takenCount = todayReminders.filter(r => r.status === "taken").length;
  const totalCount = todayReminders.length;
  const adherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const streak = getCurrentStreak();

  // Initials from name
  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="bg-card shadow-sm border border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-xl">{initials}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">{user.age} years</p>
            </div>
            <button className="text-primary text-sm font-medium">Edit Profile</button>
          </div>
        </CardContent>
      </Card>

      {/* Caregiver Card — kept as-is */}
      {user.caregiver && (
        <Card className="bg-card shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Caregiver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{user.caregiver.name}</p>
              <p className="text-muted-foreground capitalize">{user.caregiver.relationship}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{user.caregiver.phone}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl px-3 py-3 text-center bg-primary/10">
          <p className="text-lg font-bold text-primary">{takenCount}</p>
          <p className="text-xs text-primary">doses taken</p>
        </div>
        <div className="flex-1 rounded-xl px-3 py-3 text-center bg-primary/10">
          <p className="text-lg font-bold text-primary">{adherence}%</p>
          <p className="text-xs text-primary">adherence</p>
        </div>
        <div className="flex-1 rounded-xl px-3 py-3 text-center bg-warning/10">
          <p className="text-lg font-bold text-warning">{streak}</p>
          <p className="text-xs text-warning">day streak</p>
        </div>
      </div>

      {/* Settings Card */}
      <Card className="bg-card shadow-sm border border-border">
        <CardContent className="p-0 divide-y divide-border">
          {[
            { key: "reminderSound" as const, label: "Reminder sound" },
            { key: "caregiverNotifications" as const, label: "Caregiver notifications" },
            { key: "vibration" as const, label: "Vibration" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <span className="text-foreground font-medium">{label}</span>
              <Switch
                checked={settings[key]}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, [key]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center pt-4 pb-2 space-y-1">
        <p className="text-sm text-muted-foreground">Senior Buddy v1.0 (MVP)</p>
        <p className="text-xs text-muted-foreground">Built for seniors, by someone who cares.</p>
      </div>
    </div>
  );
};
