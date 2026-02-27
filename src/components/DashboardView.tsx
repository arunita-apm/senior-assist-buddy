import { CheckCircle2, Clock, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppContext } from "@/context/AppContext";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const mockAppointments = [
  { id: 1, doctor: "Dr. Sarah Johnson", type: "Cardiology", date: "Today", time: "3:00 PM", status: "upcoming" },
  { id: 2, doctor: "Dr. Michael Chen", type: "General Checkup", date: "Tomorrow", time: "10:00 AM", status: "scheduled" },
];

export const DashboardView = () => {
  const { user, getTodayStats, getCurrentStreak, reminders, markReminderAsTaken } = useAppContext();
  const stats = getTodayStats();
  const streak = getCurrentStreak();

  const adherencePercent = stats.adherencePercent;
  const allDone = stats.totalScheduled > 0 && stats.taken === stats.totalScheduled;

  const progressColor =
    adherencePercent === 100
      ? "bg-[#22C55E]"
      : adherencePercent > 50
      ? "bg-[#28BF9C]"
      : "bg-[#F59E0B]";

  // Get today's pending reminders for the "Took it" buttons
  const today = new Date().toISOString().split("T")[0];
  const todayPending = reminders.filter(
    (r) => r.date === today && r.status === "pending" && !r.rescheduledFromOriginal
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            {getGreeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-[#64748B]">{formatToday()}</p>
        </div>
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-accent text-white font-bold text-base">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Main Status Card */}
      <Card className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-[#1E293B]">Today's Medications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large numbers row */}
          <div className="flex items-end justify-center gap-2">
            <div className="text-center">
              <p className="text-[40px] font-bold leading-none text-[#28BF9C]">{stats.taken}</p>
              <p className="text-xs text-[#64748B] mt-1">Taken</p>
            </div>
            <p className="text-[40px] font-bold leading-none text-[#94A3B8] pb-0">/</p>
            <div className="text-center">
              <p className="text-[40px] font-bold leading-none text-[#1E293B]">{stats.totalScheduled}</p>
              <p className="text-xs text-[#64748B] mt-1">Total</p>
            </div>
          </div>

          {/* Progress bar or all-done banner */}
          {allDone ? (
            <div className="bg-[#F0FDF4] rounded-lg py-3 px-4 text-center">
              <p className="text-[#22C55E] font-semibold">All done for today! ✓</p>
            </div>
          ) : (
            <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${adherencePercent}%` }}
              />
            </div>
          )}

          {/* Streak */}
          {streak > 0 && (
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-sm font-semibold text-[#F59E0B]">
                {streak} day streak
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending medications quick actions */}
      {todayPending.length > 0 && (
        <Card className="bg-white shadow-sm border border-[#E2E8F0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-[#1E293B]">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayPending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-[#1E293B]">{r.medicationName}</p>
                      <p className="text-sm text-[#64748B]">{r.scheduledTime}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => markReminderAsTaken(r.id)}>
                    ✓ Took it
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card className="bg-white shadow-sm border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#1E293B]">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-all"
              >
                <div>
                  <h3 className="text-lg font-semibold text-[#1E293B]">{apt.doctor}</h3>
                  <p className="text-sm text-[#64748B]">{apt.type}</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {apt.date} at {apt.time}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 ${
                    apt.status === "upcoming"
                      ? "border-warning text-warning"
                      : "border-primary text-primary"
                  }`}
                >
                  {apt.status === "upcoming" ? "Today" : "Scheduled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
