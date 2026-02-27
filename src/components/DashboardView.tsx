import { useMemo } from "react";
import { CheckCircle2, Clock, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";
import { format } from "date-fns";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DashboardView = () => {
  const { user, reminders, medications, getTodayStats, getCurrentStreak } = useAppContext();

  const stats = getTodayStats();
  const streak = getCurrentStreak();
  const today = format(new Date(), "EEEE, d MMM yyyy");

  const progressPercent = stats.totalScheduled > 0 ? Math.round((stats.taken / stats.totalScheduled) * 100) : 0;
  const allDone = stats.totalScheduled > 0 && stats.taken === stats.totalScheduled;

  // Progress bar color
  const progressColor = useMemo(() => {
    if (progressPercent >= 100) return "bg-success";
    if (progressPercent > 50) return "bg-accent";
    return "bg-warning";
  }, [progressPercent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-base text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
          <span className="text-sm font-bold text-accent">{getInitials(user.name)}</span>
        </div>
      </div>

      {/* Main Status Card */}
      <Card className="border-2 border-accent/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Today's Medications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big numbers */}
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-accent">{stats.taken}</span>
            <span className="text-3xl text-muted-foreground font-light">/</span>
            <span className="text-5xl font-bold text-foreground">{stats.totalScheduled}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Streak */}
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Flame className="w-5 h-5 text-warning" />
            <span className="text-base font-medium">{streak} day streak</span>
          </div>

          {/* All done banner */}
          {allDone && (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-success/15 border border-success/30">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-base font-semibold text-success">All done for now! ✓</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Medication List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Upcoming Doses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-secondary/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {rem.status === "taken" && <CheckCircle2 className="w-7 h-7 text-success flex-shrink-0" />}
                  {rem.status === "pending" && <Clock className="w-7 h-7 text-warning flex-shrink-0" />}
                  {rem.status === "skipped" && <AlertTriangle className="w-7 h-7 text-destructive flex-shrink-0" />}
                  {rem.status === "rescheduled" && <Clock className="w-7 h-7 text-primary flex-shrink-0" />}
                  <div>
                    <h3 className="text-lg font-semibold">{rem.medicationName}</h3>
                    <p className="text-sm text-muted-foreground">{rem.scheduledTime}</p>
                  </div>
                </div>
                {rem.status === "taken" ? (
                  <Badge className="bg-success/20 text-success border-success/30 text-sm px-3 py-1">
                    Taken
                  </Badge>
                ) : rem.status === "pending" ? (
                  <Badge className="bg-warning/20 text-warning border-warning/30 text-sm px-3 py-1">
                    Pending
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {rem.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
