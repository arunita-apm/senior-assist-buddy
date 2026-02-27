import { useState } from "react";
import { Clock, Flame, ChevronDown, CalendarDays, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import type { Reminder } from "@/lib/types";
import { format } from "date-fns";

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

/** Convert "HH:MM" to "h:mm AM/PM" */
function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Check if a HH:MM time has passed relative to now */
function hasTimePassed(time24: string): boolean {
  const now = new Date();
  const [h, m] = time24.split(":").map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() > m);
}

type DisplayStatus = "taken" | "pending" | "missed" | "rescheduled";

function getDisplayStatus(r: Reminder): DisplayStatus {
  if (r.status === "taken") return "taken";
  if (r.status === "rescheduled") return "rescheduled";
  if (r.status === "pending" && hasTimePassed(r.scheduledTime)) return "missed";
  return "pending";
}

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

const StatusBadge = ({ status, rescheduledTo }: { status: DisplayStatus; rescheduledTo?: string | null }) => {
  const config = {
    taken: { bg: "bg-[#E6F7F3]", text: "text-[#28BF9C]", label: "✓ Taken" },
    pending: { bg: "bg-[#FFFBEB]", text: "text-[#F59E0B]", label: "⏰ Pending" },
    missed: { bg: "bg-[#FEF2F2]", text: "text-[#EF4444]", label: "✗ Missed" },
    rescheduled: { bg: "bg-[#E6F7F3]", text: "text-[#28BF9C]", label: `→ ${rescheduledTo ? formatTime(rescheduledTo) : ""}` },
  };
  const c = config[status];
  return (
    <span className={`${c.bg} ${c.text} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap`}>
      {c.label}
    </span>
  );
};

export const DashboardView = ({ onNavigate }: DashboardViewProps) => {
  const { user, getTodayStats, getCurrentStreak, reminders, medications, appointments, markReminderAsTaken, rescheduleReminder } = useAppContext();
  const { toast } = useToast();
  const stats = getTodayStats();
  const streak = getCurrentStreak();
  const [customMinutes, setCustomMinutes] = useState<Record<string, string>>({});
  const [showCustom, setShowCustom] = useState<Record<string, boolean>>({});

  const adherencePercent = stats.adherencePercent;
  const allDone = stats.totalScheduled > 0 && stats.taken === stats.totalScheduled;

  const progressColor =
    adherencePercent === 100
      ? "bg-[#22C55E]"
      : adherencePercent > 50
      ? "bg-[#28BF9C]"
      : "bg-[#F59E0B]";

  const today = new Date().toISOString().split("T")[0];
  const todayReminders = reminders
    .filter((r) => r.date === today && r.status !== "rescheduled")
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const handleReschedule = (reminderId: string, minutes: number) => {
    const conflicts = rescheduleReminder(reminderId, minutes);
    if (conflicts.length > 0) {
      toast({
        description: `⚠️ ${conflicts[0]}`,
        duration: 5000,
        className: "bg-[#FFFBEB] border border-[#F59E0B] text-[#1E293B]",
      });
    }
    setShowCustom((prev) => ({ ...prev, [reminderId]: false }));
  };

  const handleCustomSubmit = (reminderId: string) => {
    const val = parseInt(customMinutes[reminderId] || "0", 10);
    if (val > 0) handleReschedule(reminderId, val);
  };

  // Find dosage for a reminder
  const getDosage = (r: Reminder) => {
    const med = medications.find((m) => m.id === r.medicationId);
    return med?.dosage || "";
  };

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

      {/* Today's Reminders */}
      {todayReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[#1E293B]">Today's Reminders</h2>
          {todayReminders.map((r) => {
            const displayStatus = getDisplayStatus(r);
            const isPending = displayStatus === "pending";
            const dosage = getDosage(r);

            return (
              <Card key={r.id} className="bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: time */}
                    <p className="text-[22px] font-bold text-[#1E293B] leading-tight shrink-0 min-w-[80px]">
                      {formatTime(r.scheduledTime)}
                    </p>

                    {/* Center: name + dosage + actions */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[18px] font-bold text-[#1E293B] leading-tight">{r.medicationName}</p>
                      <p className="text-[14px] text-[#64748B]">{dosage}</p>

                      {isPending && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-lg h-10 px-4 text-sm font-semibold"
                            onClick={() => markReminderAsTaken(r.id)}
                          >
                            ✓ Took it
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B] border-0 rounded-lg h-10 px-4 text-sm font-semibold"
                              >
                                ⏰ Later <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {[10, 20, 30, 60].map((min) => (
                                <DropdownMenuItem key={min} onClick={() => handleReschedule(r.id, min)}>
                                  In {min === 60 ? "1 hour" : `${min} minutes`}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setShowCustom((prev) => ({ ...prev, [r.id]: true }));
                                }}
                              >
                                Custom...
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {showCustom[r.id] && isPending && (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="Minutes"
                            className="w-24 h-9 text-sm"
                            value={customMinutes[r.id] || ""}
                            onChange={(e) =>
                              setCustomMinutes((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            className="h-9 bg-[#28BF9C] hover:bg-[#22a888] text-white text-sm"
                            onClick={() => handleCustomSubmit(r.id)}
                          >
                            Snooze
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right: badge */}
                    <StatusBadge status={displayStatus} rescheduledTo={r.rescheduledTo} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upcoming Appointments */}
      {(() => {
        const now = new Date();
        const futureAppointments = appointments
          .filter((a) => new Date(a.dateTime) > now)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
          .slice(0, 2);

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E293B]">Upcoming</h2>
              <button
                onClick={() => onNavigate?.("calendar")}
                className="text-sm font-semibold text-[#28BF9C] hover:underline"
              >
                See all →
              </button>
            </div>

            {futureAppointments.length === 0 ? (
              <Card className="bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
                <CardContent className="py-8 flex flex-col items-center gap-3">
                  <CalendarDays className="w-10 h-10 text-[#94A3B8]" />
                  <p className="text-sm text-[#64748B]">No upcoming appointments</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-[#F1F5F9] text-[#28BF9C] hover:bg-[#E2E8F0] font-semibold"
                    onClick={() => onNavigate?.("calendar")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              futureAppointments.map((apt) => {
                const dt = new Date(apt.dateTime);
                return (
                  <Card key={apt.id} className="bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Calendar icon circle */}
                        <div className="w-10 h-10 rounded-full bg-[#E6F7F3] flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5 text-[#28BF9C]" />
                        </div>

                        {/* Title + doctor */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1E293B] truncate">{apt.title}</p>
                          <p className="text-sm text-[#64748B] truncate">{apt.doctorName}</p>
                        </div>

                        {/* Date + time */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-[#1E293B]">
                            {format(dt, "MMM d")}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {format(dt, "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        );
      })()}
    </div>
  );
};
