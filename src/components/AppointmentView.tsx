import { useState, useMemo } from "react";
import { Plus, Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import type { Appointment } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const AppointmentView = () => {
  const { appointments, addAppointment, deleteAppointment, userRole } = useAppContext();
  const isCaregiver = userRole === "caregiver";
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    title: "", doctor: "", specialty: "", date: "", time: "", location: "", notes: "",
  });

  const resetForm = () => setFormData({ title: "", doctor: "", specialty: "", date: "", time: "", location: "", notes: "" });

  const handleAdd = () => {
    if (!formData.doctor.trim() || !formData.date || !formData.time) {
      toast({ title: "Please fill in doctor, date, and time", variant: "destructive" });
      return;
    }
    const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
    const apt: Appointment = {
      id: crypto.randomUUID(),
      title: formData.title.trim() || `${formData.specialty || "Appointment"} with ${formData.doctor}`,
      doctorName: formData.doctor.trim(),
      dateTime,
      location: formData.location.trim(),
      notes: formData.notes.trim(),
      reminderMinutesBefore: 60,
    };
    addAppointment(apt);
    setIsAddOpen(false);
    resetForm();
    toast({ description: "Appointment scheduled ✓", duration: 3000, className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]" });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteAppointment(deletingId);
    setDeletingId(null);
    toast({ description: "Appointment cancelled", duration: 3000 });
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const appointmentDates = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => set.add(format(new Date(a.dateTime), "yyyy-MM-dd")));
    return set;
  }, [appointments]);

  const today = new Date();

  const displayedAppointments = useMemo(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      return appointments.filter((a) => format(new Date(a.dateTime), "yyyy-MM-dd") === dateStr);
    }
    return appointments;
  }, [selectedDate, appointments]);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="bg-card shadow-sm border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-lg font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dateStr = format(day, "yyyy-MM-dd");
              const hasAppointment = appointmentDates.has(dateStr);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`relative flex flex-col items-center justify-center py-2 rounded-full transition-colors
                    ${!isCurrentMonth ? "opacity-30" : ""}
                    ${isToday && !isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                    ${isSelected ? "ring-2 ring-primary text-primary font-bold" : ""}
                    ${!isToday && !isSelected && isCurrentMonth ? "text-foreground hover:bg-muted" : ""}
                  `}
                >
                  <span className="text-sm">{format(day, "d")}</span>
                  {hasAppointment && isCurrentMonth && (
                    <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Appointments list */}
      <div>
        <h3 className="font-bold text-foreground text-lg mb-3">
          {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Upcoming"}
        </h3>
        {displayedAppointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No appointments {selectedDate ? "on this date" : "upcoming"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAppointments.map((apt) => {
              const dt = new Date(apt.dateTime);
              return (
                <Card key={apt.id} className="bg-card rounded-xl shadow-sm border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-lg">{apt.doctorName || apt.title}</p>
                        {apt.title !== apt.doctorName && (
                          <Badge variant="secondary" className="text-sm mt-1">{apt.title}</Badge>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-foreground text-sm">{format(dt, "MMM d")}</p>
                        <p className="text-muted-foreground text-sm">{format(dt, "h:mm a")}</p>
                      </div>
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{apt.location}</span>
                      </div>
                    )}
                    {apt.notes && (
                      <p className="text-sm text-muted-foreground">{apt.notes}</p>
                    )}
                    {!isCaregiver && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeletingId(apt.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add button — hidden for caregivers */}
      {!isCaregiver && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12" onClick={resetForm}>
              <Plus className="w-5 h-5" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Schedule New Appointment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Doctor Name *</Label><Input value={formData.doctor} onChange={(e) => setFormData({ ...formData, doctor: e.target.value })} /></div>
              <div><Label>Specialty</Label><Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                <div><Label>Time *</Label><Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
              </div>
              <div><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
              <Button onClick={handleAdd} className="w-full">Schedule Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this appointment? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Appointment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
