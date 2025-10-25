import { useState } from "react";
import { Plus, Calendar, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    doctor: "",
    specialty: "",
    date: "",
    time: "",
    location: "",
    phone: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      doctor: "",
      specialty: "",
      date: "",
      time: "",
      location: "",
      phone: "",
      notes: "",
    });
  };

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
    setAppointments(appointments.map(a => 
      a.id === editingApt.id 
        ? { ...a, ...formData }
        : a
    ));
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
    setFormData({
      doctor: apt.doctor,
      specialty: apt.specialty,
      date: apt.date,
      time: apt.time,
      location: apt.location,
      phone: apt.phone,
      notes: apt.notes,
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Appointments</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" onClick={resetForm}>
              <Plus className="w-5 h-5" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="doctor">Doctor Name</Label>
                <Input id="doctor" value={formData.doctor} onChange={(e) => setFormData({...formData, doctor: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="specialty">Specialty</Label>
                <Input id="specialty" value={formData.specialty} onChange={(e) => setFormData({...formData, specialty: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
              <Button onClick={handleAdd} className="w-full">Schedule Appointment</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <Dialog open={editingApt?.id === apt.id} onOpenChange={(open) => !open && setEditingApt(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => openEditDialog(apt)}>
                      Reschedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reschedule Appointment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-doctor">Doctor Name</Label>
                        <Input id="edit-doctor" value={formData.doctor} onChange={(e) => setFormData({...formData, doctor: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-specialty">Specialty</Label>
                        <Input id="edit-specialty" value={formData.specialty} onChange={(e) => setFormData({...formData, specialty: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-date">Date</Label>
                          <Input id="edit-date" type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div>
                          <Label htmlFor="edit-time">Time</Label>
                          <Input id="edit-time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit-location">Location</Label>
                        <Input id="edit-location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input id="edit-phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-notes">Notes</Label>
                        <Textarea id="edit-notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                      </div>
                      <Button onClick={handleEdit} className="w-full">Update Appointment</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeletingId(apt.id)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
