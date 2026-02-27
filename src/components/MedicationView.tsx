import { useState } from "react";
import { Plus, Pill, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Medication = {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions: string;
};

const initialMedications: Medication[] = [
  {
    id: 1,
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    times: ["8:00 AM"],
    instructions: "Take with water, with or without food",
  },
  {
    id: 2,
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    times: ["8:00 AM", "8:00 PM"],
    instructions: "Take with meals to reduce stomach upset",
  },
  {
    id: 3,
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    times: ["8:00 PM"],
    instructions: "Take at bedtime",
  },
];

export const MedicationView = () => {
  const [medications, setMedications] = useState<Medication[]>(initialMedications);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    times: "",
    instructions: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      dosage: "",
      frequency: "",
      times: "",
      instructions: "",
    });
  };

  const handleAdd = () => {
    const newMed: Medication = {
      id: Math.max(...medications.map(m => m.id), 0) + 1,
      name: formData.name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      times: formData.times.split(",").map(t => t.trim()),
      instructions: formData.instructions,
    };
    setMedications([...medications, newMed]);
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Medication added successfully" });
  };

  const handleEdit = () => {
    if (!editingMed) return;
    setMedications(medications.map(m => 
      m.id === editingMed.id 
        ? {
            ...m,
            name: formData.name,
            dosage: formData.dosage,
            frequency: formData.frequency,
            times: formData.times.split(",").map(t => t.trim()),
            instructions: formData.instructions,
          }
        : m
    ));
    setEditingMed(null);
    resetForm();
    toast({ title: "Medication updated successfully" });
  };

  const handleDelete = () => {
    if (deletingId === null) return;
    setMedications(medications.filter(m => m.id !== deletingId));
    setDeletingId(null);
    toast({ title: "Medication removed successfully" });
  };

  const openEditDialog = (med: Medication) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times.join(", "),
      instructions: med.instructions,
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Medications</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" onClick={resetForm}>
              <Plus className="w-5 h-5" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Medication Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input id="dosage" value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Input id="frequency" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="times">Times (comma separated)</Label>
                <Input id="times" placeholder="8:00 AM, 8:00 PM" value={formData.times} onChange={(e) => setFormData({...formData, times: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" value={formData.instructions} onChange={(e) => setFormData({...formData, instructions: e.target.value})} />
              </div>
              <Button onClick={handleAdd} className="w-full">Add Medication</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {medications.map((med) => (
          <Card key={med.id} className="overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="bg-white border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{med.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {med.dosage}
                      </Badge>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {med.frequency}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Schedule
                </h4>
                <div className="flex flex-wrap gap-2">
                  {med.times.map((time, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-lg"
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Instructions</h4>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {med.instructions}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Dialog open={editingMed?.id === med.id} onOpenChange={(open) => !open && setEditingMed(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="flex-1" onClick={() => openEditDialog(med)}>
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Medication</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Medication Name</Label>
                        <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-dosage">Dosage</Label>
                        <Input id="edit-dosage" value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-frequency">Frequency</Label>
                        <Input id="edit-frequency" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-times">Times (comma separated)</Label>
                        <Input id="edit-times" placeholder="8:00 AM, 8:00 PM" value={formData.times} onChange={(e) => setFormData({...formData, times: e.target.value})} />
                      </div>
                      <div>
                        <Label htmlFor="edit-instructions">Instructions</Label>
                        <Textarea id="edit-instructions" value={formData.instructions} onChange={(e) => setFormData({...formData, instructions: e.target.value})} />
                      </div>
                      <Button onClick={handleEdit} className="w-full">Update Medication</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeletingId(med.id)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Medication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this medication? This action cannot be undone.
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
