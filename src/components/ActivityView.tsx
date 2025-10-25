import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activityLog = [
  {
    id: 1,
    type: "medication",
    name: "Lisinopril 10mg",
    status: "taken",
    time: "8:00 AM",
    date: "Today",
    confirmedAt: "8:02 AM",
  },
  {
    id: 2,
    type: "medication",
    name: "Metformin 500mg",
    status: "missed",
    time: "2:00 PM",
    date: "Yesterday",
    reason: "No response after 2 reminders",
  },
  {
    id: 3,
    type: "medication",
    name: "Atorvastatin 20mg",
    status: "taken",
    time: "8:00 PM",
    date: "Yesterday",
    confirmedAt: "8:05 PM",
  },
  {
    id: 4,
    type: "medication",
    name: "Lisinopril 10mg",
    status: "taken",
    time: "8:00 AM",
    date: "Yesterday",
    confirmedAt: "8:01 AM",
  },
  {
    id: 5,
    type: "appointment",
    name: "Dr. Sarah Johnson - Cardiology",
    status: "completed",
    time: "3:00 PM",
    date: "Oct 20, 2025",
  },
];

export const ActivityView = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Activity Log</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-2" />
              <p className="text-3xl font-bold text-accent">15</p>
              <p className="text-sm text-muted-foreground">Taken This Week</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-bold text-destructive">2</p>
              <p className="text-sm text-muted-foreground">Missed This Week</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mx-auto mb-2">88%</div>
              <p className="text-sm text-muted-foreground">Adherence Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityLog.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-xl border-2 bg-card hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0 mt-1">
                  {item.status === "taken" || item.status === "completed" ? (
                    <CheckCircle2 className="w-8 h-8 text-accent" />
                  ) : item.status === "missed" ? (
                    <XCircle className="w-8 h-8 text-destructive" />
                  ) : (
                    <Clock className="w-8 h-8 text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <p className="text-base text-muted-foreground">
                        {item.date} at {item.time}
                      </p>
                    </div>
                    <Badge
                      className={`flex-shrink-0 text-sm px-3 py-1 ${
                        item.status === "taken" || item.status === "completed"
                          ? "bg-accent text-accent-foreground"
                          : item.status === "missed"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-warning text-warning-foreground"
                      }`}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                  </div>
                  {item.confirmedAt && (
                    <p className="text-sm text-muted-foreground">
                      Confirmed at {item.confirmedAt}
                    </p>
                  )}
                  {item.reason && (
                    <p className="text-sm text-destructive mt-1">{item.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
