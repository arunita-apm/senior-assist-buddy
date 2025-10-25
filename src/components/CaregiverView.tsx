import { useState } from "react";
import { Plus, Phone, Mail, Bell, User, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Caregiver = {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  notifications: {
    missedMedication: boolean;
    appointments: boolean;
    emergencies: boolean;
  };
};

const initialCaregivers: Caregiver[] = [
  {
    id: 1,
    name: "Jennifer Smith",
    relationship: "Daughter",
    phone: "(555) 123-4567",
    email: "jennifer.smith@email.com",
    isPrimary: true,
    notifications: {
      missedMedication: true,
      appointments: true,
      emergencies: true,
    },
  },
  {
    id: 2,
    name: "Robert Smith",
    relationship: "Son",
    phone: "(555) 234-5678",
    email: "robert.smith@email.com",
    isPrimary: false,
    notifications: {
      missedMedication: false,
      appointments: true,
      emergencies: true,
    },
  },
];

export const CaregiverView = () => {
  const [caregivers, setCaregivers] = useState<Caregiver[]>(initialCaregivers);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCg, setEditingCg] = useState<Caregiver | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      relationship: "",
      phone: "",
      email: "",
    });
  };

  const handleAdd = () => {
    const newCg: Caregiver = {
      id: Math.max(...caregivers.map(c => c.id), 0) + 1,
      ...formData,
      isPrimary: false,
      notifications: {
        missedMedication: true,
        appointments: true,
        emergencies: true,
      },
    };
    setCaregivers([...caregivers, newCg]);
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Caregiver added successfully" });
  };

  const handleEdit = () => {
    if (!editingCg) return;
    setCaregivers(caregivers.map(c => 
      c.id === editingCg.id 
        ? { ...c, ...formData }
        : c
    ));
    setEditingCg(null);
    resetForm();
    toast({ title: "Caregiver updated successfully" });
  };

  const handleDelete = () => {
    if (deletingId === null) return;
    setCaregivers(caregivers.filter(c => c.id !== deletingId));
    setDeletingId(null);
    toast({ title: "Caregiver removed successfully" });
  };

  const openEditDialog = (cg: Caregiver) => {
    setEditingCg(cg);
    setFormData({
      name: cg.name,
      relationship: cg.relationship,
      phone: cg.phone,
      email: cg.email,
    });
  };

  const toggleNotification = (id: number, type: keyof Caregiver["notifications"]) => {
    setCaregivers(caregivers.map(c =>
      c.id === id
        ? { ...c, notifications: { ...c.notifications, [type]: !c.notifications[type] } }
        : c
    ));
    toast({ title: "Notification settings updated" });
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Care Team</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" onClick={resetForm}>
              <Plus className="w-5 h-5" />
              Add Caregiver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Caregiver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input id="relationship" value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <Button onClick={handleAdd} className="w-full">Add Caregiver</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Settings Overview */}
      <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 text-warning flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Alert System Active</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Your caregivers will be notified if medications are missed or appointments are
                upcoming. Configure individual notification preferences below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caregivers List */}
      <div className="grid gap-6">
        {caregivers.map((caregiver) => (
          <Card key={caregiver.id} className="overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{caregiver.name}</CardTitle>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {caregiver.relationship}
                    </Badge>
                  </div>
                </div>
                {caregiver.isPrimary && (
                  <Badge className="bg-accent text-accent-foreground text-base px-4 py-2">
                    Primary Contact
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-lg">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <a href={`tel:${caregiver.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {caregiver.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <a href={`mailto:${caregiver.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {caregiver.email}
                  </a>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Settings
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-base">Missed Medications</p>
                      <p className="text-sm text-muted-foreground">
                        Alert when medication is not taken after 2 reminders
                      </p>
                    </div>
                    <Switch 
                      checked={caregiver.notifications.missedMedication} 
                      onCheckedChange={() => toggleNotification(caregiver.id, "missedMedication")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-base">Appointment Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Notify 24 hours before appointments
                      </p>
                    </div>
                    <Switch 
                      checked={caregiver.notifications.appointments} 
                      onCheckedChange={() => toggleNotification(caregiver.id, "appointments")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-base">Emergency Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Critical health notifications
                      </p>
                    </div>
                    <Switch 
                      checked={caregiver.notifications.emergencies} 
                      onCheckedChange={() => toggleNotification(caregiver.id, "emergencies")}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Dialog open={editingCg?.id === caregiver.id} onOpenChange={(open) => !open && setEditingCg(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => openEditDialog(caregiver)}>
                      Edit Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Caregiver</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-relationship">Relationship</Label>
                        <Input id="edit-relationship" value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input id="edit-phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input id="edit-email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <Button onClick={handleEdit} className="w-full">Update Caregiver</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {!caregiver.isPrimary && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeletingId(caregiver.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Caregiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this caregiver from your care team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
