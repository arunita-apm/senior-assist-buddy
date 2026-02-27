import { useState, useMemo } from "react";
import { Plus, Calendar, MapPin, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isAfter } from "date-fns";

type Appointment = {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  phone: string;
  notes: string;
  status: string;
};

const initialAppointments: Appointment[] = [
  {
    id: 1,
    doctor: "Dr. Sarah Johnson",
    specialty: "Cardiology",
    date: "2026-03-01",
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
    date: "2026-03-03",
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
    date: "2026-03-10",
    time: "2:30 PM",
    location: "Vision Care Center",
    phone: "(555) 345-6789",
    notes: "Eye examination and prescription update",
    status: "scheduled",
  },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const AppointmentView = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    doctor: "", specialty: "", date: "", time: "", location: "", phone: "", notes: "",
  });

  const resetForm = () => setFormData({ doctor: "", specialty: "", date: "", time: "", location: "", phone: "", notes: "" });

  const handleAdd = () => {
    const newApt: Appointment = {
      id: Math.max(...appointments.map(a => a.id), 0) + 1,
      ...formData,
      status: "scheduled",
    };
    setAppointments([...appointments, newApt]);
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Appointment scheduled successfully" });
  };

  const handleEdit = () => {
    if (!editingApt) return;
    setAppointments(appointments.map(a => a.id === editingApt.id ? { ...a, ...formData } : a));
    setEditingApt(null);
    resetForm();
    toast({ title: "Appointment updated successfully" });
  };

  const handleDelete = () => {
    if (deletingId === null) return;
    setAppointments(appointments.filter(a => a.id !== deletingId));
    setDeletingId(null);
    toast({ title: "Appointment cancelled successfully" });
  };

  const openEditDialog = (apt: Appointment) => {
    setEditingApt(apt);
    setFormData({ doctor: apt.doctor, specialty: apt.specialty, date: apt.date, time: apt.time, location: apt.location, phone: apt.phone, notes: apt.notes });
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
    appointments.forEach(a => set.add(a.date));
    return set;
  }, [appointments]);

  const today = new Date();

  const displayedAppointments = useMemo(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      return appointments.filter(a => a.date === dateStr);
    }
    return appointments.filter(a => isAfter(new Date(a.date), addDays(today, -1))).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedDate, appointments]);

  const AppointmentCard = ({ apt }: { apt: Appointment }) => (
    <Card key={apt.id} className="bg-card rounded-xl shadow-sm border border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg">{apt.doctor}</p>
            <Badge variant="secondary" className="text-sm mt-1">{apt.specialty}</Badge>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-foreground text-sm">{format(new Date(apt.date), "MMM d")}</p>
            <p className="text-muted-foreground text-sm">{apt.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>{apt.location}</span>
        </div>
        {apt.notes && (
          <p className="text-sm text-muted-foreground">{apt.notes}</p>
        )}
        <div className="flex gap-2 pt-1">
          <Dialog open={editingApt?.id === apt.id} onOpenChange={(open) => !open && setEditingApt(null)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(apt)}>Reschedule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
              <AppointmentForm data={formData} setData={setFormData} onSubmit={handleEdit} submitLabel="Update Appointment" />
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeletingId(apt.id)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );

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

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
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

      {/* Appointments for selected date / upcoming */}
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
            {displayedAppointments.map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
          </div>
        )}
      </div>

      {/* Add button at bottom */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12" onClick={resetForm}>
            <Plus className="w-5 h-5" />
            Schedule Appointment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule New Appointment</DialogTitle></DialogHeader>
          <AppointmentForm data={formData} setData={setFormData} onSubmit={handleAdd} submitLabel="Schedule Appointment" />
        </DialogContent>
      </Dialog>

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

// Extracted form component
const AppointmentForm = ({ data, setData, onSubmit, submitLabel }: {
  data: { doctor: string; specialty: string; date: string; time: string; location: string; phone: string; notes: string };
  setData: (d: typeof data) => void;
  onSubmit: () => void;
  submitLabel: string;
}) => (
  <div className="space-y-4">
    <div><Label>Doctor Name</Label><Input value={data.doctor} onChange={e => setData({ ...data, doctor: e.target.value })} /></div>
    <div><Label>Specialty</Label><Input value={data.specialty} onChange={e => setData({ ...data, specialty: e.target.value })} /></div>
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Date</Label><Input type="date" value={data.date} onChange={e => setData({ ...data, date: e.target.value })} /></div>
      <div><Label>Time</Label><Input value={data.time} onChange={e => setData({ ...data, time: e.target.value })} /></div>
    </div>
    <div><Label>Location</Label><Input value={data.location} onChange={e => setData({ ...data, location: e.target.value })} /></div>
    <div><Label>Phone</Label><Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
    <div><Label>Notes</Label><Textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} /></div>
    <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
  </div>
);
