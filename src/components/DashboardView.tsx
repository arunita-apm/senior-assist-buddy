import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockMedications = [
  { id: 1, name: "Lisinopril", dosage: "10mg", time: "8:00 AM", status: "taken" },
  { id: 2, name: "Metformin", dosage: "500mg", time: "2:00 PM", status: "pending" },
  { id: 3, name: "Atorvastatin", dosage: "20mg", time: "8:00 PM", status: "upcoming" },
];

const mockAppointments = [
  { id: 1, doctor: "Dr. Sarah Johnson", type: "Cardiology", date: "Today", time: "3:00 PM", status: "upcoming" },
  { id: 2, doctor: "Dr. Michael Chen", type: "General Checkup", date: "Tomorrow", time: "10:00 AM", status: "scheduled" },
];

export const DashboardView = () => {
  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taken Today</p>
                <p className="text-4xl font-bold text-accent">1</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-4xl font-bold text-warning">1</p>
              </div>
              <Clock className="w-12 h-12 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-4xl font-bold text-primary">1</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Today's Medications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMedications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between p-4 rounded-xl border-2 bg-card hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  {med.status === "taken" && (
                    <CheckCircle2 className="w-8 h-8 text-accent flex-shrink-0" />
                  )}
                  {med.status === "pending" && (
                    <Clock className="w-8 h-8 text-warning flex-shrink-0" />
                  )}
                  {med.status === "upcoming" && (
                    <AlertTriangle className="w-8 h-8 text-primary flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{med.name}</h3>
                    <p className="text-lg text-muted-foreground">
                      {med.dosage} • {med.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {med.status === "taken" && (
                    <Badge className="bg-accent text-accent-foreground text-sm px-4 py-2">
                      Taken
                    </Badge>
                  )}
                  {med.status === "pending" && (
                    <Button size="lg" className="text-base px-6">
                      Mark as Taken
                    </Button>
                  )}
                  {med.status === "upcoming" && (
                    <Badge variant="outline" className="text-sm px-4 py-2">
                      Scheduled
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-xl border-2 bg-card hover:shadow-md transition-all"
              >
                <div>
                  <h3 className="text-xl font-semibold">{apt.doctor}</h3>
                  <p className="text-lg text-muted-foreground">{apt.type}</p>
                  <p className="text-base text-muted-foreground mt-1">
                    {apt.date} at {apt.time}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-sm px-4 py-2 ${
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
