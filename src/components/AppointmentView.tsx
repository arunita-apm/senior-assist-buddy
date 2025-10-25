import { Plus, Calendar, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const appointments = [
  {
    id: 1,
    doctor: "Dr. Sarah Johnson",
    specialty: "Cardiology",
    date: "2025-10-26",
    time: "3:00 PM",
    location: "Heart & Vascular Center",
    phone: "(555) 123-4567",
    notes: "Annual heart checkup and EKG",
    status: "upcoming",
  },
  {
    id: 2,
    doctor: "Dr. Michael Chen",
    specialty: "General Practice",
    date: "2025-10-27",
    time: "10:00 AM",
    location: "Main Medical Building",
    phone: "(555) 234-5678",
    notes: "General health checkup",
    status: "scheduled",
  },
  {
    id: 3,
    doctor: "Dr. Emily Rodriguez",
    specialty: "Ophthalmology",
    date: "2025-11-02",
    time: "2:30 PM",
    location: "Vision Care Center",
    phone: "(555) 345-6789",
    notes: "Eye examination and prescription update",
    status: "scheduled",
  },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
};

export const AppointmentView = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Appointments</h2>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Schedule Appointment
        </Button>
      </div>

      <div className="grid gap-6">
        {appointments.map((apt) => (
          <Card key={apt.id} className="overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{apt.doctor}</CardTitle>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {apt.specialty}
                    </Badge>
                  </div>
                </div>
                <Badge 
                  className={`text-base px-4 py-2 ${
                    apt.status === "upcoming" 
                      ? "bg-warning text-warning-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {apt.status === "upcoming" ? "Tomorrow" : "Scheduled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 text-lg">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{formatDate(apt.date)}</p>
                    <p className="text-muted-foreground">{apt.time}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-lg">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <p className="text-muted-foreground">{apt.location}</p>
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">{apt.phone}</p>
                </div>
              </div>
              {apt.notes && (
                <div className="pt-2 border-t">
                  <h4 className="text-lg font-semibold mb-2">Notes</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {apt.notes}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" className="flex-1">
                  Reschedule
                </Button>
                <Button variant="outline" size="lg" className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
